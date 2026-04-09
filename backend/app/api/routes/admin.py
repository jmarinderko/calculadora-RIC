from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, cast, Date
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone, timedelta
import uuid

from app.db.session import get_session
from app.db.models import User, Project, Calculation, ConductorCatalog
from app.api.deps import get_current_admin

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class AdminStats(BaseModel):
    total_users: int
    total_projects: int
    total_calculations: int
    calculations_today: int
    calculations_week: int


class DailyCount(BaseModel):
    date: str   # YYYY-MM-DD
    count: int


class UsageCharts(BaseModel):
    calcs_last_14d: list[DailyCount]
    users_last_14d: list[DailyCount]
    calcs_by_sistema: dict[str, int]


class AdminUser(BaseModel):
    id: str
    email: str
    full_name: Optional[str]
    is_active: bool
    is_admin: bool
    created_at: datetime
    project_count: int


class AdminUserPatch(BaseModel):
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None


class ConductorOut(BaseModel):
    id: str
    proveedor: Optional[str]
    tipo: Optional[str]
    calibre_awg: Optional[str]
    seccion_mm2: Optional[float]
    material: Optional[str]
    resistencia_dc_20: Optional[float]
    i_max_ducto: Optional[int]
    i_max_aire: Optional[int]
    diametro_ext_mm: Optional[float]
    peso_kg_km: Optional[float]
    tension_nom_v: Optional[int]
    temp_max_c: Optional[int]
    norma_ref: Optional[str]
    certificacion_sec: bool
    activo: bool
    version_catalogo: Optional[str]


class ConductorCreate(BaseModel):
    proveedor: Optional[str] = None
    tipo: Optional[str] = None
    calibre_awg: Optional[str] = None
    seccion_mm2: Optional[float] = None
    material: Optional[str] = None
    resistencia_dc_20: Optional[float] = None
    i_max_ducto: Optional[int] = None
    i_max_aire: Optional[int] = None
    diametro_ext_mm: Optional[float] = None
    peso_kg_km: Optional[float] = None
    tension_nom_v: Optional[int] = None
    temp_max_c: Optional[int] = None
    norma_ref: Optional[str] = None
    certificacion_sec: bool = False
    activo: bool = True
    version_catalogo: Optional[str] = None


# ── Stats ─────────────────────────────────────────────────────────────────────

@router.get("/stats", response_model=AdminStats)
async def get_stats(
    db: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_admin),
):
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = now - timedelta(days=7)

    total_users = (await db.execute(select(func.count()).select_from(User))).scalar_one()
    total_projects = (await db.execute(select(func.count()).select_from(Project))).scalar_one()
    total_calcs = (await db.execute(select(func.count()).select_from(Calculation))).scalar_one()
    calcs_today = (await db.execute(
        select(func.count()).select_from(Calculation).where(Calculation.created_at >= today_start)
    )).scalar_one()
    calcs_week = (await db.execute(
        select(func.count()).select_from(Calculation).where(Calculation.created_at >= week_start)
    )).scalar_one()

    return AdminStats(
        total_users=total_users,
        total_projects=total_projects,
        total_calculations=total_calcs,
        calculations_today=calcs_today,
        calculations_week=calcs_week,
    )


# ── Charts ───────────────────────────────────────────────────────────────────

@router.get("/charts", response_model=UsageCharts)
async def get_charts(
    db: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_admin),
):
    now = datetime.now(timezone.utc)
    since_14d = now - timedelta(days=13)

    # Cálculos por día (últimos 14 días)
    calcs_rows = await db.execute(
        select(cast(Calculation.created_at, Date).label("day"), func.count().label("cnt"))
        .where(Calculation.created_at >= since_14d)
        .group_by("day")
        .order_by("day")
    )
    calcs_by_day = {str(r.day): r.cnt for r in calcs_rows.all()}

    # Usuarios registrados por día (últimos 14 días)
    users_rows = await db.execute(
        select(cast(User.created_at, Date).label("day"), func.count().label("cnt"))
        .where(User.created_at >= since_14d)
        .group_by("day")
        .order_by("day")
    )
    users_by_day = {str(r.day): r.cnt for r in users_rows.all()}

    # Rellenar días sin datos
    calcs_series, users_series = [], []
    for i in range(14):
        day = (now - timedelta(days=13 - i)).strftime("%Y-%m-%d")
        calcs_series.append(DailyCount(date=day, count=calcs_by_day.get(day, 0)))
        users_series.append(DailyCount(date=day, count=users_by_day.get(day, 0)))

    # Cálculos por tipo de sistema
    sistema_rows = await db.execute(
        select(Calculation.sistema, func.count().label("cnt"))
        .group_by(Calculation.sistema)
    )
    by_sistema = {r.sistema: r.cnt for r in sistema_rows.all()}

    return UsageCharts(
        calcs_last_14d=calcs_series,
        users_last_14d=users_series,
        calcs_by_sistema=by_sistema,
    )


# ── Usuarios ──────────────────────────────────────────────────────────────────

