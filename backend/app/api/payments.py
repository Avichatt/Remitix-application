from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.transaction import Transaction

from app.services.fx_service import calculate_fx
from app.services.risk_service import calculate_risk
from app.services.routing_service import select_route
from app.services.drunix_service import (
    create_settlement,
    get_settlement,
    get_settlement_history,
    DrunixError
)


router = APIRouter(
    prefix="/api/v1/payments",
    tags=["Payments"]
)


class PaymentRequest(BaseModel):
    sender_country: str
    beneficiary_country: str
    source_currency: str
    amount: float = Field(
        gt=0,
        le=1000000
    )
    destination_currency: str

    @field_validator(
        "sender_country",
        "beneficiary_country",
        "source_currency",
        "destination_currency"
    )
    @classmethod
    def validate_text_fields(
        cls,
        value: str
    ) -> str:

        value = value.strip().upper()

        if not value:
            raise ValueError(
                "This field cannot be empty"
            )

        if not value.isalpha():
            raise ValueError(
                "This field must contain letters only"
            )

        return value

    @field_validator(
        "sender_country",
        "beneficiary_country"
    )
    @classmethod
    def validate_country(
        cls,
        value: str
    ) -> str:

        if len(value) != 2:
            raise ValueError(
                "Country code must contain exactly 2 letters"
            )

        return value

    @field_validator(
        "source_currency",
        "destination_currency"
    )
    @classmethod
    def validate_currency(
        cls,
        value: str
    ) -> str:

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

    # -------------------------------------------------
    # STEP 1: FX
    # -------------------------------------------------

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


    # -------------------------------------------------
    # STEP 2: Risk assessment
    # -------------------------------------------------

    risk = calculate_risk(
        payment.amount,
        payment.sender_country,
        payment.beneficiary_country
    )


    # -------------------------------------------------
    # STEP 3: Initial application status
    # -------------------------------------------------

    if risk["decision"] == "APPROVE":
        transaction_status = "RISK_APPROVED"

    elif risk["decision"] == "REVIEW":
        transaction_status = "REVIEW_REQUIRED"

    else:
        transaction_status = "BLOCKED"


    # -------------------------------------------------
    # STEP 4: Route selection
    #
    # Only approved transactions can receive a
    # settlement route.
    # -------------------------------------------------

    selected_route = None

    if risk["decision"] == "APPROVE":

        try:
            selected_route = select_route()

        except ValueError as error:
            raise HTTPException(
                status_code=503,
                detail=str(error)
            )


    route_id = None

    if selected_route:
        route_id = selected_route["route_id"]


    # -------------------------------------------------
    # STEP 5: Store transaction in PostgreSQL
    # -------------------------------------------------

    transaction = Transaction(
        sender_country=
            payment.sender_country,

        beneficiary_country=
            payment.beneficiary_country,

        source_currency=
            payment.source_currency,

        source_amount=
            payment.amount,

        destination_currency=
            payment.destination_currency,

        destination_amount=
            fx["final_amount"],

        fx_rate=
            fx["fx_rate"],

        fee=
            fx["fee"],

        status=
            transaction_status,

        risk_score=
            risk["risk_score"],

        risk_level=
            risk["risk_level"],

        risk_decision=
            risk["decision"],

        route_id=
            route_id,

        drunix_status=
            None
    )


    db.add(transaction)
    db.commit()
    db.refresh(transaction)


    # -------------------------------------------------
    # STEP 6: Drunix submission
    #
    # Only APPROVE transactions are submitted.
    # REVIEW/BLOCK remain off the settlement ledger.
    # -------------------------------------------------

    drunix_settlement = None
    drunix_error = None


    if (
        risk["decision"] == "APPROVE"
        and selected_route is not None
    ):

        try:

            drunix_settlement = create_settlement(
                transaction_id=
                    transaction.id,

                sender_country=
                    payment.sender_country,

                beneficiary_country=
                    payment.beneficiary_country,

                source_currency=
                    payment.source_currency,

                source_amount=
                    payment.amount,

                destination_currency=
                    payment.destination_currency,

                destination_amount=
                    fx["final_amount"],

                fx_rate=
                    fx["fx_rate"],

                risk_status=
                    "APPROVED",

                route_id=
                    selected_route["route_id"]
            )


            transaction.status = (
                "DRUNIX_COMMITTED"
            )

            transaction.drunix_status = (
                drunix_settlement.get(
                    "settlementStatus",
                    "DRUNIX_COMMITTED"
                )
            )

            db.commit()
            db.refresh(transaction)


        except DrunixError as error:

            transaction.status = (
                "DRUNIX_SUBMISSION_FAILED"
            )

            transaction.drunix_status = (
                "SUBMISSION_FAILED"
            )

            db.commit()
            db.refresh(transaction)

            drunix_error = str(error)


    # -------------------------------------------------
    # STEP 7: Route response
    # -------------------------------------------------

    route_information = None

    if selected_route:

        route_information = {
            "route_id":
                selected_route["route_id"],

            "route_name":
                selected_route["name"],

            "route_fee":
                selected_route["fee"],

            "estimated_seconds":
                selected_route[
                    "estimated_seconds"
                ],

            "liquidity_score":
                selected_route[
                    "liquidity_score"
                ]
        }


    # -------------------------------------------------
    # STEP 8: Drunix response
    # -------------------------------------------------

    drunix_information = {
        "submitted": False,
        "settlement": None,
        "error": None
    }


    if drunix_settlement:

        drunix_information = {
            "submitted": True,
            "settlement":
                drunix_settlement,
            "error": None
        }


    elif drunix_error:

        drunix_information = {
            "submitted": False,
            "settlement": None,
            "error":
                drunix_error
        }


    # -------------------------------------------------
    # STEP 9: API response
    # -------------------------------------------------

    return {
        "transaction_id":
            transaction.id,

        "source_amount":
            payment.amount,

        "source_currency":
            payment.source_currency,

        "destination_currency":
            payment.destination_currency,

        "fx_rate":
            fx["fx_rate"],

        "rate_date":
            fx["rate_date"],

        "rate_source":
            fx["rate_source"],

        "gross_amount":
            fx["gross_amount"],

        "fee":
            fx["fee"],

        "final_amount":
            fx["final_amount"],

        "status":
            transaction.status,

        "risk_score":
            transaction.risk_score,

        "risk_level":
            transaction.risk_level,

        "risk_decision":
            transaction.risk_decision,

        "risk_reasons":
            risk["reasons"],

        "selected_route":
            route_information,

        "drunix":
            drunix_information
    }


