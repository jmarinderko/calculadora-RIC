"""Campos de seguridad: password_changed_at + auth_provider en users

Revision ID: 004
Revises: 003
Create Date: 2026-05-06 12:00:00.000000

Motivación:
  - password_changed_at: invalidar JWTs emitidos antes de un cambio de
    password sin necesidad de blacklist en Redis.
  - auth_provider: distinguir cuentas Google (sin password real) de cuentas
    credentials para que /login rechace temprano y mensajes correctos.
"""
from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op


revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # password_changed_at — para usuarios existentes, defaulteamos a NOW()
    # para que sus JWT actuales sigan siendo válidos hasta su expiración.
    op.add_column(
        "users",
        sa.Column(
            "password_changed_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
    )
    # auth_provider — defaulteamos a 'credentials' para usuarios existentes.
    op.add_column(
        "users",
        sa.Column(
            "auth_provider",
            sa.String(length=20),
            nullable=False,
            server_default="credentials",
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "auth_provider")
    op.drop_column("users", "password_changed_at")
