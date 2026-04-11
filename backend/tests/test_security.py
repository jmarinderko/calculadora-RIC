"""
Tests de seguridad — RIC Conductor SaaS
========================================
Cubre:
  1. Autenticación básica
     - Login con contraseña incorrecta → 401
     - Acceso a endpoint protegido sin token → 403
     - Acceso con token JWT manipulado → 401
     - Registro de email duplicado → 409

  2. Google OAuth
     - /api/auth/google sin internal_token (cuando el secret está configurado) → 401
     - /api/auth/google con internal_token correcto → 200

  3. IDOR (Insecure Direct Object Reference)
     - Usuario B no puede leer proyectos de Usuario A → 404
     - Usuario B no puede modificar proyectos de Usuario A → 404
     - Usuario B no puede borrar proyectos de Usuario A → 404
     - Usuario B no puede listar cálculos de proyecto ajeno → 404
     - Usuario B no puede crear cálculo en proyecto ajeno → 404
     - Usuario B no puede generar share link de cálculo ajeno → 403
     - Usuario B no puede exportar XLSX de cálculo ajeno → 403

  4. Autorización admin
     - Usuario normal no puede acceder a /api/admin/stats → 403
     - Usuario normal no puede acceder a /api/admin/users → 403
     - Admin sí puede acceder → 200

  5. CORS
     - Origin de dominio confiable recibe headers CORS
     - Origin desconocido no recibe Access-Control-Allow-Origin
"""
import uuid
import pytest
import pytest_asyncio
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.db.base import Base
from app.db import models  # noqa: F401
from app.db.models import User, Project, Calculation
from app.db.session import get_session
from app.core.security import hash_password, create_access_token
from app.engine.calculator import calculate
from app.engine.schemas import CalculatorInput

from app.api.routes.auth import router as auth_router
from app.api.routes.projects import router as projects_router
from app.api.routes.admin import router as admin_router
from app.api.routes.exports import router as exports_router
from app.api.routes.share import router as share_router
from app.main import _is_allowed_origin

