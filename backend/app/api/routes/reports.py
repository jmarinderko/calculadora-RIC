"""
Módulo de generación de reportes PDF — Memoria de Cálculo SEC.
Endpoints:
  POST /reports/{calculation_id}/generate   → genera el PDF y guarda el Report
  GET  /reports/{report_id}/download        → retorna el PDF binario
"""
import logging
from datetime import datetime, timezone
from typing import Optional
import uuid
import httpx

logger = logging.getLogger(__name__)

from fastapi import APIRouter, Depends, HTTPException, status, Response
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import settings
from app.db.session import get_session
from app.db.models import User, Calculation, Project, Report
from app.api.deps import get_current_user
from app.core.security import sanitize_filename
from .report_template import render_html
from .sec_memory_template import render_sec_memory

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class ReportOut(BaseModel):
    id: str
    calculation_id: str
    created_at: str


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _get_calculation_for_user(
    calculation_id: uuid.UUID,
    current_user: User,
    db: AsyncSession,
) -> Calculation:
    """Recupera el Calculation verificando que pertenezca al usuario."""
    result = await db.execute(
        select(Calculation)
        .join(Project, Calculation.project_id == Project.id)
        .where(
            Calculation.id == calculation_id,
            Project.owner_id == current_user.id,
        )
    )
    calc = result.scalar_one_or_none()
    if not calc:
        raise HTTPException(status_code=404, detail="Cálculo no encontrado")
    return calc


async def _call_pdf_service(html: str, filename: str) -> bytes:
    """Llama al microservicio PDF y retorna el binario."""
    url = f"{settings.pdf_service_url}/generate"
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(url, json={"html": html, "filename": filename})
            resp.raise_for_status()
            return resp.content
    except httpx.ConnectError as exc:
        # Log detalle internamente pero no exponerlo al cliente
        logger.error("pdf-service unreachable at %s: %s", url, exc)
        raise HTTPException(
            status_code=503,
            detail="Servicio de generación de PDF no disponible temporalmente.",
        )
    except httpx.HTTPStatusError as exc:
        logger.error(
            "pdf-service returned %s: %s",
            exc.response.status_code,
            exc.response.text[:500],
        )
        raise HTTPException(
            status_code=502,
            detail="Error generando el PDF. Intente nuevamente.",
        )


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post(
    "/{calculation_id}/generate",
    response_model=ReportOut,
    status_code=status.HTTP_201_CREATED,
    summary="Genera la memoria de cálculo PDF en formato SEC",
)
async def generate_report(
    calculation_id: uuid.UUID,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Genera el PDF de memoria de cálculo SEC para el cálculo indicado.
    Llama internamente al microservicio Puppeteer (pdf-service:9000).
    Guarda el registro en la tabla reports y retorna el ID del reporte.
    """
    calc = await _get_calculation_for_user(calculation_id, current_user, db)

    # Obtener datos del proyecto para el encabezado
    proj_result = await db.execute(select(Project).where(Project.id == calc.project_id))
    project: Optional[Project] = proj_result.scalar_one_or_none()

    # Construir el HTML
    html = render_html(
        input_data=calc.input_data,
        result_data=calc.result_data,
        calc_name=calc.name or "Sin nombre",
        project_name=project.name if project else "",
        project_location=project.location if project else "",
        user_name=current_user.full_name or current_user.email,
        calc_date=calc.created_at.strftime("%d/%m/%Y %H:%M"),
    )

    filename = f"memoria_calculo_RIC_{str(calculation_id)[:8]}.pdf"
    await _call_pdf_service(html, filename)  # valida que el servicio responde

    # Guardar registro en DB (sin almacenar PDF binario — se regenera en descarga)
    report = Report(
        calculation_id=calculation_id,
        pdf_url=f"/api/reports/{None}/download",  # se actualiza abajo
    )
    db.add(report)
    await db.flush()  # para obtener el ID asignado

    report.pdf_url = f"/api/reports/{report.id}/download"
    await db.commit()
    await db.refresh(report)

    return ReportOut(
        id=str(report.id),
        calculation_id=str(report.calculation_id),
        created_at=report.created_at.isoformat(),
    )


@router.get(
    "/{report_id}/download",
    summary="Descarga el PDF de memoria de cálculo SEC",
    response_class=Response,
)
async def download_report(
    report_id: uuid.UUID,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Regenera y descarga el PDF para el reporte indicado.
    El PDF se genera on-the-fly desde los datos guardados en DB.
    """
    # Recuperar report
    rep_result = await db.execute(select(Report).where(Report.id == report_id))
    report: Optional[Report] = rep_result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")

    # Verificar que el cálculo pertenece al usuario
    calc = await _get_calculation_for_user(report.calculation_id, current_user, db)

    proj_result = await db.execute(select(Project).where(Project.id == calc.project_id))
    project: Optional[Project] = proj_result.scalar_one_or_none()

    html = render_html(
        input_data=calc.input_data,
        result_data=calc.result_data,
        calc_name=calc.name or "Sin nombre",
        project_name=project.name if project else "",
        project_location=project.location if project else "",
        user_name=current_user.full_name or current_user.email,
        calc_date=calc.created_at.strftime("%d/%m/%Y %H:%M"),
    )

    filename = f"memoria_calculo_RIC_{str(report.id)[:8]}.pdf"
    pdf_bytes = await _call_pdf_service(html, filename)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Length": str(len(pdf_bytes)),
        },
    )


