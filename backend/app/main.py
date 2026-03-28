from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.db.session import init_db
from app.api.routes import health, auth, calc, projects


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Al iniciar: verificar/crear tablas en BD
    await init_db()
    yield


app = FastAPI(
    title="RIC Conductor SaaS — API",
    description="API para cálculo de conductores eléctricos NCh Elec 4/2003 (RIC Chile)",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.backend_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rutas
app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(calc.router, prefix="/api/calc", tags=["calculator"])
app.include_router(projects.router, prefix="/api/projects", tags=["projects"])
