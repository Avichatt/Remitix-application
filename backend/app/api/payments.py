from fastapi import APIRouter, Depends, HTTPException

from pydantic import BaseModel, Field, field_validator

from sqlalchemy import func

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

    update_settlement_status,

    DrunixError

)





router = APIRouter(

    prefix="/api/v1/payments",

    tags=["Payments"]

)





# -------------------------------------------------

# REQUEST MODEL

# -------------------------------------------------



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





# -------------------------------------------------
# SETTLEMENT STATUS REQUEST MODEL
# -------------------------------------------------

class SettlementStatusRequest(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def normalize_status(cls, value: str) -> str:
        value = value.strip().upper()
        if not value:
            raise ValueError("Settlement status cannot be empty")
        return value


# -------------------------------------------------

# HELPER

# -------------------------------------------------



def serialize_transaction(

    transaction: Transaction

) -> dict:



    return {

        "transaction_id":

            transaction.id,



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

            ),



        "status":

            transaction.status,



        "risk_score":

            transaction.risk_score,



        "risk_level":

            transaction.risk_level,



        "risk_decision":

            transaction.risk_decision,



        "route_id":

            transaction.route_id,



        "drunix_status":

            transaction.drunix_status,



        "created_at":

            (

                transaction.created_at.isoformat()

                if transaction.created_at

                else None

            )

    }





# -------------------------------------------------

# CREATE PAYMENT

# -------------------------------------------------



@router.post("")

