from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.transaction import Transaction
from app.services.fx_service import calculate_fx
from app.services.risk_service import calculate_risk
from app.services.routing_service import select_route


router = APIRouter(
    prefix="/api/v1/payments",
    tags=["Payments"]
)


class PaymentRequest(BaseModel):
    sender_country: str
    beneficiary_country: str
    source_currency: str
    amount: float = Field(gt=0, le=1000000)
    destination_currency: str

    @field_validator(
        "sender_country",
        "beneficiary_country",
        "source_currency",
        "destination_currency"
    )
    @classmethod
    def validate_text_fields(cls, value: str) -> str:

        value = value.strip().upper()

        if not value:
            raise ValueError("This field cannot be empty")

        if not value.isalpha():
            raise ValueError(
                "This field must contain letters only"
            )

        return value

    @field_validator("sender_country", "beneficiary_country")
    @classmethod
    def validate_country(cls, value: str) -> str:

        if len(value) != 2:
            raise ValueError(
                "Country code must contain exactly 2 letters"
            )

        return value

    @field_validator("source_currency", "destination_currency")
    @classmethod
    def validate_currency(cls, value: str) -> str:

        if len(value) != 3:
            raise ValueError(
                "Currency code must contain exactly 3 letters"
            )

        return value


@router.post("")
def create_payment(
    payment: PaymentRequest,
    db: Session = Depends(get_db)
):
    # Step 1: Calculate FX
    try:
        fx = calculate_fx(
            payment.source_currency,
            payment.destination_currency,
            payment.amount
        )

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        )

    # Step 2: Calculate risk
    risk = calculate_risk(
        payment.amount,
        payment.sender_country,
        payment.beneficiary_country
    )

    # Step 3: Decide transaction status
    if risk["decision"] == "APPROVE":
        transaction_status = "RISK_APPROVED"

    elif risk["decision"] == "REVIEW":
        transaction_status = "REVIEW_REQUIRED"

    else:
        transaction_status = "BLOCKED"

    # Step 4: Routing
    selected_route = None

    if risk["decision"] == "APPROVE":

        try:
            selected_route = select_route()

        except ValueError as error:
            raise HTTPException(
                status_code=503,
                detail=str(error)
            )

    # Step 5: Create transaction
    transaction = Transaction(
        sender_country=payment.sender_country,
        beneficiary_country=payment.beneficiary_country,
        source_currency=payment.source_currency,
        source_amount=payment.amount,
        destination_currency=payment.destination_currency,
        destination_amount=fx["final_amount"],
        fx_rate=fx["fx_rate"],
        fee=fx["fee"],
        status=transaction_status
    )

    # Step 6: Save transaction
    db.add(transaction)
    db.commit()
    db.refresh(transaction)

    # Step 7: Prepare route information
    route_information = None

    if selected_route:
        route_information = {
            "route_id": selected_route["route_id"],
            "route_name": selected_route["name"],
            "route_fee": selected_route["fee"],
            "estimated_seconds": selected_route["estimated_seconds"],
            "liquidity_score": selected_route["liquidity_score"]
        }

    # Step 8: Return complete payment result
    return {
        "transaction_id": transaction.id,

        "source_amount": payment.amount,
        "source_currency": payment.source_currency,

        "destination_currency": payment.destination_currency,

        "fx_rate": fx["fx_rate"],
        "rate_date": fx["rate_date"],
        "rate_source": fx["rate_source"],
        "gross_amount": fx["gross_amount"],
        "fee": fx["fee"],
        "final_amount": fx["final_amount"],

        "status": transaction.status,

        "risk_score": risk["risk_score"],
        "risk_level": risk["risk_level"],
        "risk_decision": risk["decision"],
        "risk_reasons": risk["reasons"],

        "selected_route": route_information
    }