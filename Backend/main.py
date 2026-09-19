import os
import sys
from contextlib import asynccontextmanager

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.join(BASE_DIR, "src"))

from fastapi import FastAPI, Request, Response, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

from routes import users, researcher, institution, department, publication, project, conference, collaboration, citation, audit, report, dashboard, notification, collaboration_request, search, ai
from websocket_manager import manager
import models
from database import init_db

load_dotenv(os.path.join(BASE_DIR, ".env"))

UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        init_db()
    except Exception as e:
        print(f"Database initialization log: {e}")
    yield


app = FastAPI(title="Scientific Collaboration Network Analyzer", lifespan=lifespan)

@app.middleware("http")
async def custom_cors_middleware(request: Request, call_next):
    origin = request.headers.get("origin")
    
    if request.method == "OPTIONS":
        response = Response(status_code=204)
    else:
        try:
            response = await call_next(request)
        except Exception as exc:
            response = JSONResponse(
                status_code=500,
                content={"detail": f"Internal Server Error: {str(exc)}"},
            )
            
    if origin:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "*"
        
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
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
    return {"message": "API running"}