def create_payment(

    payment: PaymentRequest,

    db: Session = Depends(get_db)

):



    # ---------------------------------------------

    # FX

    # ---------------------------------------------



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





    # ---------------------------------------------

    # RISK

    # ---------------------------------------------



    risk = calculate_risk(

        payment.amount,

        payment.sender_country,

        payment.beneficiary_country

    )





    if risk["decision"] == "APPROVE":

        transaction_status = (

            "RISK_APPROVED"

        )



    elif risk["decision"] == "REVIEW":

        transaction_status = (

            "REVIEW_REQUIRED"

        )



    else:

        transaction_status = (

            "BLOCKED"

        )





    # ---------------------------------------------

    # ROUTING

    # ---------------------------------------------



    selected_route = None



    if risk["decision"] == "APPROVE":



        try:

            selected_route = (

                select_route()

            )



        except ValueError as error:

            raise HTTPException(

                status_code=503,

                detail=str(error)

            )





    route_id = None



    if selected_route:

        route_id = (

            selected_route["route_id"]

        )





    # ---------------------------------------------

    # SAVE TRANSACTION

    # ---------------------------------------------



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



        drunix_status=None

    )





    db.add(transaction)



    db.commit()



    db.refresh(transaction)





    # ---------------------------------------------

    # DRUNIX SUBMISSION

    # ---------------------------------------------



    drunix_settlement = None

    drunix_error = None





    if (

        risk["decision"] == "APPROVE"

        and

        selected_route is not None

    ):



        try:



            drunix_settlement = (

                create_settlement(

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

                        selected_route[

                            "route_id"

                        ]

                )

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





    # ---------------------------------------------

    # ROUTE RESPONSE

    # ---------------------------------------------



    route_information = None





    if selected_route:



        route_information = {

            "route_id":

                selected_route[

                    "route_id"

                ],



            "route_name":

                selected_route[

                    "name"

                ],



            "route_fee":

                selected_route[

                    "fee"

                ],



            "estimated_seconds":

                selected_route[

                    "estimated_seconds"

                ],



            "liquidity_score":

                selected_route[

                    "liquidity_score"

                ]

        }





    # ---------------------------------------------

    # DRUNIX RESPONSE

    # ---------------------------------------------



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





    # ---------------------------------------------

    # RESPONSE

    # ---------------------------------------------



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





# -------------------------------------------------

# LIST TRANSACTIONS

#

# IMPORTANT:

# This route must appear before /{transaction_id}.

# -------------------------------------------------



@router.get("")

def list_payments(

    limit: int = 50,

    db: Session = Depends(get_db)

):



    safe_limit = max(

        1,

        min(

            limit,

            100

        )

    )





    transactions = (

        db.query(Transaction)

        .order_by(

            Transaction.created_at.desc()

        )

        .limit(safe_limit)

        .all()

    )





    return {

        "count":

            len(transactions),



        "transactions": [

            serialize_transaction(

                transaction

            )

            for transaction

            in transactions

        ]

    }





# -------------------------------------------------

# DASHBOARD STATISTICS

#

# IMPORTANT:

# /stats must appear before /{transaction_id}.

# -------------------------------------------------



@router.get("/stats")

def get_payment_stats(

    db: Session = Depends(get_db)

):



    total_transactions = (

        db.query(

            func.count(

                Transaction.id

            )

        )

        .scalar()

        or 0

    )





    drunix_committed = (

        db.query(

            func.count(

                Transaction.id

            )

        )

        .filter(

            Transaction.status

            ==

            "DRUNIX_COMMITTED"

        )

        .scalar()

        or 0

    )





    review_required = (

        db.query(

            func.count(

                Transaction.id

            )

        )

        .filter(

            Transaction.status

            ==

            "REVIEW_REQUIRED"

        )

        .scalar()

        or 0

    )





    blocked = (

        db.query(

            func.count(

                Transaction.id

            )

        )

        .filter(

            Transaction.status

            ==

            "BLOCKED"

        )

        .scalar()

        or 0

    )





    submission_failed = (

        db.query(

            func.count(

                Transaction.id

            )

        )

        .filter(

            Transaction.status

            ==

            "DRUNIX_SUBMISSION_FAILED"

        )

        .scalar()

        or 0

    )





    approved_risk = (

        db.query(

            func.count(

                Transaction.id

            )

        )

        .filter(

            Transaction.risk_decision

            ==

            "APPROVE"

        )

        .scalar()

        or 0

    )





    return {

        "total_transactions":

            total_transactions,



        "drunix_committed":

            drunix_committed,



        "review_required":

            review_required,



        "blocked":

            blocked,



        "submission_failed":

            submission_failed,



        "risk_approved":

            approved_risk

    }





# -------------------------------------------------
# SETTLEMENT LIFECYCLE UPDATE
# Drunix is the authoritative settlement state.
# -------------------------------------------------

@router.put("/{transaction_id}/settlement-status")
def update_payment_settlement_status(
    transaction_id: str,
    request: SettlementStatusRequest,
    db: Session = Depends(get_db)
):
    transaction = (
        db.query(Transaction)
        .filter(Transaction.id == transaction_id)
        .first()
    )

    if transaction is None:
        raise HTTPException(status_code=404, detail="Transaction not found")

    if transaction.drunix_status is None or transaction.drunix_status == "SUBMISSION_FAILED":
        raise HTTPException(
            status_code=409,
            detail="This transaction does not have an active Drunix settlement."
        )

    try:
        current_settlement = get_settlement(transaction.id)
    except DrunixError as error:
        raise HTTPException(
            status_code=503,
            detail=f"Unable to read the authoritative Drunix settlement state: {error}"
        ) from error

    ledger_status = current_settlement.get("settlementStatus")
    known_statuses = {
        "DRUNIX_COMMITTED",
        "SETTLEMENT_PROCESSING",
        "SETTLED",
        "PAYOUT_COMPLETED",
        "SETTLEMENT_FAILED",
    }

    if ledger_status not in known_statuses:
        raise HTTPException(
            status_code=502,
            detail=f"Drunix returned an unknown settlement status: {ledger_status}"
        )

    reconciled = False
    if transaction.drunix_status != ledger_status or transaction.status != ledger_status:
        transaction.drunix_status = ledger_status
        transaction.status = ledger_status
        try:
            db.commit()
            db.refresh(transaction)
            reconciled = True
        except Exception as error:
            db.rollback()
            raise HTTPException(
                status_code=500,
                detail="Drunix state was read successfully, but PostgreSQL reconciliation failed."
            ) from error

    allowed_next_status = {
        "DRUNIX_COMMITTED": "SETTLEMENT_PROCESSING",
        "SETTLEMENT_PROCESSING": "SETTLED",
        "SETTLED": "PAYOUT_COMPLETED",
    }

    requested_status = request.status

    if ledger_status == "PAYOUT_COMPLETED":
        raise HTTPException(status_code=409, detail="This settlement is already completed.")

    if ledger_status == "SETTLEMENT_FAILED":
        raise HTTPException(
            status_code=409,
            detail="This settlement is in a failed state and cannot be advanced by this endpoint."
        )

    expected_status = allowed_next_status.get(ledger_status)
    if requested_status != expected_status:
        raise HTTPException(
            status_code=409,
            detail=(
                f"Invalid settlement transition. Drunix is currently '{ledger_status}'. "
                f"The next allowed status is '{expected_status}'."
            )
        )

    try:
        updated_settlement = update_settlement_status(
            transaction_id=transaction.id,
            status=requested_status
        )
    except DrunixError as error:
        raise HTTPException(
            status_code=503,
            detail=f"Drunix rejected the settlement status update: {error}"
        ) from error

    updated_ledger_status = updated_settlement.get("settlementStatus")
    if updated_ledger_status != requested_status:
        raise HTTPException(
            status_code=502,
            detail="Drunix returned an unexpected settlement status after the update."
        )

    transaction.drunix_status = updated_ledger_status
    transaction.status = updated_ledger_status
    try:
        db.commit()
        db.refresh(transaction)
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=(
                "Drunix accepted the status update, but PostgreSQL could not be synchronized. "
                "A later lifecycle request can reconcile the database from Drunix."
            )
        ) from error

    return {
        "success": True,
        "transaction_id": transaction.id,
        "previous_status": ledger_status,
        "status": transaction.status,
        "drunix_status": transaction.drunix_status,
        "reconciled_before_update": reconciled,
        "drunix": updated_settlement
    }