@router.get("/{transaction_id}/proof")
def get_payment_proof(
    transaction_id: str,
    db: Session = Depends(get_db)
):

    # -------------------------------------------------
    # STEP 1: Retrieve application transaction
    # -------------------------------------------------

    transaction = (
        db.query(Transaction)
        .filter(
            Transaction.id == transaction_id
        )
        .first()
    )


    if transaction is None:
        raise HTTPException(
            status_code=404,
            detail="Transaction not found"
        )


    # -------------------------------------------------
    # STEP 2: Only Drunix-submitted transactions
    # can have a ledger Proof of Settlement.
    # -------------------------------------------------

    if transaction.drunix_status is None:

        return {
            "verified": False,
            "transaction_id":
                transaction.id,

            "application_status":
                transaction.status,

            "risk_decision":
                transaction.risk_decision,

            "message":
                (
                    "This transaction was not "
                    "submitted to Drunix."
                ),

            "settlement": None,

            "audit": {
                "event_count": 0,
                "events": []
            }
        }


    if transaction.drunix_status == (
        "SUBMISSION_FAILED"
    ):

        return {
            "verified": False,

            "transaction_id":
                transaction.id,

            "application_status":
                transaction.status,

            "risk_decision":
                transaction.risk_decision,

            "message":
                (
                    "Drunix submission failed, "
                    "so no verified settlement "
                    "proof is available."
                ),

            "settlement": None,

            "audit": {
                "event_count": 0,
                "events": []
            }
        }


    # -------------------------------------------------
    # STEP 3: Retrieve authoritative Drunix state
    # -------------------------------------------------

    try:

        settlement = get_settlement(
            transaction.id
        )

        history_response = (
            get_settlement_history(
                transaction.id
            )
        )

    except DrunixError as error:

        raise HTTPException(
            status_code=503,
            detail=(
                "Unable to verify settlement "
                f"with Drunix: {error}"
            )
        )


    history = history_response.get(
        "history",
        []
    )


    # -------------------------------------------------
    # STEP 4: Verify basic consistency
    #
    # We check that:
    # - Drunix returned the same transaction ID
    # - at least one immutable audit event exists
    # - audit event transaction ID matches
    # -------------------------------------------------

    settlement_id_matches = (
        settlement.get(
            "transactionId"
        )
        ==
        transaction.id
    )


    audit_ids_match = all(
        event.get("transactionId")
        ==
        transaction.id
        for event in history
    )


    has_audit_events = (
        len(history) > 0
    )


    verified = (
        settlement_id_matches
        and audit_ids_match
        and has_audit_events
    )


    # -------------------------------------------------
    # STEP 5: Extract latest ledger event
    # -------------------------------------------------

    latest_event = None

    if history:
        latest_event = history[-1]


    # -------------------------------------------------
    # STEP 6: Build Proof of Settlement
    # -------------------------------------------------

    return {
        "verified":
            verified,

        "proof_type":
            "REMITX_DRUNIX_SETTLEMENT_PROOF",

        "transaction_id":
            transaction.id,

        "payment": {
            "sender_country":
                transaction.sender_country,

            "beneficiary_country":
                transaction.beneficiary_country,

            "source_currency":
                transaction.source_currency,

            "source_amount":
                float(
                    transaction.source_amount
                ),

            "destination_currency":
                transaction.destination_currency,

            "destination_amount":
                float(
                    transaction.destination_amount
                ),

            "fx_rate":
                float(
                    transaction.fx_rate
                ),

            "fee":
                float(
                    transaction.fee
                )
        },

        "risk": {
            "score":
                transaction.risk_score,

            "level":
                transaction.risk_level,

            "decision":
                transaction.risk_decision
        },

        "route": {
            "route_id":
                transaction.route_id
        },

        "application_status":
            transaction.status,

        "drunix": {
            "channel":
                "remitxchannel",

            "chaincode":
                "remitx-settlement",

            "settlement_status":
                settlement.get(
                    "settlementStatus"
                ),

            "event_sequence":
                settlement.get(
                    "eventSequence"
                ),

            "created_at":
                settlement.get(
                    "createdAt"
                ),

            "updated_at":
                settlement.get(
                    "updatedAt"
                )
        },

        "latest_ledger_event":
            latest_event,

        "audit": {
            "event_count":
                len(history),

            "events":
                history
        }
    }