from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case
from pydantic import BaseModel
from typing import Optional
import math
import uuid

from app.db.session import get_session
from app.db.models import User, Project, Calculation
from app.api.deps import get_current_user
from app.engine.schemas import CalculatorInput
from app.engine.calculator import calculate

router = APIRouter()


class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    location: Optional[str] = None


class ProjectOut(BaseModel):
    id: str
    name: str
    description: Optional[str]
    location: Optional[str]
    created_at: str
    calculation_count: int = 0


class CalculationCreate(BaseModel):
    name: Optional[str] = None
    input_data: CalculatorInput


class CalculationOut(BaseModel):
    id: str
    name: Optional[str]
    sistema: str
    tension_v: float
    potencia_kw: float
    seccion_mm2: float
    cumple_ric: bool
    created_at: str


class CircuitoResumen(BaseModel):
    nombre: Optional[str]
    sistema: str
    tension_v: float
    potencia_kw: float
    demanda_kw: float       # potencia_kw × factor_demanda
    potencia_kva: float
    i_diseno_a: float
    seccion_mm2: float
    cumple_ric: bool


class DemandaSummaryOut(BaseModel):
    proyecto_id: str
    proyecto_nombre: str
    total_circuitos: int
    circuitos_cumplen: int
    tasa_cumplimiento_pct: float
    # Potencias
    potencia_instalada_kw: float
    demanda_maxima_kw: float
    demanda_maxima_kva: float
    factor_potencia_promedio: float
    # Empalme
    corriente_empalme_a: float
    tension_empalme_v: float
    sistema_predominante: str
    # Secciones
    seccion_max_mm2: float
    seccion_promedio_mm2: float
    # Circuitos
    circuitos: list[CircuitoResumen]


# ── Proyectos CRUD ────────────────────────────────────────────────────────────

@router.get("", response_model=list[ProjectOut])
async def list_projects(
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Project).where(Project.owner_id == current_user.id).order_by(Project.created_at.desc())
    )
    projects = result.scalars().all()
    out = []
    for p in projects:
        calc_res = await db.execute(select(Calculation).where(Calculation.project_id == p.id))
        count = len(calc_res.scalars().all())
        out.append(ProjectOut(
            id=str(p.id), name=p.name, description=p.description,
            location=p.location, created_at=p.created_at.isoformat(), calculation_count=count,
        ))
    return out


@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
async def create_project(
    body: ProjectCreate,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    project = Project(owner_id=current_user.id, **body.model_dump())
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return ProjectOut(
        id=str(project.id), name=project.name, description=project.description,
        location=project.location, created_at=project.created_at.isoformat(),
    )


@router.get("/{project_id}", response_model=ProjectOut)
async def get_project(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.owner_id == current_user.id)
    )
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    return ProjectOut(
        id=str(p.id), name=p.name, description=p.description,
        location=p.location, created_at=p.created_at.isoformat(),
    )


@router.put("/{project_id}", response_model=ProjectOut)
async def update_project(
    project_id: uuid.UUID,
    body: ProjectCreate,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.owner_id == current_user.id)
    )
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(p, k, v)
    await db.commit()
    await db.refresh(p)
    return ProjectOut(
        id=str(p.id), name=p.name, description=p.description,
        location=p.location, created_at=p.created_at.isoformat(),
    )


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.owner_id == current_user.id)
    )
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    await db.delete(p)
    await db.commit()


# ── Demanda máxima del proyecto ───────────────────────────────────────────────

