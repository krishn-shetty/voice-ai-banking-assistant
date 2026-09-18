import logging
import os

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.auth import router as auth_router
from app.api.calls import router as calls_router
from app.api.customers import router as customers_router
from app.api.livekit import router as livekit_router

load_dotenv()

logger = logging.getLogger("voice-banking-api")

app = FastAPI(
    title="AI Voice Banking Assistant API",
    version="1.0.0",
)

_cors_origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://localhost:5173",
)

CORS_ORIGINS = [origin.strip() for origin in _cors_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=[
        "Authorization",
        "Content-Type",
    ],
)

app.include_router(auth_router)
app.include_router(customers_router)
app.include_router(calls_router)
app.include_router(livekit_router)


@app.exception_handler(Exception)
async def unhandled_exception_handler(
    request: Request,
    exc: Exception,
):
    logger.exception(
        "Unhandled error on %s %s",
        request.method,
        request.url.path,
    )

    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
        },
    )


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "voice-banking-api",
    }
