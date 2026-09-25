from fastapi import FastAPI

from app.db.database import Base, engine
from app.models.transaction import Transaction
from app.api.payments import router as payment_router


Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="REMITX API",
    description="Programmable Cross-Border Payment Network",
    version="0.1.0"
)

app.include_router(payment_router)


@app.get("/")
def root():
    return {
        "project": "REMITX",
        "status": "running"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }
