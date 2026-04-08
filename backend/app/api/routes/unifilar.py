"""
Rutas para el diagrama unifilar SVG.
POST /api/unifilar/generate  → SVG generado on-the-fly desde resultado + input.
"""
from fastapi import APIRouter
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Any

from app.engine.unifilar_generator import generate_unifilar

router = APIRouter()


class UnifilarRequest(BaseModel):
    """
    Cuerpo de la petición: resultado del cálculo + datos de entrada originales.
    Ambos campos son dicts para máxima flexibilidad (ya validados en /calc/conductor).
    """
    resultado: dict[str, Any]
    input_data: dict[str, Any] | None = None


@router.post(
    "/generate",
    response_class=Response,
    responses={
        200: {
            "content": {"image/svg+xml": {}},
            "description": "Diagrama unifilar en formato SVG",
        }
    },
)
async def generate_unifilar_diagram(body: UnifilarRequest):
    """
    Genera el diagrama unifilar SVG a partir del resultado del cálculo RIC.

    Retorna SVG con content-type image/svg+xml, listo para renderizar en browser.
    """
    svg_content = generate_unifilar(body.resultado, body.input_data)
    return Response(
        content=svg_content,
        media_type="image/svg+xml",
        headers={
            "Cache-Control": "no-store",
            "Content-Disposition": 'inline; filename="unifilar.svg"',
        },
    )
