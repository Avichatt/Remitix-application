ROUTES = [
    {
        "route_id": "ROUTE_A",
        "name": "Real-Time Payment Rail",
        "fee": 35.00,
        "estimated_seconds": 5,
        "liquidity_score": 95,
        "available": True
    },
    {
        "route_id": "ROUTE_B",
        "name": "Bank Settlement Rail",
        "fee": 25.00,
        "estimated_seconds": 60,
        "liquidity_score": 90,
        "available": True
    },
    {
        "route_id": "ROUTE_C",
        "name": "Alternative Settlement Rail",
        "fee": 20.00,
        "estimated_seconds": 180,
        "liquidity_score": 70,
        "available": False
    }
]


def select_route() -> dict:

    available_routes = [
        route
        for route in ROUTES
        if route["available"]
    ]

    if not available_routes:
        raise ValueError(
            "No payment route is currently available."
        )

    # Start with the first available route
    best_route = available_routes[0]

    # Compare available routes
    for route in available_routes[1:]:

        # Prefer faster route
        if route["estimated_seconds"] < best_route["estimated_seconds"]:
            best_route = route

        # If speed is equal, prefer lower fee
        elif (
            route["estimated_seconds"]
            == best_route["estimated_seconds"]
            and route["fee"] < best_route["fee"]
        ):
            best_route = route

    return best_route