# -------------------------------------------------

# PAYMENT DETAIL

# -------------------------------------------------



@router.get("/{transaction_id}")

def get_payment(

    transaction_id: str,

    db: Session = Depends(get_db)

):



    transaction = (

        db.query(Transaction)

        .filter(

            Transaction.id

            ==

            transaction_id

        )

        .first()

    )





    if transaction is None:



        raise HTTPException(

            status_code=404,

            detail="Transaction not found"

        )





    return serialize_transaction(

        transaction

    )





# -------------------------------------------------

# PROOF OF SETTLEMENT

# -------------------------------------------------



@router.get("/{transaction_id}/proof")

def get_payment_proof(

    transaction_id: str,

    db: Session = Depends(get_db)

):



    transaction = (

        db.query(Transaction)

        .filter(

            Transaction.id

            ==

            transaction_id

        )

        .first()

    )





    if transaction is None:



        raise HTTPException(

            status_code=404,

            detail="Transaction not found"

        )





    # ---------------------------------------------

    # NOT SUBMITTED TO DRUNIX

    # ---------------------------------------------



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

                    "This transaction was "

                    "not submitted to Drunix."

                ),



            "settlement": None,



            "audit": {

                "event_count": 0,

                "events": []

            }

        }





    # ---------------------------------------------

    # SUBMISSION FAILED

    # ---------------------------------------------



    if (

        transaction.drunix_status

        ==

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





    # ---------------------------------------------

    # QUERY DRUNIX

    # ---------------------------------------------



    try:



        settlement = (

            get_settlement(

                transaction.id

            )

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





    history = (

        history_response.get(

            "history",

            []

        )

    )





    # ---------------------------------------------

    # VERIFY

    # ---------------------------------------------



    settlement_id_matches = (

        settlement.get(

            "transactionId"

        )

        ==

        transaction.id

    )





    audit_ids_match = all(

        event.get(

            "transactionId"

        )

        ==

        transaction.id



        for event

        in history

    )





    has_audit_events = (

        len(history) > 0

    )





    verified = (

        settlement_id_matches

        and

        audit_ids_match

        and

        has_audit_events

    )





    latest_event = None



    if history:

        latest_event = (

            history[-1]

        )





    # ---------------------------------------------

    # PROOF RESPONSE

    # ---------------------------------------------



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
