from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

from io import BytesIO
import os
import json

import pandas as pd

from pypdf import PdfReader
from docx import Document

from openai import OpenAI


# ==================================================
# APP
# ==================================================

app = FastAPI(
    title="Work Minut API",
    description="AI Data Entry Platform",
    version="2.0.0"
)


# ==================================================
# CORS
# ==================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================================================
# OPENAI
# ==================================================

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

OPENAI_MODEL = os.getenv(
    "OPENAI_MODEL",
    "gpt-6-luna"
)

client = None

if OPENAI_API_KEY:
    client = OpenAI(
        api_key=OPENAI_API_KEY
    )


# ==================================================
# ROOT
# ==================================================

@app.get("/")
def root():

    return {
        "success": True,
        "message": "Work Minut API is running",
        "version": "2.0.0"
    }


# ==================================================
# HEALTH
# ==================================================

@app.get("/api/health")
def health():

    return {
        "success": True,
        "status": "healthy",
        "ai_enabled": client is not None
    }


# ==================================================
# BASIC QUALITY CHECK
# ==================================================

def quality_check(columns, rows):

    issues = []


    # Check column names

    for column in columns:

        if not str(column).strip():

            issues.append(
                "A column has a missing name."
            )


    # Check missing values

    for row_number, row in enumerate(
        rows,
        start=1
    ):

        for column in columns:

            value = row.get(
                column,
                ""
            )

            if (
                value is None
                or
                str(value).strip() == ""
            ):

                issues.append(
                    f"Missing value in row "
                    f"{row_number}, "
                    f"column '{column}'."
                )


    return {

        "passed":
            len(issues) == 0,

        "total_issues":
            len(issues),

        "issues":
            issues[:50]

    }


# ==================================================
# AI STRUCTURE EXTRACTION
# ==================================================

def ai_extract_data(text):

    if not client:

        return {
            "enabled": False,
            "message":
                "AI is not configured. "
                "Add OPENAI_API_KEY in Render."
        }


    # Protect the API from extremely large input

    text = text[:50000]


    prompt = f"""
You are the AI extraction engine for Work Minut,
a professional data-entry platform.

Your job is to analyze the supplied document text
and convert useful information into structured data.

Rules:

1. Identify the important fields in the document.
2. Create clear column names.
3. Extract only information actually present.
4. Never invent values.
5. If a value is missing, use an empty string.
6. Keep dates, phone numbers, emails and amounts
   as accurately as possible.
7. Remove obvious formatting noise.
8. Return valid JSON only.
9. Include a quality score from 0 to 100.
10. Explain important extraction issues.

Return exactly this structure:

{{
  "columns": ["Column 1", "Column 2"],
  "rows": [
    {{
      "Column 1": "value",
      "Column 2": "value"
    }}
  ],
  "quality_score": 0,
  "issues": []
}}

DOCUMENT:

{text}
"""


    try:

        response = client.responses.create(
            model=OPENAI_MODEL,
            input=prompt
        )


        output = response.output_text


        data = json.loads(output)


        return {
            "enabled": True,
            "columns":
                data.get("columns", []),
            "rows":
                data.get("rows", []),
            "quality_score":
                data.get("quality_score", 0),
            "issues":
                data.get("issues", [])
        }


    except Exception as error:

        return {
            "enabled": True,
            "error":
                str(error)
        }


# ==================================================
# FILE EXTRACTION
# ==================================================

async def extract_file_content(
    file: UploadFile
):

    content = await file.read()

    filename = (
        file.filename or ""
    ).lower()


    # ==================================================
    # EXCEL
    # ==================================================

    if filename.endswith(
        (".xlsx", ".xls")
    ):

        df = pd.read_excel(
            BytesIO(content)
        )

        columns = [
            str(column)
            for column
            in df.columns.tolist()
        ]

        rows = (
            df
            .fillna("")
            .to_dict(
                orient="records"
            )
        )

        rows = [
            {
                str(key): value
                for key, value
                in row.items()
            }
            for row in rows
        ]

        quality = quality_check(
            columns,
            rows
        )


        # Convert table to text for AI

        table_text = df.fillna("").to_csv(
            index=False
        )

        ai_result = ai_extract_data(
            table_text
        )


        return {

            "file_type": "excel",

            "columns": columns,

            "rows": rows,

            "quality_check": quality,

            "ai_extraction":
                ai_result

        }


    # ==================================================
    # CSV
    # ==================================================

    if filename.endswith(".csv"):

        df = pd.read_csv(
            BytesIO(content)
        )

        columns = [
            str(column)
            for column
            in df.columns.tolist()
        ]

        rows = (
            df
            .fillna("")
            .to_dict(
                orient="records"
            )
        )

        rows = [
            {
                str(key): value
                for key, value
                in row.items()
            }
            for row in rows
        ]

        quality = quality_check(
            columns,
            rows
        )


        table_text = df.fillna("").to_csv(
            index=False
        )


        ai_result = ai_extract_data(
            table_text
        )


        return {

            "file_type": "csv",

            "columns": columns,

            "rows": rows,

            "quality_check": quality,

            "ai_extraction":
                ai_result

        }


    # ==================================================
    # PDF
    # ==================================================

    if filename.endswith(".pdf"):

        reader = PdfReader(
            BytesIO(content)
        )

        pages = []


        for page in reader.pages:

            text = (
                page.extract_text()
                or ""
            )

            pages.append(text)


        full_text = "\n".join(pages)


        ai_result = ai_extract_data(
            full_text
        )


        return {

            "file_type": "pdf",

            "pages":
                len(pages),

            "text":
                full_text,

            "ai_extraction":
                ai_result

        }


    # ==================================================
    # WORD
    # ==================================================

    if filename.endswith(
        (".docx", ".doc")
    ):

        document = Document(
            BytesIO(content)
        )


        paragraphs = [

            paragraph.text

            for paragraph
            in document.paragraphs

            if paragraph.text.strip()

        ]


        full_text = "\n".join(
            paragraphs
        )


        ai_result = ai_extract_data(
            full_text
        )


        return {

            "file_type": "word",

            "text":
                full_text,

            "ai_extraction":
                ai_result

        }


    # ==================================================
    # UNSUPPORTED
    # ==================================================

    return {

        "file_type":
            "unknown",

        "message":
            "This file format is not supported yet."

    }


# ==================================================
# UPLOAD
# ==================================================

@app.post("/api/upload")
async def upload_file(
    file: UploadFile = File(...)
):

    try:

        extracted_data = (
            await extract_file_content(
                file
            )
        )


        return {

            "success": True,

            "filename":
                file.filename,

            "data":
                extracted_data

        }


    except Exception as error:

        return {

            "success": False,

            "filename":
                file.filename,

            "error":
                str(error)

        }
