def calculate_risk(
    amount: float,
    sender_country: str,
    beneficiary_country: str
) -> dict:

    risk_score = 0
    reasons = []

    # Rule 1: Large transaction
    if amount > 5000:
        risk_score += 30
        reasons.append("High transaction amount")

    # Rule 2: Very large transaction
    if amount > 10000:
        risk_score += 30
        reasons.append("Very high transaction amount")

    # Rule 3: Cross-border transaction
    if sender_country != beneficiary_country:
        risk_score += 10
        reasons.append("Cross-border transaction")

    # Decide risk level
    if risk_score >= 50:
        risk_level = "HIGH"
        decision = "BLOCK"

    elif risk_score >= 25:
        risk_level = "MEDIUM"
        decision = "REVIEW"

    else:
        risk_level = "LOW"
        decision = "APPROVE"

    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "decision": decision,
        "reasons": reasons
    }