@router.get("/{project_id}/demand-summary", response_model=DemandaSummaryOut)
async def get_demand_summary(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Calcula la demanda máxima del proyecto a partir de todos sus circuitos guardados.
    Útil para dimensionar el empalme y solicitar potencia a la distribuidora.
    """
    p_res = await db.execute(
        select(Project).where(Project.id == project_id, Project.owner_id == current_user.id)
    )
    proyecto = p_res.scalar_one_or_none()
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    calcs_res = await db.execute(
        select(Calculation).where(Calculation.project_id == project_id).order_by(Calculation.created_at)
    )
    calcs = calcs_res.scalars().all()

    if not calcs:
        return DemandaSummaryOut(
            proyecto_id=str(project_id), proyecto_nombre=proyecto.name,
            total_circuitos=0, circuitos_cumplen=0, tasa_cumplimiento_pct=0.0,
            potencia_instalada_kw=0.0, demanda_maxima_kw=0.0, demanda_maxima_kva=0.0,
            factor_potencia_promedio=0.0, corriente_empalme_a=0.0,
            tension_empalme_v=0.0, sistema_predominante="monofasico",
            seccion_max_mm2=0.0, seccion_promedio_mm2=0.0, circuitos=[],
        )

    circuitos_out: list[CircuitoResumen] = []
    potencia_instalada = 0.0
    demanda_total = 0.0
    sum_fp = 0.0
    sum_kva = 0.0
    cumplen = 0
    sistemas: dict[str, int] = {}

    for c in calcs:
        inp = c.input_data or {}
        res = c.result_data or {}
        fp = float(inp.get("factor_potencia", 0.85))
        fd = float(inp.get("factor_demanda", 1.0))
        potencia = float(c.potencia_kw)
        demanda = potencia * fd
        kva = demanda / fp if fp > 0 else demanda
        i_diseno = float(res.get("i_diseno_a", 0.0))

        potencia_instalada += potencia
        demanda_total += demanda
        sum_kva += kva
        sum_fp += fp
        if c.cumple_ric:
            cumplen += 1

        sistema = c.sistema or "monofasico"
        sistemas[sistema] = sistemas.get(sistema, 0) + 1

        circuitos_out.append(CircuitoResumen(
            nombre=c.name,
            sistema=sistema,
            tension_v=c.tension_v,
            potencia_kw=potencia,
            demanda_kw=round(demanda, 3),
            potencia_kva=round(kva, 3),
            i_diseno_a=round(i_diseno, 3),
            seccion_mm2=c.seccion_mm2,
            cumple_ric=c.cumple_ric,
        ))

    total = len(calcs)
    fp_prom = sum_fp / total if total > 0 else 0.85
    sistema_pred = max(sistemas, key=lambda k: sistemas[k]) if sistemas else "monofasico"

    # Tensión y corriente de empalme: usar la tensión más frecuente
    tensiones = [float(c.tension_v) for c in calcs]
    tension_empalme = max(set(tensiones), key=lambda t: tensiones.count(t))

    if sistema_pred == "trifasico":
        i_empalme = sum_kva * 1000 / (math.sqrt(3) * tension_empalme) if tension_empalme > 0 else 0.0
    elif sistema_pred == "bifasico":
        i_empalme = sum_kva * 1000 / (2 * tension_empalme) if tension_empalme > 0 else 0.0
    else:
        i_empalme = sum_kva * 1000 / tension_empalme if tension_empalme > 0 else 0.0

    secciones = [c.seccion_mm2 for c in calcs]

    return DemandaSummaryOut(
        proyecto_id=str(project_id),
        proyecto_nombre=proyecto.name,
        total_circuitos=total,
        circuitos_cumplen=cumplen,
        tasa_cumplimiento_pct=round(cumplen / total * 100, 1) if total > 0 else 0.0,
        potencia_instalada_kw=round(potencia_instalada, 3),
        demanda_maxima_kw=round(demanda_total, 3),
        demanda_maxima_kva=round(sum_kva, 3),
        factor_potencia_promedio=round(fp_prom, 3),
        corriente_empalme_a=round(i_empalme, 2),
        tension_empalme_v=tension_empalme,
        sistema_predominante=sistema_pred,
        seccion_max_mm2=max(secciones),
        seccion_promedio_mm2=round(sum(secciones) / len(secciones), 2),
        circuitos=circuitos_out,
    )


# ── Cálculos dentro de un proyecto ────────────────────────────────────────────

@router.get("/{project_id}/calculations", response_model=list[CalculationOut])
async def list_calculations(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    p_res = await db.execute(
        select(Project).where(Project.id == project_id, Project.owner_id == current_user.id)
    )
    if not p_res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    result = await db.execute(
        select(Calculation).where(Calculation.project_id == project_id).order_by(Calculation.created_at.desc())
    )
    calcs = result.scalars().all()
    return [
        CalculationOut(
            id=str(c.id), name=c.name, sistema=c.sistema,
            tension_v=c.tension_v, potencia_kw=c.potencia_kw,
            seccion_mm2=c.seccion_mm2, cumple_ric=c.cumple_ric,
            created_at=c.created_at.isoformat(),
        )
        for c in calcs
    ]


@router.post("/{project_id}/calculations", response_model=CalculationOut, status_code=status.HTTP_201_CREATED)
async def create_calculation(
    project_id: uuid.UUID,
    body: CalculationCreate,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    p_res = await db.execute(
        select(Project).where(Project.id == project_id, Project.owner_id == current_user.id)
    )
    if not p_res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    try:
        calc_result = calculate(body.input_data)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    calc = Calculation(
        project_id=project_id,
        name=body.name,
        input_data=body.input_data.model_dump(),
        result_data=calc_result.resultado.model_dump(),
        sistema=body.input_data.sistema,
        tension_v=body.input_data.tension_v,
        potencia_kw=body.input_data.potencia_kw,
        seccion_mm2=calc_result.resultado.seccion_mm2,
        cumple_ric=calc_result.resultado.cumple,
    )
    db.add(calc)
    await db.commit()
    await db.refresh(calc)

    return CalculationOut(
        id=str(calc.id), name=calc.name, sistema=calc.sistema,
        tension_v=calc.tension_v, potencia_kw=calc.potencia_kw,
        seccion_mm2=calc.seccion_mm2, cumple_ric=calc.cumple_ric,
        created_at=calc.created_at.isoformat(),
    )
