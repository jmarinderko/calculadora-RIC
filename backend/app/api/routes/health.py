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


@router.get("/health/schema")
async def health_schema(db: AsyncSession = Depends(get_session)):
    """Diagnóstico de schema — verifica que las columnas críticas existen.

    Útil para detectar si una migración Alembic se aplicó correctamente.
    Retorna las columnas presentes en la tabla `users`.
    """
    try:
        result = await db.execute(text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_schema = 'public' AND table_name = 'users' "
            "ORDER BY ordinal_position"
        ))
        cols = [row[0] for row in result.all()]
        # Verificar que las columnas nuevas de migration 004 existen
        required = {"password_changed_at", "auth_provider"}
        missing = required - set(cols)
        return {
            "table": "users",
            "columns": cols,
            "migration_004_applied": len(missing) == 0,
            "missing": list(missing) if missing else None,
        }
    except Exception as e:
        return {"error": str(e)}
