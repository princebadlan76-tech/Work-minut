from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from io import BytesIO
import pandas as pd
from pypdf import PdfReader
from docx import Document


app = FastAPI(
    title="Work Minut API",
    description="AI Data Entry Backend",
    version="1.0.0"
)


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

def quality_check(columns, rows):

    issues = []

    # Missing column names
    for column in columns:
        if not str(column).strip():
            issues.append("A column has a missing name.")

    # Empty values
    for row_number, row in enumerate(rows, start=1):

        for column in columns:

            value = row.get(column, "")

            if value is None or str(value).strip() == "":
                issues.append(
                    f"Missing value in row {row_number}, column '{column}'."
                )

    return {
        "passed": len(issues) == 0,
        "total_issues": len(issues),
        "issues": issues[:50]
    }
    
async def extract_file_content(file: UploadFile):

    content = await file.read()
    filename = file.filename.lower()

    # Excel
    if filename.endswith((".xlsx", ".xls")):

        df = pd.read_excel(BytesIO(content))

        # Remove completely empty rows and columns
        df = df.dropna(axis=0, how="all")
        df = df.dropna(axis=1, how="all")

        # Remove Excel "Unnamed" columns
        df = df.loc[
            :,
            ~df.columns.astype(str).str.startswith("Unnamed")
        ]

        # Clean column names
        df.columns = [
            str(column).strip()
            for column in df.columns
        ]

        # Replace empty values
        df = df.fillna("")

        return {
            "file_type": "excel",
            "columns": df.columns.tolist(),
            "rows": df.to_dict(orient="records")
        }


    # CSV
    if filename.endswith(".csv"):

        df = pd.read_csv(BytesIO(content))

        return {
            "file_type": "csv",
            "columns": df.columns.tolist(),
            "rows": df.fillna("").to_dict(orient="records")
        }


    # PDF
    if filename.endswith(".pdf"):

        reader = PdfReader(BytesIO(content))

        pages = []

        for page in reader.pages:
            text = page.extract_text() or ""
            pages.append(text)

        return {
            "file_type": "pdf",
            "pages": len(pages),
            "text": "\n".join(pages)
        }


    # Word
    if filename.endswith((".docx", ".doc")):

        document = Document(BytesIO(content))

        paragraphs = [
            paragraph.text
            for paragraph in document.paragraphs
            if paragraph.text.strip()
        ]

        return {
            "file_type": "word",
            "text": "\n".join(paragraphs)
        }


    # Unsupported file
    return {
        "file_type": "unknown",
        "message": "This file format is not supported yet."
    }


@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):

    try:

        extracted_data = await extract_file_content(file)

        return {
            "success": True,
            "filename": file.filename,
            "data": extracted_data
        }

    except Exception as error:

        return {
            "success": False,
            "filename": file.filename,
            "error": str(error)
        }
