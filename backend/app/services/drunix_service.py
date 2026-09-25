import requests


DRUNIX_GATEWAY_URL = (
    "http://127.0.0.1:3001"
)

REQUEST_TIMEOUT = 30


ALLOWED_SETTLEMENT_STATUSES = {
    "DRUNIX_COMMITTED",
    "SETTLEMENT_PROCESSING",
    "SETTLED",
    "PAYOUT_COMPLETED",
    "SETTLEMENT_FAILED",
}


class DrunixError(Exception):
    """
    Raised when communication
    with Drunix fails.
    """


# -------------------------------------------------
# CREATE SETTLEMENT
# -------------------------------------------------

def create_settlement(
    transaction_id: str,
    sender_country: str,
    beneficiary_country: str,
    source_currency: str,
    source_amount: float,
    destination_currency: str,
    destination_amount: float,
    fx_rate: float,
    risk_status: str,
    route_id: str
) -> dict:

    payload = {
        "transactionId":
            transaction_id,

        "senderCountry":
            sender_country,

        "beneficiaryCountry":
            beneficiary_country,

        "sourceCurrency":
            source_currency,

        "sourceAmount":
            float(source_amount),

        "destinationCurrency":
            destination_currency,

        "destinationAmount":
            float(destination_amount),

        "fxRate":
            float(fx_rate),

        "riskStatus":
            risk_status,

        "routeId":
            route_id
    }


    try:

        response = requests.post(
            (
                f"{DRUNIX_GATEWAY_URL}"
                "/api/drunix/settlements"
            ),
            json=payload,
            timeout=REQUEST_TIMEOUT
        )

    except requests.RequestException as error:

        raise DrunixError(
            "Unable to connect to the "
            "REMITX Drunix Gateway."
        ) from error


    data = _read_json_response(
        response
    )


    if response.status_code not in (
        200,
        201
    ):

        raise DrunixError(
            data.get(
                "error",
                (
                    "Drunix settlement "
                    "submission failed."
                )
            )
        )


    if not data.get("success"):

        raise DrunixError(
            data.get(
                "error",
                (
                    "Drunix settlement "
                    "submission failed."
                )
            )
        )


    settlement = data.get(
        "settlement"
    )


    if not settlement:

        raise DrunixError(
            (
                "Drunix Gateway did not "
                "return settlement data."
            )
        )


    return settlement


# -------------------------------------------------
# GET SETTLEMENT
# -------------------------------------------------

def get_settlement(
    transaction_id: str
) -> dict:

    try:

        response = requests.get(
            (
                f"{DRUNIX_GATEWAY_URL}"
                "/api/drunix/settlements/"
                f"{transaction_id}"
            ),
            timeout=REQUEST_TIMEOUT
        )

    except requests.RequestException as error:

        raise DrunixError(
            "Unable to connect to the "
            "REMITX Drunix Gateway."
        ) from error


    data = _read_json_response(
        response
    )


    if response.status_code != 200:

        raise DrunixError(
            data.get(
                "error",
                (
                    "Unable to retrieve "
                    "settlement from Drunix."
                )
            )
        )


    if not data.get("success"):

        raise DrunixError(
            data.get(
                "error",
                (
                    "Unable to retrieve "
                    "settlement from Drunix."
                )
            )
        )


    settlement = data.get(
        "settlement"
    )


    if not settlement:

        raise DrunixError(
            (
                "Drunix Gateway did not "
                "return settlement data."
            )
        )


    return settlement


# -------------------------------------------------
# GET SETTLEMENT HISTORY
# -------------------------------------------------

def get_settlement_history(
    transaction_id: str
) -> dict:

    try:

        response = requests.get(
            (
                f"{DRUNIX_GATEWAY_URL}"
                "/api/drunix/settlements/"
                f"{transaction_id}"
                "/history"
            ),
            timeout=REQUEST_TIMEOUT
        )

    except requests.RequestException as error:

        raise DrunixError(
            "Unable to connect to the "
            "REMITX Drunix Gateway."
        ) from error


    data = _read_json_response(
        response
    )


    if response.status_code != 200:

        raise DrunixError(
            data.get(
                "error",
                (
                    "Unable to retrieve "
                    "Drunix settlement history."
                )
            )
        )


    if not data.get("success"):

        raise DrunixError(
            data.get(
                "error",
                (
                    "Unable to retrieve "
                    "Drunix settlement history."
                )
            )
        )


    return data


# -------------------------------------------------
# UPDATE SETTLEMENT STATUS
# -------------------------------------------------

def update_settlement_status(
    transaction_id: str,
    status: str
) -> dict:

    normalized_status = (
        status
        .strip()
        .upper()
    )


    if (
        normalized_status
        not in
        ALLOWED_SETTLEMENT_STATUSES
    ):

        raise DrunixError(
            (
                "Invalid settlement status: "
                f"{normalized_status}"
            )
        )


    payload = {
        "status":
            normalized_status
    }


    try:

        response = requests.put(
            (
                f"{DRUNIX_GATEWAY_URL}"
                "/api/drunix/settlements/"
                f"{transaction_id}"
                "/status"
            ),
            json=payload,
            timeout=REQUEST_TIMEOUT
        )

    except requests.RequestException as error:

        raise DrunixError(
            "Unable to connect to the "
            "REMITX Drunix Gateway."
        ) from error


    data = _read_json_response(
        response
    )


    if response.status_code != 200:

        raise DrunixError(
            data.get(
                "error",
                (
                    "Unable to update "
                    "Drunix settlement status."
                )
            )
        )


    if not data.get("success"):

        raise DrunixError(
            data.get(
                "error",
                (
                    "Unable to update "
                    "Drunix settlement status."
                )
            )
        )


    settlement = data.get(
        "settlement"
    )


    if not settlement:

        raise DrunixError(
            (
                "Drunix Gateway did not "
                "return the updated settlement."
            )
        )


    return settlement


# -------------------------------------------------
# JSON RESPONSE HELPER
# -------------------------------------------------

def _read_json_response(
    response: requests.Response
) -> dict:

    try:

        return response.json()

    except ValueError as error:

        raise DrunixError(
            (
                "Drunix Gateway returned "
                "an invalid response."
            )
        ) from error