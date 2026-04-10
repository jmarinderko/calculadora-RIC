from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.api.deps import get_current_user
from app.db.models import User, Project, Calculation
from app.db.session import get_session
from app.engine.calculator import calculate
from app.engine.schemas import CalculatorInput
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid

router = APIRouter()

# ── Plantillas predefinidas (hardcoded) ──────────────────────────────────────

PLANTILLAS: dict[str, dict] = {
    "vivienda_unifamiliar": {
        "nombre": "Vivienda Unifamiliar",
        "descripcion": "Instalación residencial típica: iluminación, tomacorrientes y cocina",
        "circuitos": [
            {"nombre": "C1 - Iluminación dormitorios", "tipo_circuito": "alumbrado", "potencia_kw": 0.5, "tension_v": 220, "sistema": "monofasico", "longitud_m": 15, "material": "cu"},
            {"nombre": "C2 - Iluminación living/comedor", "tipo_circuito": "alumbrado", "potencia_kw": 0.4, "tension_v": 220, "sistema": "monofasico", "longitud_m": 12, "material": "cu"},
            {"nombre": "C3 - Tomacorrientes dormitorios", "tipo_circuito": "tomacorrientes", "potencia_kw": 1.5, "tension_v": 220, "sistema": "monofasico", "longitud_m": 20, "material": "cu"},
            {"nombre": "C4 - Tomacorrientes living", "tipo_circuito": "tomacorrientes", "potencia_kw": 1.5, "tension_v": 220, "sistema": "monofasico", "longitud_m": 18, "material": "cu"},
            {"nombre": "C5 - Cocina/Horno", "tipo_circuito": "fuerza", "potencia_kw": 3.5, "tension_v": 220, "sistema": "monofasico", "longitud_m": 10, "material": "cu"},
            {"nombre": "C6 - Lavadora/Lavavajillas", "tipo_circuito": "fuerza", "potencia_kw": 2.0, "tension_v": 220, "sistema": "monofasico", "longitud_m": 12, "material": "cu"},
        ],
    },
    "oficina_pequena": {
        "nombre": "Oficina Pequeña",
        "descripcion": "Oficina hasta 50m²: iluminación eficiente y tomacorrientes de datos",
        "circuitos": [
            {"nombre": "C1 - Iluminación general", "tipo_circuito": "alumbrado", "potencia_kw": 0.6, "tension_v": 220, "sistema": "monofasico", "longitud_m": 20, "material": "cu"},
            {"nombre": "C2 - Tomacorrientes puestos de trabajo", "tipo_circuito": "tomacorrientes", "potencia_kw": 2.0, "tension_v": 220, "sistema": "monofasico", "longitud_m": 25, "material": "cu"},
            {"nombre": "C3 - Aire acondicionado", "tipo_circuito": "fuerza", "potencia_kw": 3.5, "tension_v": 220, "sistema": "monofasico", "longitud_m": 15, "material": "cu"},
            {"nombre": "C4 - Servidor/UPS", "tipo_circuito": "tomacorrientes", "potencia_kw": 1.0, "tension_v": 220, "sistema": "monofasico", "longitud_m": 10, "material": "cu"},
        ],
    },
    "local_comercial": {
        "nombre": "Local Comercial",
        "descripcion": "Local hasta 100m²: iluminación comercial, fuerza y climatización",
        "circuitos": [
            {"nombre": "C1 - Iluminación comercial", "tipo_circuito": "alumbrado", "potencia_kw": 2.0, "tension_v": 220, "sistema": "monofasico", "longitud_m": 25, "material": "cu"},
            {"nombre": "C2 - Tomacorrientes generales", "tipo_circuito": "tomacorrientes", "potencia_kw": 2.5, "tension_v": 220, "sistema": "monofasico", "longitud_m": 30, "material": "cu"},
            {"nombre": "C3 - Climatización", "tipo_circuito": "fuerza", "potencia_kw": 5.0, "tension_v": 220, "sistema": "monofasico", "longitud_m": 20, "material": "cu"},
            {"nombre": "C4 - Caja/POS", "tipo_circuito": "tomacorrientes", "potencia_kw": 0.5, "tension_v": 220, "sistema": "monofasico", "longitud_m": 15, "material": "cu"},
        ],
    },
    "taller_industrial_bt": {
        "nombre": "Taller Industrial BT",
        "descripcion": "Pequeño taller con equipos trifásicos y alumbrado industrial",
        "circuitos": [
            {"nombre": "C1 - Iluminación industrial", "tipo_circuito": "alumbrado", "potencia_kw": 3.0, "tension_v": 380, "sistema": "trifasico", "longitud_m": 30, "material": "cu"},
            {"nombre": "C2 - Motor principal", "tipo_circuito": "motor", "potencia_kw": 15.0, "tension_v": 380, "sistema": "trifasico", "longitud_m": 25, "material": "cu"},
            {"nombre": "C3 - Herramientas monofásicas", "tipo_circuito": "tomacorrientes", "potencia_kw": 3.0, "tension_v": 220, "sistema": "monofasico", "longitud_m": 20, "material": "cu"},
            {"nombre": "C4 - Compresor", "tipo_circuito": "motor", "potencia_kw": 7.5, "tension_v": 380, "sistema": "trifasico", "longitud_m": 15, "material": "cu"},
        ],
    },
}

