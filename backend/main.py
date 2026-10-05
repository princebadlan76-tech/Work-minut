from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Work Minut API",
    description="AI Data Entry Backend",
    version="1.0.0"
)

# Frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "success": True,
        "message": "Work Minut API is running"
    }


@app.get("/api/health")
def health():
    return {
        "success": True,
        "status": "healthy"
    }


@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):

    return {
        "success": True,
        "filename": file.filename,
        "message": "File received successfully"
    }
