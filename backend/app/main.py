from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.routers.chat import router as chat_router
from app.routers.data import router as data_router
from app.routers.health import router as health_router

app = FastAPI(title=settings.app_name, version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(chat_router)
app.include_router(data_router)

# Optional static hosting for the UI when copied into backend/frontend_dist.
try:
    app.mount("/", StaticFiles(directory="frontend_dist", html=True), name="frontend")
except RuntimeError:
    pass
