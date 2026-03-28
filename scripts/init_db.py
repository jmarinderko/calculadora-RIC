"""
Script auxiliar: crea tablas y carga seeds en local (fuera de Docker).
Uso: python scripts/init_db.py
Requiere DATABASE_URL en .env
"""
import asyncio
import sys
from pathlib import Path

# Agrega backend/ al path para importar los módulos del proyecto
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from app.db.session import engine, init_db  # noqa: E402


async def main() -> None:
    print("Creando tablas...")
    await init_db()
    print("Tablas creadas exitosamente.")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