@router.get("/users", response_model=list[AdminUser])
async def list_users(
    db: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_admin),
    skip: int = 0,
    limit: int = 50,
):
    # Usuarios con conteo de proyectos
    result = await db.execute(
        select(User, func.count(Project.id).label("project_count"))
        .outerjoin(Project, Project.owner_id == User.id)
        .group_by(User.id)
        .order_by(desc(User.created_at))
        .offset(skip)
        .limit(limit)
    )
    rows = result.all()
    return [
        AdminUser(
            id=str(row.User.id),
            email=row.User.email,
            full_name=row.User.full_name,
            is_active=row.User.is_active,
            is_admin=row.User.is_admin,
            created_at=row.User.created_at,
            project_count=row.project_count,
        )
        for row in rows
    ]


@router.patch("/users/{user_id}", response_model=AdminUser)
async def update_user(
    user_id: str,
    body: AdminUserPatch,
    db: AsyncSession = Depends(get_session),
    current_admin: User = Depends(get_current_admin),
):
    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # No se puede desactivar a uno mismo
    if str(user.id) == str(current_admin.id) and body.is_active is False:
        raise HTTPException(status_code=400, detail="No puedes desactivar tu propia cuenta")

    if body.is_active is not None:
        user.is_active = body.is_active
    if body.is_admin is not None:
        user.is_admin = body.is_admin

    db.add(user)
    await db.commit()
    await db.refresh(user)

    proj_count = (await db.execute(
        select(func.count()).select_from(Project).where(Project.owner_id == user.id)
    )).scalar_one()

    return AdminUser(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active,
        is_admin=user.is_admin,
        created_at=user.created_at,
        project_count=proj_count,
    )


# ── Catálogo de conductores ───────────────────────────────────────────────────

@router.get("/catalog", response_model=list[ConductorOut])
async def list_catalog(
    db: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_admin),
    proveedor: Optional[str] = None,
    material: Optional[str] = None,
    activo: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100,
):
    q = select(ConductorCatalog)
    if proveedor:
        q = q.where(ConductorCatalog.proveedor.ilike(f"%{proveedor}%"))
    if material:
        q = q.where(ConductorCatalog.material == material)
    if activo is not None:
        q = q.where(ConductorCatalog.activo == activo)
    q = q.order_by(ConductorCatalog.proveedor, ConductorCatalog.seccion_mm2).offset(skip).limit(limit)

    result = await db.execute(q)
    rows = result.scalars().all()
    return [_conductor_out(r) for r in rows]


@router.post("/catalog", response_model=ConductorOut, status_code=201)
async def create_conductor(
    body: ConductorCreate,
    db: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_admin),
):
    conductor = ConductorCatalog(**body.model_dump())
    db.add(conductor)
    await db.commit()
    await db.refresh(conductor)
    return _conductor_out(conductor)


@router.put("/catalog/{conductor_id}", response_model=ConductorOut)
async def update_conductor(
    conductor_id: str,
    body: ConductorCreate,
    db: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_admin),
):
    result = await db.execute(select(ConductorCatalog).where(ConductorCatalog.id == uuid.UUID(conductor_id)))
    conductor = result.scalar_one_or_none()
    if not conductor:
        raise HTTPException(status_code=404, detail="Conductor no encontrado")

    for field, value in body.model_dump().items():
        setattr(conductor, field, value)

    db.add(conductor)
    await db.commit()
    await db.refresh(conductor)
    return _conductor_out(conductor)


@router.delete("/catalog/{conductor_id}", status_code=204)
async def delete_conductor(
    conductor_id: str,
    db: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_admin),
):
    result = await db.execute(select(ConductorCatalog).where(ConductorCatalog.id == uuid.UUID(conductor_id)))
    conductor = result.scalar_one_or_none()
    if not conductor:
        raise HTTPException(status_code=404, detail="Conductor no encontrado")

    conductor.activo = False  # soft delete
    db.add(conductor)
    await db.commit()


# ── Helper ────────────────────────────────────────────────────────────────────

def _conductor_out(c: ConductorCatalog) -> ConductorOut:
    return ConductorOut(
        id=str(c.id),
        proveedor=c.proveedor,
        tipo=c.tipo,
        calibre_awg=c.calibre_awg,
        seccion_mm2=float(c.seccion_mm2) if c.seccion_mm2 is not None else None,
        material=c.material,
        resistencia_dc_20=float(c.resistencia_dc_20) if c.resistencia_dc_20 is not None else None,
        i_max_ducto=c.i_max_ducto,
        i_max_aire=c.i_max_aire,
        diametro_ext_mm=float(c.diametro_ext_mm) if c.diametro_ext_mm is not None else None,
        peso_kg_km=float(c.peso_kg_km) if c.peso_kg_km is not None else None,
        tension_nom_v=c.tension_nom_v,
        temp_max_c=c.temp_max_c,
        norma_ref=c.norma_ref,
        certificacion_sec=c.certificacion_sec,
        activo=c.activo,
        version_catalogo=c.version_catalogo,
    )
