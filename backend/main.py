from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

from io import BytesIO
import os
import json

import pandas as pd
from pypdf import PdfReader
from docx import Document

from google import genai
from google.genai import types


# ==================================================
# APP
# ==================================================

app = FastAPI(
    title="Work Minut API",
    description="AI Data Entry Platform",
    version="4.0.0"
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
# GEMINI CONFIG
# ==================================================

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

GEMINI_MODEL = os.getenv(
    "GEMINI_MODEL",
    "gemini-2.5-flash"
)

gemini_client = None

if GEMINI_API_KEY:
    gemini_client = genai.Client(
        api_key=GEMINI_API_KEY
    )


# ==================================================
# ROOT
# ==================================================

@app.get("/")
def root():

    return {
        "success": True,
        "message": "Work Minut API is running",
        "version": "4.0.0"
    }


# ==================================================
# HEALTH
# ==================================================

@app.get("/api/health")
def health():

    return {
        "success": True,
        "status": "healthy",
        "ai_enabled": gemini_client is not None,
        "model": GEMINI_MODEL
    }


# ==================================================
# QUALITY CHECK
# ==================================================

def quality_check(columns, rows):

    issues = []

    # ----------------------------------------------
    # Missing column names
    # ----------------------------------------------

    for column in columns:

        if not str(column).strip():

            issues.append(
                "A column has a missing name."
            )


    # ----------------------------------------------
    # Missing values
    # ----------------------------------------------

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
# JSON CLEANER
# ==================================================

def clean_json_response(output):

    output = output.strip()

    # Remove markdown code fences
    if output.startswith("```"):

        output = (
            output
            .replace("```json", "")
            .replace("```JSON", "")
            .replace("```", "")
            .strip()
        )

    # Find JSON object if extra text exists
    start = output.find("{")
    end = output.rfind("}")

    if (
        start != -1
        and
        end != -1
    ):

        output = output[
            start:end + 1
        ]

    return output


# ==================================================
# AI EXTRACTION
# ==================================================

def ai_extract_data(text):

    # ----------------------------------------------
    # AI NOT CONFIGURED
    # ----------------------------------------------

    if not gemini_client:

        return {

            "enabled": False,

            "message":
                "Gemini AI is not configured. "
                "Add GEMINI_API_KEY in Render Environment."
        }


    # ----------------------------------------------
    # Limit input size
    # ----------------------------------------------

    text = str(text)[:50000]


    # ----------------------------------------------
    # PROMPT
    # ----------------------------------------------

    prompt = f"""
You are the AI extraction engine for Work Minut.

Work Minut is a professional data-entry platform.

Analyze the supplied document or table and convert
useful information into structured data.

IMPORTANT RULES:

1. Identify the important fields.
2. Create clear and professional column names.
3. Extract only information actually present.
4. Never invent information.
5. Missing information must be an empty string.
6. Preserve names accurately.
7. Preserve emails accurately.
8. Preserve phone numbers accurately.
9. Preserve dates accurately.
10. Preserve addresses accurately.
11. Preserve amounts and numbers accurately.
12. Remove unnecessary formatting noise.
13. Keep the original meaning of the data.
14. Return valid JSON only.
15. Give a quality score from 0 to 100.
16. List important extraction issues.
17. If the supplied data is already a structured CSV/table,
    preserve its useful columns and rows.
18. Do not add explanations outside JSON.

Return exactly this structure:

{{
  "columns": [
    "Column 1",
    "Column 2"
  ],
  "rows": [
    {{
      "Column 1": "value",
      "Column 2": "value"
    }}
  ],
  "quality_score": 0,
  "issues": []
}}

DOCUMENT / DATA:

{text}
"""


    try:

        # ------------------------------------------
        # GEMINI REQUEST
        # ------------------------------------------

        response = gemini_client.models.generate_content(

            model=GEMINI_MODEL,

            contents=prompt,

            config=types.GenerateContentConfig(

                temperature=0,

                response_mime_type="application/json"

            )
        )


        # ------------------------------------------
        # GET RESPONSE
        # ------------------------------------------

        output = (
            response.text
            if response.text
            else ""
        )


        output = clean_json_response(
            output
        )


        # ------------------------------------------
        # PARSE JSON
        # ------------------------------------------

        data = json.loads(
            output
        )


        columns = data.get(
            "columns",
            []
        )

        rows = data.get(
            "rows",
            []
        )

        quality_score = data.get(
            "quality_score",
            0
        )

        issues = data.get(
            "issues",
            []
        )


        # ------------------------------------------
        # VALIDATE TYPES
        # ------------------------------------------

        if not isinstance(
            columns,
            list
        ):

            columns = []


        if not isinstance(
            rows,
            list
        ):

            rows = []


        if not isinstance(
            issues,
            list
        ):

            issues = []


        try:

            quality_score = int(
                quality_score
            )

        except Exception:

            quality_score = 0


        quality_score = max(
            0,
            min(
                100,
                quality_score
            )
        )


        return {

            "enabled": True,

            "columns":
                columns,

            "rows":
                rows,

            "quality_score":
                quality_score,

            "issues":
                issues[:50]
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
            for column in
            df.columns.tolist()
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


        table_text = (
            df
            .fillna("")
            .to_csv(
                index=False
            )
        )


        ai_result = ai_extract_data(
            table_text
        )


        return {

            "file_type":
                "excel",

            "columns":
                columns,

            "rows":
                rows,

            "quality_check":
                quality,

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
            for column in
            df.columns.tolist()
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


        table_text = (
            df
            .fillna("")
            .to_csv(
                index=False
            )
        )


        ai_result = ai_extract_data(
            table_text
        )


        return {

            "file_type":
                "csv",

            "columns":
                columns,

            "rows":
                rows,

            "quality_check":
                quality,

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

            pages.append(
                text
            )


        full_text = "\n".join(
            pages
        )


        ai_result = ai_extract_data(
            full_text
        )


        return {

            "file_type":
                "pdf",

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

            "file_type":
                "word",

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
# UPLOAD API
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

            "success":
                True,

            "filename":
                file.filename,

            "data":
                extracted_data
        }


    except Exception as error:

        return {

            "success":
                False,

            "filename":
                file.filename,

            "error":
                str(error)
        }