# Defaults para campos no especificados en plantillas
_DEFAULTS = {
    "factor_potencia": 0.85,
    "factor_demanda": 1.0,
    "tipo_canalizacion": "ducto_pvc",
    "temp_ambiente_c": 25,
    "circuitos_agrupados": 1,
    "msnm": 0,
    "montaje": "vista",
    "cables_por_fase": 0,
}

_MOTOR_DEFAULTS = {
    **_DEFAULTS,
    "factor_potencia": 0.80,
    "factor_demanda": 1.0,
}


def _build_calculator_input(circuito: dict) -> CalculatorInput:
    """Construye un CalculatorInput desde los datos de un circuito de plantilla."""
    defaults = _MOTOR_DEFAULTS if circuito.get("tipo_circuito") == "motor" else _DEFAULTS
    data = {**defaults, **circuito}
    # Eliminar la clave 'nombre' que no pertenece a CalculatorInput
    data.pop("nombre", None)
    return CalculatorInput(**data)


# ── Schemas de respuesta ──────────────────────────────────────────────────────

class TemplateOut(BaseModel):
    id: str
    nombre: str
    descripcion: str
    num_circuitos: int


class CircuitoTemplateOut(BaseModel):
    nombre: str
    tipo_circuito: str
    potencia_kw: float
    tension_v: float
    sistema: str
    longitud_m: float
    material: str


class TemplateDetailOut(BaseModel):
    id: str
    nombre: str
    descripcion: str
    num_circuitos: int
    circuitos: list[CircuitoTemplateOut]


class ApplyTemplateRequest(BaseModel):
    project_id: str
    template_id: str


class CalculationOut(BaseModel):
    id: str
    name: Optional[str]
    sistema: str
    tension_v: float
    potencia_kw: float
    seccion_mm2: float
    cumple_ric: bool
    created_at: str


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("", response_model=list[TemplateOut])
async def list_templates(current_user: User = Depends(get_current_user)):
    """Lista todas las plantillas disponibles."""
    return [
        TemplateOut(
            id=key,
            nombre=tpl["nombre"],
            descripcion=tpl["descripcion"],
            num_circuitos=len(tpl["circuitos"]),
        )
        for key, tpl in PLANTILLAS.items()
    ]


@router.get("/{template_id}", response_model=TemplateDetailOut)
async def get_template(
    template_id: str,
    current_user: User = Depends(get_current_user),
):
    """Retorna el detalle de una plantilla con sus circuitos."""
    tpl = PLANTILLAS.get(template_id)
    if not tpl:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")
    return TemplateDetailOut(
        id=template_id,
        nombre=tpl["nombre"],
        descripcion=tpl["descripcion"],
        num_circuitos=len(tpl["circuitos"]),
        circuitos=[CircuitoTemplateOut(**c) for c in tpl["circuitos"]],
    )


@router.post("/apply", status_code=201, response_model=list[CalculationOut])
async def apply_template(
    body: ApplyTemplateRequest,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Aplica una plantilla a un proyecto existente: crea los circuitos calculados."""
    # 1. Validar plantilla
    tpl = PLANTILLAS.get(body.template_id)
    if not tpl:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")

    # 2. Verificar que el proyecto existe y pertenece al usuario
    try:
        project_uuid = uuid.UUID(body.project_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    result = await db.execute(
        select(Project).where(
            Project.id == project_uuid,
            Project.owner_id == current_user.id,
        )
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    # 3. Calcular y crear cada circuito
    created: list[CalculationOut] = []
    for circuito in tpl["circuitos"]:
        calc_input = _build_calculator_input(circuito)
        try:
            calc_result = calculate(calc_input)
        except ValueError as e:
            raise HTTPException(status_code=422, detail=f"Error calculando '{circuito['nombre']}': {e}")

        calc = Calculation(
            project_id=project_uuid,
            name=circuito["nombre"],
            input_data=calc_input.model_dump(),
            result_data=calc_result.resultado.model_dump(),
            sistema=calc_input.sistema,
            tension_v=calc_input.tension_v,
            potencia_kw=calc_input.potencia_kw,
            seccion_mm2=calc_result.resultado.seccion_mm2,
            cumple_ric=calc_result.resultado.cumple,
        )
        db.add(calc)
        await db.flush()  # genera el ID sin hacer commit todavía
        created.append(CalculationOut(
            id=str(calc.id),
            name=calc.name,
            sistema=calc.sistema,
            tension_v=calc.tension_v,
            potencia_kw=calc.potencia_kw,
            seccion_mm2=calc.seccion_mm2,
            cumple_ric=calc.cumple_ric,
            created_at=calc.created_at.isoformat(),
        ))

    await db.commit()
    return created
