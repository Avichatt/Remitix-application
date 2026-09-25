from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.database import Base, engine
from app.models.transaction import Transaction

from app.api.payments import router as payment_router
from app.api.quotes import router as quote_router


# -------------------------------------------------
# DATABASE
# -------------------------------------------------

Base.metadata.create_all(
    bind=engine
)


# -------------------------------------------------
# FASTAPI APPLICATION
# -------------------------------------------------

app = FastAPI(
    title="REMITX API",
    description=(
        "Programmable Cross-Border "
        "Payment Network"
    ),
    version="0.1.0"
)


# -------------------------------------------------
# CORS
# -------------------------------------------------

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]


app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -------------------------------------------------
# API ROUTERS
# -------------------------------------------------

app.include_router(
    payment_router
)

app.include_router(
    quote_router
)


# -------------------------------------------------
# ROOT
# -------------------------------------------------

@app.get("/")
def root():

    return {
        "project": "REMITX",
        "status": "running"
    }


# -------------------------------------------------
# HEALTH
# -------------------------------------------------

@app.get("/health")
def health():

    return {
        "status": "healthy"
    }