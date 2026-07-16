import os
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from app.routes import upload
from app.routes import extract
from app.routes import collisions

# Load env variables from backend/.env if present
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger("speclens")

app = FastAPI(
    title="SpecLens AI API",
    description="FastAPI service for parsing documents and reviewing software projects.",
    version="1.0.0"
)

# CORS configuration — allow all origins for hackathon/local dev
# Use specific origins in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,   # Must be False when allow_origins=["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(upload.router, prefix="/api")
app.include_router(extract.router, prefix="/api")
app.include_router(collisions.router, prefix="/api")

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "SpecLens AI API Engine"
    }

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    tb = traceback.format_exc()
    logger.error(f"Unhandled exception on {request.method} {request.url}:\n{tb}")
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "stage": "Server",
            "error": str(exc),
            "trace": tb
        }
    )

if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("app.main:app", host=host, port=port, reload=True)
