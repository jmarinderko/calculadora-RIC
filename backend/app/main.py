from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from contextlib import asynccontextmanager
import re

from app.config import settings
from app.db.session import init_db
from app.api.routes import health, auth, calc, projects, unifilar, reports
from app.api.routes import calc_mtat
from app.api.routes import calc_ernc
from app.api.routes import admin
from app.api.routes import profile, share, exports


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

# Orígenes CORS: lista fija + extra_cors_origins + subdominios Railway/Vercel automáticos
_TRUSTED_PATTERNS = [
    re.compile(r"https://.*\.up\.railway\.app$"),
    re.compile(r"https://.*\.vercel\.app$"),
    re.compile(r"https://.*\.railway\.app$"),
]

def _is_allowed_origin(origin: str) -> bool:
    explicit = settings.backend_cors_origins + settings.extra_cors_origins
    if origin in explicit:
        return True
    return any(p.match(origin) for p in _TRUSTED_PATTERNS)

# Middleware CORS dinámico — evalúa el Origin de cada request
class DynamicCORSMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        origin = request.headers.get("origin", "")
        allowed = _is_allowed_origin(origin) if origin else False

        if request.method == "OPTIONS":
            # Preflight
            response = Response(status_code=200)
        else:
            response = await call_next(request)

        if allowed:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type, Accept"
            response.headers["Vary"] = "Origin"
        return response

app.add_middleware(DynamicCORSMiddleware)

# Rutas
app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(calc.router, prefix="/api/calc", tags=["calculator"])
app.include_router(projects.router, prefix="/api/projects", tags=["projects"])
app.include_router(calc_mtat.router, prefix="/api/calc", tags=["calculator-mtat"])
app.include_router(calc_ernc.router, prefix="/api/calc", tags=["calculator-ernc"])
app.include_router(unifilar.router, prefix="/api/unifilar", tags=["unifilar"])
app.include_router(reports.router, prefix="/api/reports", tags=["reports"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(profile.router, prefix="/api/users/profile", tags=["profile"])
app.include_router(share.router, prefix="/api/calculations", tags=["share"])
app.include_router(share.router, prefix="/api/share", tags=["share-public"])
app.include_router(exports.router, prefix="/api/exports", tags=["exports"])