# ─── DB en memoria ────────────────────────────────────────────────────────────

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture(scope="module")
async def test_engine():
    engine = create_async_engine(TEST_DB_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def db(test_engine):
    factory = async_sessionmaker(test_engine, expire_on_commit=False)
    async with factory() as session:
        yield session
        await session.rollback()


# ─── App de test con DB override ─────────────────────────────────────────────

def _make_app(db_session: AsyncSession) -> FastAPI:
    """Crea una app FastAPI con la sesión de test inyectada, sin override de auth."""
    app = FastAPI()

    async def _get_session():
        yield db_session

    app.dependency_overrides[get_session] = _get_session
    app.include_router(auth_router, prefix="/api/auth")
    app.include_router(projects_router, prefix="/api/projects")
    app.include_router(admin_router, prefix="/api/admin")
    app.include_router(exports_router, prefix="/api/exports")
    app.include_router(share_router, prefix="/api/calculations")
    return app


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _make_user(email: str, is_admin: bool = False, is_active: bool = True) -> User:
    return User(
        email=email,
        hashed_password=hash_password("Correct_pass1"),
        full_name="Test User",
        is_active=is_active,
        is_admin=is_admin,
    )


def _bearer(user: User) -> dict:
    token = create_access_token(str(user.id))
    return {"Authorization": f"Bearer {token}"}


def _calc_input(**kwargs) -> CalculatorInput:
    defaults = dict(
        sistema="trifasico", tension_v=380, potencia_kw=10.0,
        factor_potencia=0.85, factor_demanda=1.0, longitud_m=50,
        material="cu", tipo_canalizacion="ducto_pvc",
        temp_ambiente_c=30, circuitos_agrupados=1, msnm=0,
        montaje="vista", tipo_circuito="fuerza", cables_por_fase=0,
    )
    defaults.update(kwargs)
    return CalculatorInput(**defaults)


# ─── Fixtures de usuarios y proyectos ────────────────────────────────────────

@pytest_asyncio.fixture
async def user_a(db: AsyncSession) -> User:
    u = _make_user(f"usera_{uuid.uuid4().hex[:6]}@test.cl")
    db.add(u)
    await db.commit()
    await db.refresh(u)
    return u


@pytest_asyncio.fixture
async def user_b(db: AsyncSession) -> User:
    u = _make_user(f"userb_{uuid.uuid4().hex[:6]}@test.cl")
    db.add(u)
    await db.commit()
    await db.refresh(u)
    return u


@pytest_asyncio.fixture
async def admin_user(db: AsyncSession) -> User:
    u = _make_user(f"admin_{uuid.uuid4().hex[:6]}@test.cl", is_admin=True)
    db.add(u)
    await db.commit()
    await db.refresh(u)
    return u


@pytest_asyncio.fixture
async def project_a(db: AsyncSession, user_a: User) -> Project:
    p = Project(owner_id=user_a.id, name="Proyecto de A", location="Santiago")
    db.add(p)
    await db.commit()
    await db.refresh(p)
    return p


@pytest_asyncio.fixture
async def calculation_a(db: AsyncSession, project_a: Project) -> Calculation:
    inp = _calc_input()
    res = calculate(inp)
    c = Calculation(
        project_id=project_a.id,
        name="Cálculo de A",
        input_data=inp.model_dump(),
        result_data=res.resultado.model_dump(),
        sistema=inp.sistema,
        tension_v=inp.tension_v,
        potencia_kw=inp.potencia_kw,
        seccion_mm2=res.resultado.seccion_mm2,
        cumple_ric=res.resultado.cumple,
    )
    db.add(c)
    await db.commit()
    await db.refresh(c)
    return c


# ═══════════════════════════════════════════════════════════════════════════════
# 1. AUTENTICACIÓN BÁSICA
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_login_wrong_password_returns_401(db: AsyncSession, user_a: User):
    """Login con contraseña incorrecta devuelve 401."""
    client = TestClient(_make_app(db))
    res = client.post("/api/auth/login", json={"email": user_a.email, "password": "WrongPass!"})
    assert res.status_code == 401
    assert "Credenciales" in res.json()["detail"]


@pytest.mark.asyncio
async def test_login_correct_password_returns_token(db: AsyncSession, user_a: User):
    """Login con contraseña correcta devuelve access_token."""
    client = TestClient(_make_app(db))
    res = client.post("/api/auth/login", json={"email": user_a.email, "password": "Correct_pass1"})
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert len(data["access_token"]) > 20


@pytest.mark.asyncio
async def test_protected_endpoint_without_token_returns_403(db: AsyncSession):
    """Acceder a /api/projects sin token devuelve 403."""
    client = TestClient(_make_app(db))
    res = client.get("/api/projects")
    # FastAPI HTTPBearer devuelve 403 o 401 según la versión — ambos son correctos
    assert res.status_code in (401, 403)


@pytest.mark.asyncio
async def test_protected_endpoint_with_invalid_token_returns_401(db: AsyncSession):
    """JWT manipulado es rechazado con 401."""
    client = TestClient(_make_app(db))
    res = client.get("/api/projects", headers={"Authorization": "Bearer token.falso.invalido"})
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_register_duplicate_email_returns_409(db: AsyncSession, user_a: User):
    """Registro con email ya existente devuelve 409."""
    client = TestClient(_make_app(db))
    res = client.post("/api/auth/register", json={
        "email": user_a.email,
        "password": "NuevaPass1!",
        "full_name": "Duplicado",
    })
    assert res.status_code == 409
    assert "registrado" in res.json()["detail"]


# ═══════════════════════════════════════════════════════════════════════════════
# 2. GOOGLE OAUTH — internal_token
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_google_auth_without_internal_token_blocked(db: AsyncSession, monkeypatch):
    """
    Cuando INTERNAL_API_SECRET está configurado, llamar a /api/auth/google
    sin el internal_token correcto devuelve 401 — previene account takeover.
    """
    import app.config as cfg_module
    monkeypatch.setattr(cfg_module.settings, "internal_api_secret", "super_secret_123")

    client = TestClient(_make_app(db))
    res = client.post("/api/auth/google", json={"email": "victim@test.cl", "name": "Victim"})
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_google_auth_wrong_internal_token_blocked(db: AsyncSession, monkeypatch):
    """internal_token incorrecto también es rechazado."""
    import app.config as cfg_module
    monkeypatch.setattr(cfg_module.settings, "internal_api_secret", "super_secret_123")

    client = TestClient(_make_app(db))
    res = client.post("/api/auth/google", json={
        "email": "victim@test.cl",
        "name": "Victim",
        "internal_token": "wrong_token",
    })
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_google_auth_correct_internal_token_succeeds(db: AsyncSession, monkeypatch):
    """internal_token correcto permite la autenticación Google."""
    import app.config as cfg_module
    monkeypatch.setattr(cfg_module.settings, "internal_api_secret", "super_secret_123")

    client = TestClient(_make_app(db))
    res = client.post("/api/auth/google", json={
        "email": f"google_{uuid.uuid4().hex[:6]}@gmail.com",
        "name": "Google User",
        "internal_token": "super_secret_123",
    })
    assert res.status_code == 200
    assert "access_token" in res.json()


@pytest.mark.asyncio
async def test_google_auth_no_secret_configured_allows_all(db: AsyncSession, monkeypatch):
    """
    Si internal_api_secret está vacío (dev/retrocompat), el endpoint
    sigue funcionando sin token para no romper deploys existentes.
    """
    import app.config as cfg_module
    monkeypatch.setattr(cfg_module.settings, "internal_api_secret", "")

    client = TestClient(_make_app(db))
    res = client.post("/api/auth/google", json={
        "email": f"google_{uuid.uuid4().hex[:6]}@gmail.com",
        "name": "Dev User",
    })
    assert res.status_code == 200


# ═══════════════════════════════════════════════════════════════════════════════
# 3. IDOR — proyectos
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_idor_get_project_of_other_user_returns_404(
    db: AsyncSession, user_b: User, project_a: Project
):
    """Usuario B no puede leer el proyecto de Usuario A."""
    client = TestClient(_make_app(db))
    res = client.get(f"/api/projects/{project_a.id}", headers=_bearer(user_b))
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_idor_update_project_of_other_user_returns_404(
    db: AsyncSession, user_b: User, project_a: Project
):
    """Usuario B no puede modificar el proyecto de Usuario A."""
    client = TestClient(_make_app(db))
    res = client.put(
        f"/api/projects/{project_a.id}",
        json={"name": "Hackeado", "description": "PWNED"},
        headers=_bearer(user_b),
    )
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_idor_delete_project_of_other_user_returns_404(
    db: AsyncSession, user_b: User, project_a: Project
):
    """Usuario B no puede borrar el proyecto de Usuario A."""
    client = TestClient(_make_app(db))
    res = client.delete(f"/api/projects/{project_a.id}", headers=_bearer(user_b))
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_idor_list_calculations_of_other_project_returns_404(
    db: AsyncSession, user_b: User, project_a: Project
):
    """Usuario B no puede listar los cálculos del proyecto de Usuario A."""
    client = TestClient(_make_app(db))
    res = client.get(f"/api/projects/{project_a.id}/calculations", headers=_bearer(user_b))
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_idor_create_calculation_in_other_project_returns_404(
    db: AsyncSession, user_b: User, project_a: Project
):
    """Usuario B no puede agregar cálculos al proyecto de Usuario A."""
    client = TestClient(_make_app(db))
    payload = {
        "name": "Intruso",
        "input_data": {
            "sistema": "monofasico", "tension_v": 220, "potencia_kw": 5.0,
            "factor_potencia": 0.85, "factor_demanda": 1.0, "longitud_m": 30,
            "material": "cu", "tipo_canalizacion": "ducto_pvc",
            "temp_ambiente_c": 30, "circuitos_agrupados": 1, "msnm": 0,
            "montaje": "vista", "tipo_circuito": "fuerza", "cables_por_fase": 0,
        },
    }
    res = client.post(
        f"/api/projects/{project_a.id}/calculations",
        json=payload,
        headers=_bearer(user_b),
    )
    assert res.status_code == 404


# ═══════════════════════════════════════════════════════════════════════════════
# 3b. IDOR — share y exports
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_idor_share_calculation_of_other_user_returns_403(
    db: AsyncSession, user_b: User, calculation_a: Calculation
):
    """Usuario B no puede generar share link de un cálculo ajeno."""
    client = TestClient(_make_app(db))
    res = client.post(
        f"/api/calculations/{calculation_a.id}/share",
        headers=_bearer(user_b),
    )
    # El endpoint primero hace 404 si no encuentra el cálculo (UUID válido pero
    # proyecto no coincide), o 403 si encuentra el cálculo pero el proyecto es ajeno.
    # Ambos son correctos — lo importante es que NO sea 200.
    assert res.status_code in (403, 404)


@pytest.mark.asyncio
async def test_idor_export_xlsx_of_other_user_returns_403(
    db: AsyncSession, user_b: User, calculation_a: Calculation
):
    """Usuario B no puede exportar XLSX de cálculo ajeno."""
    client = TestClient(_make_app(db))
    res = client.get(
        f"/api/exports/{calculation_a.id}/xlsx",
        headers=_bearer(user_b),
    )
    assert res.status_code in (403, 404)


# ═══════════════════════════════════════════════════════════════════════════════
# 4. AUTORIZACIÓN ADMIN
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_admin_stats_requires_admin_role(db: AsyncSession, user_a: User):
    """Usuario normal recibe 403 en /api/admin/stats."""
    client = TestClient(_make_app(db))
    res = client.get("/api/admin/stats", headers=_bearer(user_a))
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_admin_users_requires_admin_role(db: AsyncSession, user_a: User):
    """Usuario normal recibe 403 en /api/admin/users."""
    client = TestClient(_make_app(db))
    res = client.get("/api/admin/users", headers=_bearer(user_a))
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_admin_stats_accessible_by_admin(db: AsyncSession, admin_user: User):
    """Admin puede acceder a /api/admin/stats."""
    client = TestClient(_make_app(db))
    res = client.get("/api/admin/stats", headers=_bearer(admin_user))
    assert res.status_code == 200
    data = res.json()
    assert "total_users" in data


@pytest.mark.asyncio
async def test_admin_without_token_returns_403(db: AsyncSession):
    """Sin token, /api/admin/stats devuelve 403."""
    client = TestClient(_make_app(db))
    res = client.get("/api/admin/stats")
    assert res.status_code in (401, 403)


# ═══════════════════════════════════════════════════════════════════════════════
# 5. CORS
# ═══════════════════════════════════════════════════════════════════════════════

def test_cors_trusted_localhost_allowed():
    """Origin localhost:3001 (dev) es confiable."""
    assert _is_allowed_origin("http://localhost:3001") is True


def test_cors_trusted_localhost_3000_allowed():
    """Origin localhost:3000 es confiable."""
    assert _is_allowed_origin("http://localhost:3000") is True


def test_cors_railway_subdomain_allowed():
    """Subdominio .up.railway.app es confiable (deployment Railway)."""
    assert _is_allowed_origin("https://ric-conductor-production.up.railway.app") is True


def test_cors_unknown_domain_rejected():
    """Dominio externo desconocido NO es confiable."""
    assert _is_allowed_origin("https://evil-hacker.com") is False


def test_cors_empty_origin_rejected():
    """Origin vacío no es confiable."""
    assert _is_allowed_origin("") is False


def test_cors_http_unknown_rejected():
    """HTTP desde dominio desconocido no es confiable."""
    assert _is_allowed_origin("http://other-app.example.com") is False
