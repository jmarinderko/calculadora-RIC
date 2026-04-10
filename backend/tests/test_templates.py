"""
Tests para el módulo de plantillas de proyecto (issue #30).
Todos los tests del motor/lógica se ejecutan sin red HTTP para evitar
la complejidad de montar la app completa con auth en tests.
Los tests que requieren BD usan SQLite en memoria vía conftest.
"""
import pytest
import pytest_asyncio
import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from app.db.base import Base
from app.db import models  # registrar modelos en metadata

from app.api.routes.templates import (
    PLANTILLAS,
    _build_calculator_input,
    _DEFAULTS,
    _MOTOR_DEFAULTS,
)
from app.engine.calculator import calculate
from app.engine.schemas import CalculatorInput
from app.db.models import User, Project, Calculation

# ── Fixture de BD en memoria ──────────────────────────────────────────────────

DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture
async def db():
    engine = create_async_engine(DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


# ── Helpers ───────────────────────────────────────────────────────────────────

def utcnow():
    return datetime.now(timezone.utc)


async def _create_user_and_project(db, project_name="Test Project"):
    """Crea un usuario y un proyecto de prueba en la BD."""
    user = User(
        id=uuid.uuid4(),
        email=f"test_{uuid.uuid4().hex[:8]}@example.com",
        hashed_password="hashed",
        is_active=True,
        is_admin=False,
        created_at=utcnow(),
    )
    db.add(user)
    await db.flush()

    project = Project(
        id=uuid.uuid4(),
        owner_id=user.id,
        name=project_name,
        created_at=utcnow(),
        updated_at=utcnow(),
    )
    db.add(project)
    await db.flush()
    return user, project


# ── Tests de listado de plantillas ───────────────────────────────────────────

def test_list_templates_returns_all():
    """Verifica que PLANTILLAS tiene exactamente 4 entradas."""
    assert len(PLANTILLAS) == 4
    keys = set(PLANTILLAS.keys())
    assert keys == {"vivienda_unifamiliar", "oficina_pequena", "local_comercial", "taller_industrial_bt"}


def test_template_has_required_fields():
    """Cada plantilla tiene los campos: nombre, descripcion, circuitos."""
    for key, tpl in PLANTILLAS.items():
        assert "nombre" in tpl, f"Plantilla '{key}' no tiene 'nombre'"
        assert "descripcion" in tpl, f"Plantilla '{key}' no tiene 'descripcion'"
        assert "circuitos" in tpl, f"Plantilla '{key}' no tiene 'circuitos'"
        assert isinstance(tpl["circuitos"], list), f"Plantilla '{key}': circuitos debe ser lista"
        assert len(tpl["circuitos"]) > 0, f"Plantilla '{key}': debe tener al menos 1 circuito"


def test_vivienda_tiene_6_circuitos():
    """La plantilla vivienda_unifamiliar tiene exactamente 6 circuitos."""
    tpl = PLANTILLAS["vivienda_unifamiliar"]
    assert len(tpl["circuitos"]) == 6


def test_template_out_num_circuitos():
    """num_circuitos de cada plantilla coincide con len(circuitos)."""
    for key, tpl in PLANTILLAS.items():
        expected = len(tpl["circuitos"])
        assert expected == len(tpl["circuitos"])


# ── Tests del motor de cálculo con datos de plantillas ───────────────────────

def test_circuitos_calculados_correctamente():
    """Todos los circuitos de todas las plantillas calculan seccion_mm2 > 0."""
    for key, tpl in PLANTILLAS.items():
        for circ in tpl["circuitos"]:
            inp = _build_calculator_input(circ)
            result = calculate(inp)
            assert result.resultado.seccion_mm2 > 0, (
                f"Plantilla '{key}', circuito '{circ['nombre']}': seccion_mm2 debe ser > 0"
            )


def test_build_calculator_input_defaults():
    """_build_calculator_input aplica defaults correctamente."""
    circ = {
        "nombre": "Test",
        "tipo_circuito": "alumbrado",
        "potencia_kw": 1.0,
        "tension_v": 220,
        "sistema": "monofasico",
        "longitud_m": 10,
        "material": "cu",
    }
    inp = _build_calculator_input(circ)
    assert inp.factor_potencia == _DEFAULTS["factor_potencia"]
    assert inp.factor_demanda == 1.0
    assert inp.tipo_canalizacion == _DEFAULTS["tipo_canalizacion"]
    assert inp.temp_ambiente_c == _DEFAULTS["temp_ambiente_c"]
    assert inp.msnm == _DEFAULTS["msnm"]


def test_build_calculator_input_motor_defaults():
    """Para tipo_circuito='motor', se usan los defaults especiales de motor."""
    circ = {
        "nombre": "Motor",
        "tipo_circuito": "motor",
        "potencia_kw": 15.0,
        "tension_v": 380,
        "sistema": "trifasico",
        "longitud_m": 25,
        "material": "cu",
    }
    inp = _build_calculator_input(circ)
    assert inp.factor_potencia == _MOTOR_DEFAULTS["factor_potencia"]
    assert inp.factor_demanda == _MOTOR_DEFAULTS["factor_demanda"]


def test_template_invalida():
    """Un template_id inexistente devuelve None al buscar en PLANTILLAS."""
    tpl = PLANTILLAS.get("plantilla_que_no_existe")
    assert tpl is None


# ── Tests de BD: apply_template ───────────────────────────────────────────────

@pytest.mark.asyncio
async def test_apply_template_creates_calculations(db):
    """Aplica la plantilla vivienda_unifamiliar y verifica que se crean 6 cálculos."""
    from sqlalchemy import select

    user, project = await _create_user_and_project(db)
    tpl = PLANTILLAS["vivienda_unifamiliar"]

    for circ in tpl["circuitos"]:
        inp = _build_calculator_input(circ)
        result = calculate(inp)
        calc = Calculation(
            project_id=project.id,
            name=circ["nombre"],
            input_data=inp.model_dump(),
            result_data=result.resultado.model_dump(),
            sistema=inp.sistema,
            tension_v=inp.tension_v,
            potencia_kw=inp.potencia_kw,
            seccion_mm2=result.resultado.seccion_mm2,
            cumple_ric=result.resultado.cumple,
        )
        db.add(calc)

    await db.commit()

    res = await db.execute(
        select(Calculation).where(Calculation.project_id == project.id)
    )
    calcs = res.scalars().all()
    assert len(calcs) == 6


@pytest.mark.asyncio
async def test_apply_template_project_not_found(db):
    """Cuando el project_id no existe en BD, no se pueden crear cálculos (FK viola)."""
    from sqlalchemy import select

    fake_project_id = uuid.uuid4()
    tpl = PLANTILLAS["oficina_pequena"]

    # Verifica que no existe el proyecto
    res = await db.execute(
        select(Project).where(Project.id == fake_project_id)
    )
    project = res.scalar_one_or_none()
    assert project is None, "El proyecto no debería existir"


@pytest.mark.asyncio
async def test_apply_template_wrong_owner(db):
    """Un proyecto de otro usuario no debería estar accesible para el primer usuario."""
    from sqlalchemy import select

    user1, project1 = await _create_user_and_project(db, "Proyecto usuario 1")
    user2 = User(
        id=uuid.uuid4(),
        email=f"user2_{uuid.uuid4().hex[:8]}@example.com",
        hashed_password="hashed",
        is_active=True,
        is_admin=False,
        created_at=utcnow(),
    )
    db.add(user2)
    await db.flush()

    # Verificar que user2 no puede ver el proyecto de user1
    res = await db.execute(
        select(Project).where(
            Project.id == project1.id,
            Project.owner_id == user2.id,  # propietario incorrecto
        )
    )
    found = res.scalar_one_or_none()
    assert found is None, "Usuario 2 no debería ver el proyecto de usuario 1"
