"""
AI-Powered Smart Research Repository - Backend Server
FastAPI application with RAG (Retrieval-Augmented Generation) architecture.
"""

import sys
import os

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.documents import router as documents_router
from routes.query import router as query_router
from services.database import init_db

# Initialize FastAPI app
app = FastAPI(
    title="AI-Powered Smart Research Repository",
    description="A RAG-based research assistant for PDF documents",
    version="1.0.0"
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(documents_router)
app.include_router(query_router)


@app.on_event("startup")
async def startup_event():
    """Initialize database on startup."""
    init_db()
    print("=" * 60)
    print("  AI-Powered Smart Research Repository")
    print("  RAG Backend Server Started")
    print("=" * 60)


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "research-repository-api"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
