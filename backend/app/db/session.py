from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import text
from contextlib import asynccontextmanager
import asyncio
import functools
import logging

from app.config import settings
from app.db.base import Base

logger = logging.getLogger(__name__)

_engine = None
_AsyncSessionLocal = None


def _init_engine():
    """Inicializa el engine lazily — no conecta a la BD en el import."""
    global _engine, _AsyncSessionLocal
    if _engine is None:
        _engine = create_async_engine(
            settings.database_url,
            echo=settings.environment == "development",
            pool_pre_ping=True,
        )
        _AsyncSessionLocal = async_sessionmaker(_engine, expire_on_commit=False)


def _apply_alembic_migrations(stamp_first: bool = False) -> None:
    """Corre Alembic upgrade head en un thread (Alembic es síncrono).

    Si stamp_first=True, primero hace 'stamp 001' para indicar que la BD fue
    creada con create_all (sin historial Alembic) y luego aplica migraciones
    pendientes a partir de la rev 002.
    """
    import os
    from alembic.config import Config
    from alembic import command

    # alembic.ini está en /app en el container (WORKDIR), o 3 niveles arriba en dev
    alembic_ini = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'alembic.ini')
    alembic_ini = os.path.normpath(alembic_ini)

    if not os.path.exists(alembic_ini):
        logger.warning(f"[init_db] alembic.ini no encontrado en {alembic_ini}, saltando migraciones")
        return

    cfg = Config(alembic_ini)

    if stamp_first:
        logger.info("[init_db] BD sin historial Alembic — marcando en revisión 001")
        command.stamp(cfg, "001")

    logger.info("[init_db] Aplicando migraciones pendientes (alembic upgrade head)")
    command.upgrade(cfg, "head")
    logger.info("[init_db] Migraciones aplicadas correctamente")


async def init_db():
    """Crea las tablas si no existen y aplica migraciones Alembic pendientes."""
    _init_engine()

    # 1. Crear tablas si la BD es nueva (no-op si ya existen)
    async with _engine.begin() as conn:
        from app.db import models  # noqa: F401  — registrar todos los modelos
        await conn.run_sync(Base.metadata.create_all)

    # 2. Verificar si ya existe historial Alembic
    async with _engine.connect() as conn:
        result = await conn.execute(text(
            "SELECT EXISTS ("
            "  SELECT 1 FROM information_schema.tables"
            "  WHERE table_schema = 'public' AND table_name = 'alembic_version'"
            ")"
        ))
        alembic_exists: bool = bool(result.scalar())

    # 3. Correr migraciones en thread pool (Alembic/asyncio.run no puede anidarse)
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(
        None,
        functools.partial(_apply_alembic_migrations, stamp_first=not alembic_exists),
    )


async def get_session() -> AsyncSession:
    """Dependencia FastAPI para obtener sesión de base de datos."""
    _init_engine()
    async with _AsyncSessionLocal() as session:
        yield session


@asynccontextmanager
async def get_raw_connection():
    """Conexión raw para ejecutar SQL de seeds."""
    _init_engine()
    async with _engine.connect() as conn:
        yield conn
