import uuid

from sqlalchemy import (
    String,
    Numeric,
    DateTime,
    Integer
)
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.db.database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )

    sender_country: Mapped[str] = mapped_column(
        String(10)
    )

    beneficiary_country: Mapped[str] = mapped_column(
        String(10)
    )

    source_currency: Mapped[str] = mapped_column(
        String(10)
    )

    source_amount: Mapped[float] = mapped_column(
        Numeric(18, 2)
    )

    destination_currency: Mapped[str] = mapped_column(
        String(10)
    )

    destination_amount: Mapped[float] = mapped_column(
        Numeric(18, 2)
    )

    fx_rate: Mapped[float] = mapped_column(
        Numeric(18, 6)
    )

    fee: Mapped[float] = mapped_column(
        Numeric(18, 2)
    )

    status: Mapped[str] = mapped_column(
        String(30),
        default="CREATED"
    )

    risk_score: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True
    )

    risk_level: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True
    )

    risk_decision: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True
    )

    route_id: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True
    )

    drunix_status: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True
    )

    created_at: Mapped[DateTime] = mapped_column(
        DateTime,
        server_default=func.now()
    )