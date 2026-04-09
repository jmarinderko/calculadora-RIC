"""Agregar campos de billing a tabla users

Revision ID: 002
Revises: 001
Create Date: 2026-04-09 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("plan_type", sa.String(20), nullable=False, server_default="free"))
    op.add_column("users", sa.Column("stripe_customer_id", sa.String(100), nullable=True, unique=True))
    op.add_column("users", sa.Column("stripe_subscription_id", sa.String(100), nullable=True, unique=True))
    op.add_column("users", sa.Column("subscription_status", sa.String(30), nullable=False, server_default="inactive"))


def downgrade() -> None:
    op.drop_column("users", "subscription_status")
    op.drop_column("users", "stripe_subscription_id")
    op.drop_column("users", "stripe_customer_id")
    op.drop_column("users", "plan_type")
