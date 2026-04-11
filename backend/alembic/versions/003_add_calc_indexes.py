"""Índices de performance en calculations y projects

Revision ID: 003
Revises: 002
Create Date: 2026-04-10 00:00:00.000000

Motivación:
  - Listado de cálculos por proyecto se ordena por created_at → sin índice cada
    listado hace full scan del rango de filas del proyecto.
  - Listado de proyectos del usuario filtra por owner_id y ordena por created_at.
  - Query agregada de cálculos por proyecto (LEFT JOIN) usa project_id.
"""
from typing import Sequence, Union
from alembic import op

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(
        "ix_calculations_project_created",
        "calculations",
        ["project_id", "created_at"],
    )
    op.create_index(
        "ix_projects_owner_created",
        "projects",
        ["owner_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_projects_owner_created", "projects")
    op.drop_index("ix_calculations_project_created", "calculations")
