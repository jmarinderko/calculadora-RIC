from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.db.session import get_session

router = APIRouter()


@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_session)):
    """Health check del servicio y conexión a la base de datos."""
    try:
        await db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False

    return {
        "ok": True,
        "service": "ric-backend",
        "version": "1.0.0",
        "database": "ok" if db_ok else "error",
    }
