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


def test_cors_extreme_length_origin_rejected():
    """Origin absurdamente largo (DoS) es rechazado sin evaluar regex."""
    huge = "https://" + "a" * 10000 + ".up.railway.app"
    assert _is_allowed_origin(huge) is False


def test_cors_fake_railway_suffix_rejected():
    """Un host tipo `evil.com/.up.railway.app` no debe matchear con regex estricta."""
    # El `.` en el path no debe cruzar el boundary del hostname
    assert _is_allowed_origin("https://evil.com#.up.railway.app") is False
    assert _is_allowed_origin("https://evil.com/.up.railway.app") is False


# ═══════════════════════════════════════════════════════════════════════════════
# 6. FIXES P0 ADICIONALES
# ═══════════════════════════════════════════════════════════════════════════════

def test_jwt_bombing_oversized_token_rejected():
    """CVE-2024-33664: tokens anormalmente largos son rechazados sin intentar decode."""
    from fastapi import HTTPException
    from app.core.security import decode_token, MAX_JWT_LENGTH
    huge_token = "a." + ("b" * (MAX_JWT_LENGTH + 100)) + ".c"
    with pytest.raises(HTTPException) as exc_info:
        decode_token(huge_token)
    assert exc_info.value.status_code == 401


def test_sanitize_filename_strips_path_traversal():
    """sanitize_filename elimina separadores de path y comillas."""
    from app.core.security import sanitize_filename
    assert "/" not in sanitize_filename("../../etc/passwd")
    assert "\\" not in sanitize_filename("..\\..\\windows\\system32")
    # Comillas rompen el header Content-Disposition
    assert '"' not in sanitize_filename('foo"; rm -rf /;#.pdf')
    # CR/LF enable header injection
    out = sanitize_filename("evil\r\nX-Injected: yes")
    assert "\r" not in out and "\n" not in out
    # Fallback cuando todo se va
    assert sanitize_filename("///") == "archivo"
    assert sanitize_filename(None) == "archivo"
    # Preserva caracteres seguros
    assert sanitize_filename("proyecto_2026-04-10.pdf") == "proyecto_2026-04-10.pdf"


def test_pdf_template_escapes_xss():
    """render_html escapa HTML en campos controlados por el usuario."""
    from app.api.routes.report_template import render_html
    malicious = "<script>alert('xss')</script>"
    html = render_html(
        input_data={"sistema": "trifasico", "tension_v": 380, "potencia_kw": 10,
                    "longitud_m": 50, "material": "cu", "tipo_canalizacion": "ducto_pvc",
                    "tipo_circuito": "fuerza", "factor_potencia": 0.85, "factor_demanda": 1.0},
        result_data={"seccion_mm2": 4.0, "cumple": True, "caida_pct": 1.5,
                     "limite_caida_pct": 3.0, "i_diseno_a": 15.2, "i_max_corregida_a": 30.0,
                     "factor_total": 1.0, "ft": 1.0, "fg": 1.0, "fa": 1.0,
                     "sec_neutro_mm2": 4.0, "sec_tierra_mm2": 2.5,
                     "calibre_awg": "12 AWG", "advertencias": [malicious]},
        calc_name=malicious,
        project_name=malicious,
        project_location=malicious,
        user_name=malicious,
        calc_date="10/04/2026",
    )
    # El literal con tags ya no debe aparecer; debe estar escapado
    assert "<script>alert" not in html
    assert "&lt;script&gt;" in html


def test_sec_memory_template_escapes_xss():
    """render_sec_memory escapa HTML en campos controlados por el usuario."""
    from app.api.routes.sec_memory_template import render_sec_memory
    malicious = "<img src=x onerror=alert(1)>"
    html = render_sec_memory(
        project_name=malicious,
        project_location=malicious,
        project_description=malicious,
        user_name=malicious,
        demand={"total_circuitos": 0, "tasa_cumplimiento_pct": 0},
        calculations=[],
        fecha="10/04/2026",
        numero_memoria="001",
    )
    assert "<img src=x onerror=alert(1)>" not in html
    assert "&lt;img" in html


@pytest.mark.asyncio
async def test_register_password_min_length_enforced(db: AsyncSession):
    """Password < 8 chars es rechazado por Field validator."""
    client = TestClient(_make_app(db))
    res = client.post("/api/auth/register", json={
        "email": "short@example.com",
        "password": "abc",
    })
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_project_name_max_length_enforced(db: AsyncSession, user_a: User):
    """Nombre de proyecto > 200 chars es rechazado."""
    client = TestClient(_make_app(db))
    res = client.post(
        "/api/projects",
        json={"name": "x" * 300},
        headers=_bearer(user_a),
    )
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_calculator_input_extreme_values_rejected(db: AsyncSession, user_a: User):
    """Valores absurdos (potencia > 100 MW, longitud > 100 km) son rechazados."""
    project = Project(owner_id=user_a.id, name="P", description="d", location="l")
    db.add(project)
    await db.commit()
    await db.refresh(project)

    client = TestClient(_make_app(db))
    bad_input = {
        "sistema": "trifasico", "tension_v": 380, "potencia_kw": 999999999,
        "factor_potencia": 0.85, "factor_demanda": 1.0, "longitud_m": 50,
        "material": "cu", "tipo_canalizacion": "ducto_pvc",
        "temp_ambiente_c": 30, "circuitos_agrupados": 1, "msnm": 0,
        "montaje": "vista", "tipo_circuito": "fuerza", "cables_por_fase": 0,
    }
    res = client.post(
        f"/api/projects/{project.id}/calculations",
        json={"name": "c", "input_data": bad_input},
        headers=_bearer(user_a),
    )
    assert res.status_code == 422


def test_security_headers_middleware_sets_headers():
    """El middleware SecurityHeadersMiddleware agrega headers defensivos."""
    from fastapi import FastAPI
    from app.main import SecurityHeadersMiddleware

    app = FastAPI()
    app.add_middleware(SecurityHeadersMiddleware)

    @app.get("/ping")
    async def ping():
        return {"ok": True}

    client = TestClient(app)
    res = client.get("/ping")
    assert res.headers.get("X-Content-Type-Options") == "nosniff"
    assert res.headers.get("X-Frame-Options") == "DENY"
    assert "strict-origin" in res.headers.get("Referrer-Policy", "")
