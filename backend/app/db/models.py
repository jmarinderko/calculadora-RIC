import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import (
    String, Integer, Float, Boolean, DateTime, Text, ForeignKey,
    Numeric, JSON
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.db.base import Base


def utcnow():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[Optional[str]] = mapped_column(String(200))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    projects: Mapped[list["Project"]] = relationship("Project", back_populates="owner", cascade="all, delete-orphan")


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    location: Mapped[Optional[str]] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    owner: Mapped["User"] = relationship("User", back_populates="projects")
    calculations: Mapped[list["Calculation"]] = relationship("Calculation", back_populates="project", cascade="all, delete-orphan")


class Calculation(Base):
    __tablename__ = "calculations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True)
    name: Mapped[Optional[str]] = mapped_column(String(200))

    # Inputs y outputs serializados como JSON
    input_data: Mapped[dict] = mapped_column(JSON, nullable=False)
    result_data: Mapped[dict] = mapped_column(JSON, nullable=False)

    # Campos clave para KPIs y búsqueda rápida
    sistema: Mapped[str] = mapped_column(String(20))
    tension_v: Mapped[float] = mapped_column(Float)
    potencia_kw: Mapped[float] = mapped_column(Float)
    seccion_mm2: Mapped[float] = mapped_column(Float)
    cumple_ric: Mapped[bool] = mapped_column(Boolean)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    share_token: Mapped[Optional[str]] = mapped_column(String(64), unique=True, nullable=True, index=True)

    project: Mapped["Project"] = relationship("Project", back_populates="calculations")


class ConductorCatalog(Base):
    """Espejo del catálogo de conductores cargado por seed_proveedores.sql."""
    __tablename__ = "conductores_catalogo"
    __table_args__ = {"extend_existing": True}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    proveedor: Mapped[Optional[str]] = mapped_column(String(100))
    tipo: Mapped[Optional[str]] = mapped_column(String(60))
    calibre_awg: Mapped[Optional[str]] = mapped_column(String(20))
    seccion_mm2: Mapped[Optional[float]] = mapped_column(Numeric(8, 2))
    material: Mapped[Optional[str]] = mapped_column(String(2))
    resistencia_dc_20: Mapped[Optional[float]] = mapped_column(Numeric(10, 4))
    i_max_ducto: Mapped[Optional[int]] = mapped_column(Integer)
    i_max_aire: Mapped[Optional[int]] = mapped_column(Integer)
    diametro_ext_mm: Mapped[Optional[float]] = mapped_column(Numeric(6, 2))
    peso_kg_km: Mapped[Optional[float]] = mapped_column(Numeric(8, 2))
    tension_nom_v: Mapped[Optional[int]] = mapped_column(Integer)
    temp_max_c: Mapped[Optional[int]] = mapped_column(Integer)
    norma_ref: Mapped[Optional[str]] = mapped_column(String(40))
    certificacion_sec: Mapped[bool] = mapped_column(Boolean, default=False)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    version_catalogo: Mapped[Optional[str]] = mapped_column(String(20))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    calculation_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("calculations.id"), nullable=False)
    pdf_url: Mapped[Optional[str]] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
