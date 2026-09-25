import requests


DRUNIX_GATEWAY_URL = "http://127.0.0.1:3001"

REQUEST_TIMEOUT = 30


class DrunixError(Exception):
    """Raised when communication with Drunix fails."""


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
    """
    Submit an approved REMITX settlement to the
    Drunix Gateway.

    The Node.js Gateway signs and submits the
    transaction to the Drunix network.
    """

    payload = {
        "transactionId": transaction_id,
        "senderCountry": sender_country,
        "beneficiaryCountry": beneficiary_country,
        "sourceCurrency": source_currency,
        "sourceAmount": float(source_amount),
        "destinationCurrency": destination_currency,
        "destinationAmount": float(destination_amount),
        "fxRate": float(fx_rate),
        "riskStatus": risk_status,
        "routeId": route_id
    }

    try:
        response = requests.post(
            f"{DRUNIX_GATEWAY_URL}/api/drunix/settlements",
            json=payload,
            timeout=REQUEST_TIMEOUT
        )

    except requests.RequestException as error:
        raise DrunixError(
            "Unable to connect to the REMITX Drunix Gateway."
        ) from error

    try:
        data = response.json()

    except ValueError as error:
        raise DrunixError(
            "Drunix Gateway returned an invalid response."
        ) from error

    if response.status_code not in (200, 201):
        error_message = data.get(
            "error",
            "Drunix settlement submission failed."
        )

        raise DrunixError(
            error_message
        )

    if not data.get("success"):
        raise DrunixError(
            data.get(
                "error",
                "Drunix settlement submission failed."
            )
        )

    settlement = data.get("settlement")

    if not settlement:
        raise DrunixError(
            "Drunix Gateway did not return settlement data."
        )

    return settlement


def get_settlement(
    transaction_id: str
) -> dict:
    """
    Retrieve the current settlement state
    from Drunix.
    """

    try:
        response = requests.get(
            (
                f"{DRUNIX_GATEWAY_URL}"
                f"/api/drunix/settlements/"
                f"{transaction_id}"
            ),
            timeout=REQUEST_TIMEOUT
        )

    except requests.RequestException as error:
        raise DrunixError(
            "Unable to connect to the REMITX Drunix Gateway."
        ) from error

    try:
        data = response.json()

    except ValueError as error:
        raise DrunixError(
            "Drunix Gateway returned an invalid response."
        ) from error

    if response.status_code != 200:
        raise DrunixError(
            data.get(
                "error",
                "Unable to retrieve settlement from Drunix."
            )
        )

    if not data.get("success"):
        raise DrunixError(
            data.get(
                "error",
                "Unable to retrieve settlement from Drunix."
            )
        )

    return data["settlement"]


def get_settlement_history(
    transaction_id: str
) -> dict:
    """
    Retrieve the immutable REMITX audit events
    stored on Drunix.
    """

    try:
        response = requests.get(
            (
                f"{DRUNIX_GATEWAY_URL}"
                f"/api/drunix/settlements/"
                f"{transaction_id}/history"
            ),
            timeout=REQUEST_TIMEOUT
        )

    except requests.RequestException as error:
        raise DrunixError(
            "Unable to connect to the REMITX Drunix Gateway."
        ) from error

    try:
        data = response.json()

    except ValueError as error:
        raise DrunixError(
            "Drunix Gateway returned an invalid response."
        ) from error

    if response.status_code != 200:
        raise DrunixError(
            data.get(
                "error",
                "Unable to retrieve Drunix settlement history."
            )
        )

    if not data.get("success"):
        raise DrunixError(
            data.get(
                "error",
                "Unable to retrieve Drunix settlement history."
            )
        )

    return data