import requests


FX_API_URL = "https://api.frankfurter.dev/v2/rate"

NETWORK_FEE = 35.00

REQUEST_TIMEOUT = 10


def get_latest_fx_rate(
    source_currency: str,
    destination_currency: str
) -> dict:

    source_currency = source_currency.upper()
    destination_currency = destination_currency.upper()

    # Same currency does not need an external API call
    if source_currency == destination_currency:
        return {
            "source_currency": source_currency,
            "destination_currency": destination_currency,
            "fx_rate": 1.0,
            "rate_date": None,
            "rate_source": "Same currency"
        }

    # Build the API URL
    api_url = (
        f"{FX_API_URL}/"
        f"{source_currency.lower()}/"
        f"{destination_currency.lower()}"
    )

    try:
        response = requests.get(
            api_url,
            timeout=REQUEST_TIMEOUT
        )

    except requests.RequestException as error:
        raise ValueError(
            "FX provider is currently unavailable. "
            "Please try again later."
        ) from error

    # Handle errors returned by the FX provider
    if response.status_code != 200:
        raise ValueError(
            f"Unable to retrieve FX rate for "
            f"{source_currency} to {destination_currency}"
        )

    try:
        data = response.json()

    except ValueError as error:
        raise ValueError(
            "FX provider returned an invalid response."
        ) from error

    # Extract the latest rate
    fx_rate = data.get("rate")
    rate_date = data.get("date")

    if fx_rate is None:
        raise ValueError(
            "FX provider did not return a valid exchange rate."
        )

    return {
        "source_currency": source_currency,
        "destination_currency": destination_currency,
        "fx_rate": float(fx_rate),
        "rate_date": rate_date,
        "rate_source": "Frankfurter API"
    }


def calculate_fx(
    source_currency: str,
    destination_currency: str,
    amount: float
) -> dict:

    # Step 1: Fetch latest FX rate
    fx_data = get_latest_fx_rate(
        source_currency,
        destination_currency
    )

    fx_rate = fx_data["fx_rate"]

    # Step 2: Calculate converted amount
    gross_amount = amount * fx_rate

    # Step 3: Apply network fee
    final_amount = gross_amount - NETWORK_FEE

    # Step 4: Return complete FX information
    return {
        "source_currency": fx_data["source_currency"],
        "destination_currency": fx_data["destination_currency"],
        "fx_rate": fx_rate,
        "rate_date": fx_data["rate_date"],
        "rate_source": fx_data["rate_source"],
        "gross_amount": round(gross_amount, 2),
        "fee": NETWORK_FEE,
        "final_amount": round(final_amount, 2)
    }