# ── Memoria Técnica SEC — nivel proyecto ─────────────────────────────────────

class SecMemoryRequest(BaseModel):
    numero_memoria: Optional[str] = "001"


@router.post(
    "/project/{project_id}/sec-memory",
    summary="Genera la Memoria Técnica SEC completa del proyecto",
    response_class=Response,
)
async def generate_sec_memory(
    project_id: uuid.UUID,
    body: SecMemoryRequest = SecMemoryRequest(),
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Genera el PDF de Memoria Técnica SEC para el proyecto completo.
    Incluye cuadro de cargas, demanda máxima, y cálculo detallado
    de cada circuito con protecciones recomendadas.
    """
    # Verificar propiedad del proyecto
    proj_res = await db.execute(
        select(Project).where(Project.id == project_id, Project.owner_id == current_user.id)
    )
    project: Optional[Project] = proj_res.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    # Cargar todos los cálculos del proyecto
    calcs_res = await db.execute(
        select(Calculation)
        .where(Calculation.project_id == project_id)
        .order_by(Calculation.created_at)
    )
    calcs = calcs_res.scalars().all()
    if not calcs:
        raise HTTPException(status_code=422, detail="El proyecto no tiene cálculos guardados.")

    # Calcular demanda (inline, sin llamada HTTP)
    import math as _math
    potencia_instalada = sum(float(c.potencia_kw) for c in calcs)
    demanda_total = sum(
        float(c.potencia_kw) * float((c.input_data or {}).get("factor_demanda", 1.0))
        for c in calcs
    )
    fp_prom = sum(float((c.input_data or {}).get("factor_potencia", 0.85)) for c in calcs) / len(calcs)
    kva_total = demanda_total / fp_prom if fp_prom > 0 else demanda_total
    sistemas: dict[str, int] = {}
    for c in calcs:
        s = c.sistema or "monofasico"
        sistemas[s] = sistemas.get(s, 0) + 1
    sistema_pred = max(sistemas, key=lambda k: sistemas[k])
    tensiones = [float(c.tension_v) for c in calcs]
    tension_empalme = max(set(tensiones), key=lambda t: tensiones.count(t))
    if sistema_pred == "trifasico":
        i_empalme = kva_total * 1000 / (_math.sqrt(3) * tension_empalme) if tension_empalme else 0
    else:
        i_empalme = kva_total * 1000 / tension_empalme if tension_empalme else 0
    cumplen = sum(1 for c in calcs if c.cumple_ric)
    secciones = [c.seccion_mm2 for c in calcs]

    demand = {
        "total_circuitos": len(calcs),
        "circuitos_cumplen": cumplen,
        "tasa_cumplimiento_pct": round(cumplen / len(calcs) * 100, 1),
        "potencia_instalada_kw": round(potencia_instalada, 3),
        "demanda_maxima_kw": round(demanda_total, 3),
        "demanda_maxima_kva": round(kva_total, 3),
        "factor_potencia_promedio": round(fp_prom, 3),
        "corriente_empalme_a": round(i_empalme, 2),
        "tension_empalme_v": tension_empalme,
        "sistema_predominante": sistema_pred,
        "seccion_max_mm2": max(secciones),
    }

    calculations_data = [
        {
            "name": c.name,
            "input_data": c.input_data or {},
            "result_data": c.result_data or {},
            "created_at": c.created_at.isoformat(),
        }
        for c in calcs
    ]

    fecha = datetime.now(timezone.utc).strftime("%d/%m/%Y")
    html = render_sec_memory(
        project_name=project.name,
        project_location=project.location,
        project_description=project.description,
        user_name=current_user.full_name or current_user.email,
        demand=demand,
        calculations=calculations_data,
        fecha=fecha,
        numero_memoria=body.numero_memoria or "001",
    )

    safe_name = sanitize_filename(project.name, fallback="proyecto", max_length=40)
    safe_num = sanitize_filename(body.numero_memoria or "001", fallback="001", max_length=16)
    filename = f"Memoria_SEC_{safe_name}_{safe_num}.pdf"
    pdf_bytes = await _call_pdf_service(html, filename)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Length": str(len(pdf_bytes)),
        },
    )
