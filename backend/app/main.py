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
from app.api.routes import calc_tree
from app.api.routes import calc_grounding
from app.api.routes import calc_pf
from app.api.routes import calc_lighting
from app.api.routes import admin
from app.api.routes import profile, share, exports
from app.api.routes import templates


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Al iniciar: verificar/crear tablas en BD
    await init_db()
    yield


app = FastAPI(
    title="RIC Conductor SaaS — API",
    description="API para cálculo de conductores eléctricos RIC Chile",
    version="1.0.0",
    lifespan=lifespan,
)

# Orígenes CORS: lista fija + extra_cors_origins + subdominios Railway/Vercel automáticos.
# Regex estrictas (sin `.*`) para evitar ReDoS y limitar a hostnames válidos.
_HOST_CHARS = r"[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*"
_TRUSTED_PATTERNS = [
    re.compile(rf"^https://{_HOST_CHARS}\.up\.railway\.app$"),
    re.compile(rf"^https://{_HOST_CHARS}\.vercel\.app$"),
    re.compile(rf"^https://{_HOST_CHARS}\.railway\.app$"),
]
_MAX_ORIGIN_LENGTH = 253 + len("https://")  # RFC 1035: hostname ≤253 chars


def _is_allowed_origin(origin: str) -> bool:
    # Cap defensivo sobre longitud antes de evaluar regex
    if not origin or len(origin) > _MAX_ORIGIN_LENGTH:
        return False
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
            try:
                response = await call_next(request)
            except Exception:
                # En excepciones no manejadas agregar CORS igualmente para que el
                # browser muestre el error real (500) en vez de un error CORS falso
                response = Response(status_code=500, content=b'{"detail":"Internal server error"}',
                                    media_type="application/json")

        if allowed:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type, Accept"
            response.headers["Vary"] = "Origin"
        return response

app.add_middleware(DynamicCORSMiddleware)


# Headers HTTP de seguridad aplicados a todas las respuestas de la API.
# Nota: HSTS solo se setea fuera de development — evita problemas con certs
# self-signed locales.
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
        if settings.environment != "development":
            response.headers.setdefault(
                "Strict-Transport-Security",
                "max-age=31536000; includeSubDomains",
            )
        return response


app.add_middleware(SecurityHeadersMiddleware)

# Rutas
app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(calc.router, prefix="/api/calc", tags=["calculator"])
app.include_router(projects.router, prefix="/api/projects", tags=["projects"])
app.include_router(calc_mtat.router, prefix="/api/calc", tags=["calculator-mtat"])
app.include_router(calc_ernc.router, prefix="/api/calc", tags=["calculator-ernc"])
app.include_router(calc_tree.router, prefix="/api/calc", tags=["calculator-tree"])
app.include_router(calc_grounding.router, prefix="/api/calc", tags=["calculator-grounding"])
app.include_router(calc_pf.router, prefix="/api/calc", tags=["calculator-pf"])
app.include_router(calc_lighting.router, prefix="/api/calc", tags=["calculator-lighting"])
app.include_router(unifilar.router, prefix="/api/unifilar", tags=["unifilar"])
app.include_router(reports.router, prefix="/api/reports", tags=["reports"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(profile.router, prefix="/api/users/profile", tags=["profile"])
app.include_router(share.router, prefix="/api/calculations", tags=["share"])
app.include_router(share.router, prefix="/api/share", tags=["share-public"])
app.include_router(exports.router, prefix="/api/exports", tags=["exports"])
app.include_router(templates.router, prefix="/api/templates", tags=["templates"])
