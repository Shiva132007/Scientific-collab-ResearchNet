import os
import sys
from contextlib import asynccontextmanager

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.join(BASE_DIR, "src"))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from fastapi import WebSocket, WebSocketDisconnect
from routes import users, researcher, institution, department, publication, project, conference, collaboration, citation, audit, report, dashboard, notification, collaboration_request, search, ai
from websocket_manager import manager
import models
from database import init_db

load_dotenv(os.path.join(BASE_DIR, ".env"))

UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Scientific Collaboration Network Analyzer", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
    ],
    allow_credentials = True,
    allow_methods = ["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(researcher.router)
app.include_router(institution.router)
app.include_router(department.router)
app.include_router(publication.router)
app.include_router(project.router)
app.include_router(conference.router)
app.include_router(collaboration.router)
app.include_router(citation.router)
app.include_router(audit.router)
app.include_router(report.router)
app.include_router(dashboard.router)
app.include_router(notification.router)
app.include_router(collaboration_request.router)
app.include_router(search.router)
app.include_router(ai.router)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int):
    await manager.connect(websocket, user_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)


@app.get("/")
def root():
    return {"message" : "API running"}
