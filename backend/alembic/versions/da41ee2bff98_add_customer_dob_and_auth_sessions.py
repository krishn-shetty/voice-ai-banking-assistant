"""add customer dob and auth sessions

Revision ID: da41ee2bff98
Revises: 5069ef43f3ae
Create Date: 2026-09-17
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "da41ee2bff98"
down_revision = "5069ef43f3ae"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "customers",
        sa.Column(
            "date_of_birth",
            sa.Date(),
            nullable=True,
        ),
    )

    op.create_table(
        "auth_sessions",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "customer_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "expires_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "revoked_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(
            ["customer_id"],
            ["customers.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "ix_auth_sessions_customer_id",
        "auth_sessions",
        ["customer_id"],
    )

    op.create_index(
        "ix_auth_sessions_expires_at",
        "auth_sessions",
        ["expires_at"],
    )

    op.create_index(
        "ix_auth_sessions_revoked_at",
        "auth_sessions",
        ["revoked_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_auth_sessions_revoked_at",
        table_name="auth_sessions",
    )

    op.drop_index(
        "ix_auth_sessions_expires_at",
        table_name="auth_sessions",
    )

    op.drop_index(
        "ix_auth_sessions_customer_id",
        table_name="auth_sessions",
    )

    op.drop_table("auth_sessions")

    op.drop_column(
        "customers",
        "date_of_birth",
    )