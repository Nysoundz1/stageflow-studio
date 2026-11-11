import os
import re
import uuid
import shutil
from typing import Dict, List, Any, Optional
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from audio_generator import (
    build_default_songs,
    analyze_and_separate_upload,
    render_arrangement_export,
    LIBROSA_AVAILABLE,
    DEMUCS_AVAILABLE,
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STORAGE_DIR = os.path.join(BASE_DIR, "storage", "stems")
UPLOADS_DIR = os.path.join(BASE_DIR, "storage", "uploads")
EXPORTS_DIR = os.path.join(BASE_DIR, "storage", "exports")

os.makedirs(STORAGE_DIR, exist_ok=True)
os.makedirs(UPLOADS_DIR, exist_ok=True)
os.makedirs(EXPORTS_DIR, exist_ok=True)

app = FastAPI(
    title="StageFlow Studio Audio AI & Stem Engine",
    description="AI 6-Stem Separator (HTDemucs / Librosa), Beat-Grid & Structural Section Analyzer, and Block Arrangement Renderer",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory catalog initialized on startup with our 3 studio-grade multi-stem demo songs
SONGS_DB: Dict[str, Dict[str, Any]] = {}


@app.on_event("startup")
def startup_initialize_demo_songs():
    global SONGS_DB
    SONGS_DB = build_default_songs(STORAGE_DIR)


# Mount static directories so frontend Web Audio API can fetch /stems/... and /exports/...
app.mount("/stems", StaticFiles(directory=STORAGE_DIR), name="stems")
app.mount("/exports", StaticFiles(directory=EXPORTS_DIR), name="exports")


class ExportBlockItem(BaseModel):
    id: str
    label: str
    type: str
    startBar: int
    lengthBars: int
    startTime: float
    duration: float
    activeStems: Dict[str, bool]


class ExportStemState(BaseModel):
    volume: float = 0.85
    pan: float = 0.0
    muted: bool = False
    soloed: bool = False


class ExportArrangementRequest(BaseModel):
    songId: str
    blocks: List[ExportBlockItem]
    stems: Dict[str, ExportStemState]
    pitchSemitones: Optional[int] = 0
    tempoScale: Optional[float] = 1.0


@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "service": "StageFlow Studio Audio Engine",
        "librosaAvailable": LIBROSA_AVAILABLE,
        "demucsAvailable": DEMUCS_AVAILABLE,
        "fallbackSynthesizerReady": True,
        "loadedSongsCount": len(SONGS_DB),
    }


@app.get("/api/songs")
def list_songs():
    if not SONGS_DB:
        startup_initialize_demo_songs()
    return {
        "songs": list(SONGS_DB.values()),
        "defaultSongId": "neon-horizon",
    }


@app.get("/api/songs/{song_id}")
def get_song(song_id: str):
    if not SONGS_DB:
        startup_initialize_demo_songs()
    if song_id not in SONGS_DB:
        raise HTTPException(status_code=404, detail=f"Song '{song_id}' not found")
    return SONGS_DB[song_id]


@app.post("/api/upload")
async def upload_audio_for_stems(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing audio filename")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in (".mp3", ".wav", ".flac", ".ogg", ".m4a"):
        ext = ".wav"

    raw_title = os.path.splitext(file.filename)[0]
    slug = re.sub(r"[^a-z0-9]+", "-", raw_title.lower()).strip("-") or "custom-track"
    song_id = f"{slug}-{uuid.uuid4().hex[:4]}"

    upload_path = os.path.join(UPLOADS_DIR, f"{song_id}{ext}")
    with open(upload_path, "wb") as out_f:
        shutil.copyfileobj(file.file, out_f)

    song_payload = analyze_and_separate_upload(
        file_path=upload_path,
        song_id=song_id,
        title=raw_title,
        storage_root=STORAGE_DIR,
    )
    SONGS_DB[song_id] = song_payload
    return song_payload


@app.post("/api/export")
def export_arrangement(req: ExportArrangementRequest):
    if not SONGS_DB:
        startup_initialize_demo_songs()
    if req.songId not in SONGS_DB:
        raise HTTPException(status_code=404, detail=f"Song '{req.songId}' not found")

    blocks_dicts = [b.model_dump() if hasattr(b, "model_dump") else b.dict() for b in req.blocks]
    stems_dicts = {
        k: (v.model_dump() if hasattr(v, "model_dump") else v.dict())
        for k, v in req.stems.items()
    }

    filename, total_dur, block_count = render_arrangement_export(
        song_id=req.songId,
        storage_root=STORAGE_DIR,
        export_dir=EXPORTS_DIR,
        blocks=blocks_dicts,
        stem_States=stems_dicts,
    )

    return {
        "status": "exported",
        "filename": filename,
        "downloadUrl": f"/exports/{filename}",
        "durationSeconds": total_dur,
        "blocksRendered": block_count,
    }

