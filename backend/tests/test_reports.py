"""
Tests del módulo de reportes PDF — /backend/tests/test_reports.py

Estrategia:
  - Tests unitarios del motor de templates (report_template.render_html).
  - Tests de integración de los endpoints con DB SQLite en memoria,
    mockeando el microservicio PDF para no depender de Puppeteer/Docker.
"""
import uuid
import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from fastapi import FastAPI
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import select

from app.db.base import Base
from app.db import models  # noqa: F401 — importa todos los modelos para create_all
from app.db.models import User, Project, Calculation, Report
from app.db.session import get_session
from app.api.deps import get_current_user
from app.api.routes import reports as reports_module
from app.api.routes.reports import router as reports_router
from app.api.routes.report_template import render_html
from app.core.security import hash_password
from app.engine.calculator import calculate
from app.engine.schemas import CalculatorInput


# ─── DB de test en memoria ────────────────────────────────────────────────────

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture(scope="module")
async def test_engine():
    engine = create_async_engine(TEST_DB_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(test_engine):
    async_session = async_sessionmaker(test_engine, expire_on_commit=False)
    async with async_session() as session:
        yield session
        await session.rollback()


# ─── Fixtures de datos ────────────────────────────────────────────────────────

def _base_input(**kwargs) -> CalculatorInput:
    defaults = dict(
        sistema="trifasico",
        tension_v=380,
        potencia_kw=15.0,
        factor_potencia=0.85,
        factor_demanda=1.0,
        longitud_m=80,
        material="cu",
        tipo_canalizacion="ducto_pvc",
        temp_ambiente_c=30,
        circuitos_agrupados=1,
        msnm=0,
        montaje="vista",
        tipo_circuito="fuerza",
        cables_por_fase=0,
    )
    defaults.update(kwargs)
    return CalculatorInput(**defaults)


@pytest_asyncio.fixture
async def sample_user(db_session: AsyncSession) -> User:
    user = User(
        email=f"test_{uuid.uuid4().hex[:6]}@example.com",
        hashed_password=hash_password("password123"),
        full_name="Ingeniero Test",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def sample_calculation(db_session: AsyncSession, sample_user: User) -> Calculation:
    project = Project(
        owner_id=sample_user.id,
        name="Proyecto Test",
        location="Santiago, Chile",
    )
    db_session.add(project)
    await db_session.flush()

    calc_input = _base_input()
    calc_result = calculate(calc_input)

    calc = Calculation(
        project_id=project.id,
        name="Circuito TA-1",
        input_data=calc_input.model_dump(),
        result_data=calc_result.resultado.model_dump(),
        sistema=calc_input.sistema,
        tension_v=calc_input.tension_v,
        potencia_kw=calc_input.potencia_kw,
        seccion_mm2=calc_result.resultado.seccion_mm2,
        cumple_ric=calc_result.resultado.cumple,
    )
    db_session.add(calc)
    await db_session.commit()
    await db_session.refresh(calc)
    return calc


# ─── Helpers para cliente FastAPI con overrides ───────────────────────────────

def _make_app(db_session: AsyncSession, user: User) -> FastAPI:
    app = FastAPI()

    async def override_get_session():
        yield db_session

    async def override_get_current_user():
        return user

    app.dependency_overrides[get_session] = override_get_session
    app.dependency_overrides[get_current_user] = override_get_current_user
    app.include_router(reports_router, prefix="/api/reports")
    return app


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 1: render_html produce HTML bien formado con los datos correctos
# ═══════════════════════════════════════════════════════════════════════════════

def test_render_html_contains_key_data():
    """El template HTML incluye los datos del cálculo y las referencias normativas."""
    calc_input = _base_input()
    calc_result = calculate(calc_input)

    html = render_html(
        input_data=calc_input.model_dump(),
        result_data=calc_result.resultado.model_dump(),
        calc_name="Circuito TA-1",
        project_name="Edificio Central",
        project_location="Santiago",
        user_name="Ing. Juan Marin",
        calc_date="08/04/2026 10:00",
    )

    assert "<!DOCTYPE html>" in html
    assert "NCh Elec 4/2003" in html
    assert "Circuito TA-1" in html
    assert "Edificio Central" in html
    assert "Santiago" in html
    assert "Ing. Juan Marin" in html
    # Datos del sistema
    assert "380" in html  # tensión
    assert "Trifásico" in html
    assert "Cobre" in html
    # Factores
    assert "Ft" in html
    assert "Fg" in html
    assert "Fa" in html
    # Sección elegida
    seccion = str(calc_result.resultado.seccion_mm2)
    assert seccion in html


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 2: render_html maneja cálculo con estrés térmico
# ═══════════════════════════════════════════════════════════════════════════════

def test_render_html_with_estres_termico():
    """El template incluye la sección de estrés térmico cuando corresponde."""
    calc_input = _base_input(icc_ka=10.0, tiempo_cc_s=0.5)
    calc_result = calculate(calc_input)

    assert calc_result.resultado.estres_termico is not None

    html = render_html(
        input_data=calc_input.model_dump(),
        result_data=calc_result.resultado.model_dump(),
        calc_name="Test Estrés",
        project_name="",
        project_location="",
        user_name="",
        calc_date="",
    )

    assert "IEC 60949" in html
    assert "Estrés térmico" in html


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 3: render_html con monofásico 220V alumbrado
# ═══════════════════════════════════════════════════════════════════════════════

def test_render_html_monofasico_alumbrado():
    """El template refleja correctamente un circuito monofásico de alumbrado."""
    calc_input = _base_input(
        sistema="monofasico",
        tension_v=220,
        potencia_kw=2.5,
        tipo_circuito="alumbrado",
        longitud_m=30,
    )
    calc_result = calculate(calc_input)

    html = render_html(
        input_data=calc_input.model_dump(),
        result_data=calc_result.resultado.model_dump(),
        calc_name="Alumbrado Sala",
        project_name="Casa Habitación",
        project_location="Viña del Mar",
        user_name="",
        calc_date="",
    )

    assert "Monofásico" in html
    assert "220" in html
    assert "Alumbrado" in html
    assert "CUMPLE" in html  # circuito sencillo debe cumplir


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 4: POST /reports/{calculation_id}/generate crea un Report en DB
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_generate_report_creates_db_record(
    db_session: AsyncSession,
    sample_calculation: Calculation,
    sample_user: User,
):
    """POST /generate crea un registro Report en la base de datos."""
    app = _make_app(db_session, sample_user)

    fake_pdf = b"%PDF-1.4 fake pdf content"

    with patch.object(reports_module, "_call_pdf_service", new=AsyncMock(return_value=fake_pdf)):
        with TestClient(app) as client:
            resp = client.post(f"/api/reports/{sample_calculation.id}/generate")

    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert "id" in data
    assert data["calculation_id"] == str(sample_calculation.id)

    # Verificar que existe en DB
    result = await db_session.execute(
        select(Report).where(Report.id == uuid.UUID(data["id"]))
    )
    report = result.scalar_one_or_none()
    assert report is not None
    assert report.calculation_id == sample_calculation.id
    assert "/download" in report.pdf_url


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 5: GET /reports/{report_id}/download retorna PDF binario
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_download_report_returns_pdf(
    db_session: AsyncSession,
    sample_calculation: Calculation,
    sample_user: User,
):
    """GET /download retorna Content-Type application/pdf y cuerpo no vacío."""
    app = _make_app(db_session, sample_user)

    fake_pdf = b"%PDF-1.4 test binary content"

    with patch.object(reports_module, "_call_pdf_service", new=AsyncMock(return_value=fake_pdf)):
        with TestClient(app) as client:
            # Primero genera el reporte
            gen_resp = client.post(f"/api/reports/{sample_calculation.id}/generate")
            assert gen_resp.status_code == 201

            report_id = gen_resp.json()["id"]

            # Luego lo descarga
            dl_resp = client.get(f"/api/reports/{report_id}/download")

    assert dl_resp.status_code == 200
    assert dl_resp.headers["content-type"] == "application/pdf"
    assert dl_resp.content == fake_pdf
    assert "attachment" in dl_resp.headers.get("content-disposition", "")


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 6: POST /generate con calculation_id inexistente retorna 404
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_generate_report_unknown_calculation_returns_404(
    db_session: AsyncSession,
    sample_user: User,
):
    """Genera 404 si el cálculo no pertenece al usuario o no existe."""
    app = _make_app(db_session, sample_user)
    fake_id = uuid.uuid4()

    with TestClient(app) as client:
        resp = client.post(f"/api/reports/{fake_id}/generate")

    assert resp.status_code == 404


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 7: GET /download con report_id inexistente retorna 404
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_download_unknown_report_returns_404(
    db_session: AsyncSession,
    sample_user: User,
):
    """Genera 404 si el report_id no existe."""
    app = _make_app(db_session, sample_user)
    fake_id = uuid.uuid4()

    with TestClient(app) as client:
        resp = client.get(f"/api/reports/{fake_id}/download")

    assert resp.status_code == 404


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 8: render_html maneja valores nulos en estrés térmico sin crash
# ═══════════════════════════════════════════════════════════════════════════════

def test_render_html_no_estres_termico():
    """El template no incluye la sección de estrés cuando no hay datos."""
    calc_input = _base_input()
    calc_result = calculate(calc_input)

    # Sin estrés térmico
    result_dict = calc_result.resultado.model_dump()
    result_dict["estres_termico"] = None

    html = render_html(
        input_data=calc_input.model_dump(),
        result_data=result_dict,
        calc_name="Sin estrés",
        project_name="",
        project_location="",
        user_name="",
        calc_date="",
    )

    # No debe aparecer la sección 5
    assert "Estrés térmico por cortocircuito (IEC 60949)" not in html
    # Pero sí el resto
    assert "NCh Elec 4/2003" in html


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 9: render_html con ajustes normativos incluye las cajas informativas
# ═══════════════════════════════════════════════════════════════════════════════

def test_render_html_with_ajuste_por_minimo():
    """Cuando hay ajuste por mínimo normativo, aparece la info-box correspondiente."""
    # Alumbrado con 0.5 kW — la sección calculada será menor a 1.5mm², se ajusta
    calc_input = _base_input(
        sistema="monofasico",
        tension_v=220,
        potencia_kw=0.1,
        tipo_circuito="alumbrado",
        longitud_m=5,
    )
    calc_result = calculate(calc_input)

    result_dict = calc_result.resultado.model_dump()
    # Forzar ajustado_por_minimo para testear el template independientemente del motor
    result_dict["ajustado_por_minimo"] = True
    result_dict["sec_min_ric_mm2"] = 1.5

    html = render_html(
        input_data=calc_input.model_dump(),
        result_data=result_dict,
        calc_name="Test mínimo",
        project_name="",
        project_location="",
        user_name="",
        calc_date="",
    )

    assert "Ajustes normativos aplicados" in html
    assert "RIC Art. 5.3.1" in html


# ═══════════════════════════════════════════════════════════════════════════════
# TEST 10: Servicio PDF no disponible → 503
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_generate_report_pdf_service_unavailable(
    db_session: AsyncSession,
    sample_calculation: Calculation,
    sample_user: User,
):
    """Cuando el pdf-service no está disponible, el endpoint retorna 503."""
    from fastapi import HTTPException as FastAPIHTTPException
    app = _make_app(db_session, sample_user)

    # Simula que _call_pdf_service lanza el 503 que ya se produce internamente
    # al capturar httpx.ConnectError (probamos el camino desde el endpoint)
    async def raise_service_unavailable(*args, **kwargs):
        raise FastAPIHTTPException(
            status_code=503,
            detail="Servicio PDF no disponible. Verifique que el contenedor ric_pdf esté corriendo.",
        )

    with patch.object(reports_module, "_call_pdf_service", new=AsyncMock(side_effect=raise_service_unavailable)):
        with TestClient(app, raise_server_exceptions=False) as client:
            resp = client.post(f"/api/reports/{sample_calculation.id}/generate")

    assert resp.status_code == 503
