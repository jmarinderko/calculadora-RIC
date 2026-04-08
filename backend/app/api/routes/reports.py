"""
Módulo de generación de reportes PDF — Memoria de Cálculo SEC.
Endpoints:
  POST /reports/{calculation_id}/generate   → genera el PDF y guarda el Report
  GET  /reports/{report_id}/download        → retorna el PDF binario
"""
from datetime import datetime, timezone
from typing import Optional
import uuid
import httpx

from fastapi import APIRouter, Depends, HTTPException, status, Response
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import settings
from app.db.session import get_session
from app.db.models import User, Calculation, Project, Report
from app.api.deps import get_current_user
from .report_template import render_html

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
    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail="Servicio PDF no disponible. Verifique que el contenedor ric_pdf esté corriendo.",
        )
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Error en el servicio PDF: {exc.response.text}",
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
