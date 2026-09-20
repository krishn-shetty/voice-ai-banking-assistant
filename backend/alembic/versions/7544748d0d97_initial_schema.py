"""initial schema

Revision ID: 7544748d0d97
Revises:
Create Date: 2026-09-15 16:38:54.060272
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "7544748d0d97"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create the initial database schema."""

    # ------------------------------------------------------------------
    # customers
    # ------------------------------------------------------------------
    op.create_table(
        "customers",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "full_name",
            sa.String(length=150),
            nullable=False,
        ),
        sa.Column(
            "email",
            sa.String(length=255),
            nullable=False,
        ),
        sa.Column(
            "phone_number",
            sa.String(length=20),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=False),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
        sa.UniqueConstraint("phone_number"),
    )

    op.create_index(
        "ix_customers_email",
        "customers",
        ["email"],
        unique=False,
    )

    op.create_index(
        "ix_customers_phone_number",
        "customers",
        ["phone_number"],
        unique=False,
    )

    # ------------------------------------------------------------------
    # accounts
    # ------------------------------------------------------------------
    op.create_table(
        "accounts",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "account_id",
            sa.String(length=20),
            nullable=False,
        ),
        sa.Column(
            "balance",
            sa.Numeric(12, 2),
            nullable=False,
        ),
        sa.Column(
            "customer_id",
            sa.Uuid(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["customer_id"],
            ["customers.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("account_id"),
    )

    op.create_index(
        "ix_accounts_account_id",
        "accounts",
        ["account_id"],
        unique=False,
    )

    op.create_index(
        "ix_accounts_customer_id",
        "accounts",
        ["customer_id"],
        unique=False,
    )

    # ------------------------------------------------------------------
    # loans
    # ------------------------------------------------------------------
    op.create_table(
        "loans",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "emi_due_date",
            sa.Date(),
            nullable=False,
        ),
        sa.Column(
            "emi_amount",
            sa.Numeric(12, 2),
            nullable=False,
        ),
        sa.Column(
            "loan_status",
            sa.String(length=20),
            nullable=False,
        ),
        sa.Column(
            "customer_id",
            sa.Uuid(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["customer_id"],
            ["customers.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "ix_loans_customer_id",
        "loans",
        ["customer_id"],
        unique=False,
    )

    # ------------------------------------------------------------------
    # calls
    # ------------------------------------------------------------------
    op.create_table(
        "calls",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "customer_id",
            sa.Uuid(),
            nullable=False,
        ),
        sa.Column(
            "transcript",
            sa.String(),
            nullable=True,
        ),
        sa.Column(
            "summary_json",
            sa.JSON(),
            nullable=True,
        ),
        sa.Column(
            "outcome",
            sa.String(length=50),
            nullable=False,
        ),
        sa.Column(
            "escalated",
            sa.Boolean(),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["customer_id"],
            ["customers.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "ix_calls_customer_id",
        "calls",
        ["customer_id"],
        unique=False,
    )

    # ------------------------------------------------------------------
    # payment_promises
    # ------------------------------------------------------------------
    op.create_table(
        "payment_promises",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "call_id",
            sa.Uuid(),
            nullable=False,
        ),
        sa.Column(
            "customer_id",
            sa.Uuid(),
            nullable=False,
        ),
        sa.Column(
            "promised_amount",
            sa.Numeric(12, 2),
            nullable=False,
        ),
        sa.Column(
            "promised_date",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["call_id"],
            ["calls.id"],
        ),
        sa.ForeignKeyConstraint(
            ["customer_id"],
            ["customers.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "ix_payment_promises_call_id",
        "payment_promises",
        ["call_id"],
        unique=False,
    )

    op.create_index(
        "ix_payment_promises_customer_id",
        "payment_promises",
        ["customer_id"],
        unique=False,
    )


def downgrade() -> None:
    """Drop the initial database schema."""

    op.drop_index(
        "ix_payment_promises_customer_id",
        table_name="payment_promises",
    )

    op.drop_index(
        "ix_payment_promises_call_id",
        table_name="payment_promises",
    )

    op.drop_table("payment_promises")

    op.drop_index(
        "ix_calls_customer_id",
        table_name="calls",
    )

    op.drop_table("calls")

    op.drop_index(
        "ix_loans_customer_id",
        table_name="loans",
    )

    op.drop_table("loans")

    op.drop_index(
        "ix_accounts_customer_id",
        table_name="accounts",
    )

    op.drop_index(
        "ix_accounts_account_id",
        table_name="accounts",
    )

    op.drop_table("accounts")

    op.drop_index(
        "ix_customers_phone_number",
        table_name="customers",
    )

    op.drop_index(
        "ix_customers_email",
        table_name="customers",
    )

    op.drop_table("customers")