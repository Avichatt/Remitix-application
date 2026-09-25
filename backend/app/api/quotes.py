from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator

from app.services.fx_service import calculate_fx


router = APIRouter(
    prefix="/api/v1/quotes",
    tags=["Quotes"]
)


class QuoteRequest(BaseModel):
    source_currency: str = Field(
        min_length=3,
        max_length=3
    )

    destination_currency: str = Field(
        min_length=3,
        max_length=3
    )

    amount: float = Field(
        gt=0,
        le=1_000_000
    )

    @field_validator(
        "source_currency",
        "destination_currency"
    )
    @classmethod
    def normalize_currency(
        cls,
        value: str
    ) -> str:

        return value.strip().upper()


class QuoteResponse(BaseModel):
    source_currency: str
    destination_currency: str

    source_amount: float

    fx_rate: float

    gross_amount: float
    fee: float
    recipient_amount: float

    rate_date: str | None
    rate_source: str


@router.post(
    "",
    response_model=QuoteResponse
)
def create_quote(
    request: QuoteRequest
):

    if (
        request.source_currency
        ==
        request.destination_currency
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Source and destination "
                "currencies must be different."
            )
        )

    try:

        fx_result = calculate_fx(
            source_currency=(
                request.source_currency
            ),
            destination_currency=(
                request.destination_currency
            ),
            amount=request.amount
        )

    except ValueError as error:

        raise HTTPException(
            status_code=400,
            detail=str(error)
        ) from error

    recipient_amount = (
        fx_result["final_amount"]
    )

    if recipient_amount <= 0:

        raise HTTPException(
            status_code=400,
            detail=(
                "The transfer amount is too "
                "small after fees."
            )
        )

    return {
        "source_currency": (
            fx_result[
                "source_currency"
            ]
        ),

        "destination_currency": (
            fx_result[
                "destination_currency"
            ]
        ),

        "source_amount": (
            request.amount
        ),

        "fx_rate": (
            fx_result["fx_rate"]
        ),

        "gross_amount": (
            fx_result["gross_amount"]
        ),

        "fee": (
            fx_result["fee"]
        ),

        "recipient_amount": (
            recipient_amount
        ),

        "rate_date": (
            fx_result["rate_date"]
        ),

        "rate_source": (
            fx_result["rate_source"]
        ),
    }