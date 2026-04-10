"""Agregar share_token a tabla calculations

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
    op.add_column("calculations", sa.Column("share_token", sa.String(64), nullable=True, unique=True))
    op.create_index("ix_calculations_share_token", "calculations", ["share_token"])


def downgrade() -> None:
    op.drop_index("ix_calculations_share_token", "calculations")
    op.drop_column("calculations", "share_token")
