from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

from io import BytesIO

import pandas as pd

from pypdf import PdfReader

from docx import Document


# --------------------------------------------------
# APP
# --------------------------------------------------

app = FastAPI(
    title="Work Minut API",
    description="AI Data Entry Backend",
    version="1.0.0"
)


# --------------------------------------------------
# CORS
# --------------------------------------------------

app.add_middleware(
    CORSMiddleware,

    allow_origins=["*"],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],
)


# --------------------------------------------------
# ROOT
# --------------------------------------------------

@app.get("/")
def root():

    return {
        "success": True,
        "message": "Work Minut API is running"
    }


# --------------------------------------------------
# HEALTH CHECK
# --------------------------------------------------

@app.get("/api/health")
def health():

    return {
        "success": True,
        "status": "healthy"
    }


# --------------------------------------------------
# QUALITY CHECK
# --------------------------------------------------

def quality_check(columns, rows):

    issues = []


    # Check column names

    for column in columns:

        if not str(column).strip():

            issues.append(
                "A column has a missing name."
            )


    # Check empty values

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


# --------------------------------------------------
# FILE EXTRACTION
# --------------------------------------------------

async def extract_file_content(
    file: UploadFile
):

    content = await file.read()

    filename = (
        file.filename or ""
    ).lower()


    # --------------------------------------------------
    # EXCEL
    # --------------------------------------------------

    if filename.endswith(
        (".xlsx", ".xls")
    ):

        df = pd.read_excel(
            BytesIO(content)
        )


        columns = df.columns.tolist()

        rows = (
            df
            .fillna("")
            .to_dict(
                orient="records"
            )
        )


        quality = quality_check(
            columns,
            rows
        )


        return {

            "file_type":
                "excel",

            "columns":
                columns,

            "rows":
                rows,

            "quality_check":
                quality

        }


    # --------------------------------------------------
    # CSV
    # --------------------------------------------------

    if filename.endswith(".csv"):

        df = pd.read_csv(
            BytesIO(content)
        )


        columns = df.columns.tolist()

        rows = (
            df
            .fillna("")
            .to_dict(
                orient="records"
            )
        )


        quality = quality_check(
            columns,
            rows
        )


        return {

            "file_type":
                "csv",

            "columns":
                columns,

            "rows":
                rows,

            "quality_check":
                quality

        }


    # --------------------------------------------------
    # PDF
    # --------------------------------------------------

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


        return {

            "file_type":
                "pdf",

            "pages":
                len(pages),

            "text":
                "\n".join(pages)

        }


    # --------------------------------------------------
    # WORD
    # --------------------------------------------------

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


        return {

            "file_type":
                "word",

            "text":
                "\n".join(paragraphs)

        }


    # --------------------------------------------------
    # UNSUPPORTED
    # --------------------------------------------------

    return {

        "file_type":
            "unknown",

        "message":
            "This file format is not supported yet."

    }


# --------------------------------------------------
# UPLOAD API
# --------------------------------------------------

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
