from __future__ import annotations

from io import StringIO

import httpx
import pandas as pd
from bs4 import BeautifulSoup
from fastapi import APIRouter
from fastapi import File
from fastapi import HTTPException
from fastapi import UploadFile
from urllib.parse import urlparse

from app.config import settings
from app.schemas import AnalysisRequest
from app.schemas import AnalysisResponse
from app.schemas import DatasetProfile
from app.schemas import DatasetRowsResponse
from app.schemas import ScrapeRequest
from app.schemas import ScrapeResponse
from app.services.analysis import build_missing_percentages
from app.services.analysis import build_numeric_summary
from app.services.analysis import build_preview
from app.services.analysis import build_unique_counts
from app.services.analysis import dataset_memory_mb
from app.services.assistant import assistant_service
from app.services.dataset_store import StoredDataset
from app.services.dataset_store import dataset_store
from app.services.groq_client import groq_client

router = APIRouter(prefix="/api", tags=["data"])


def build_dataset_profile(stored: StoredDataset) -> DatasetProfile:
    df = stored.dataframe
    rows = int(df.shape[0])
    duplicate_rows = int(df.duplicated().sum())

    return DatasetProfile(
        dataset_id=stored.dataset_id,
        filename=stored.filename,
        rows=rows,
        columns=int(df.shape[1]),
        duplicate_rows=duplicate_rows,
        duplicate_percentage=round((duplicate_rows / max(rows, 1)) * 100, 2),
        memory_usage_mb=dataset_memory_mb(df),
        column_names=[str(c) for c in df.columns],
        dtypes={str(col): str(dtype) for col, dtype in df.dtypes.items()},
        unique_counts=build_unique_counts(df),
        missing_counts={str(col): int(df[col].isna().sum()) for col in df.columns},
        missing_percentages=build_missing_percentages(df),
        numeric_summary=build_numeric_summary(df),
        preview_rows=build_preview(df, settings.upload_max_rows_preview),
    )


@router.post("/upload-csv", response_model=DatasetProfile)
async def upload_csv(file: UploadFile = File(...)) -> DatasetProfile:
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are supported")

    contents = await file.read()
    try:
        df = pd.read_csv(StringIO(contents.decode("utf-8", errors="ignore")))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid CSV file: {exc}") from exc

    if df.empty:
        raise HTTPException(status_code=400, detail="CSV is empty")

    dataset_id = dataset_store.put(file.filename, df)

    stored = dataset_store.get(dataset_id)
    if not stored:
        raise HTTPException(status_code=500, detail="Dataset storage failed")

    return build_dataset_profile(stored)


@router.post("/analyze", response_model=AnalysisResponse)
async def analyze(payload: AnalysisRequest) -> AnalysisResponse:
    stored = dataset_store.get(payload.dataset_id)
    if not stored:
        raise HTTPException(status_code=404, detail="Dataset not found")

    profile = build_dataset_profile(stored)

    prompt = assistant_service.build_analysis_user_prompt(
        dataset_context=assistant_service.build_dataset_context(profile, stored),
        user_question=payload.prompt,
    )

    try:
        answer = await groq_client.chat(
            system_prompt=assistant_service.build_analysis_system_prompt(),
            user_prompt=prompt,
        )
    except Exception:
        answer = assistant_service.fallback_analysis_answer(profile, payload.prompt)

    return AnalysisResponse(answer=answer)


@router.get("/dataset/{dataset_id}/rows", response_model=DatasetRowsResponse)
async def dataset_rows(dataset_id: str, limit: int = 2000) -> DatasetRowsResponse:
    stored = dataset_store.get(dataset_id)
    if not stored:
        raise HTTPException(status_code=404, detail="Dataset not found")

    safe_limit = min(max(limit, 10), 5000)
    rows = build_preview(stored.dataframe, safe_limit)
    return DatasetRowsResponse(dataset_id=dataset_id, rows=rows)


def _clean_scraped_text(html: str) -> tuple[str, str]:
    soup = BeautifulSoup(html, "html.parser")
    title = soup.title.get_text(strip=True) if soup.title else "Untitled page"

    for tag in soup(["script", "style", "noscript", "svg"]):
        tag.decompose()

    text = " ".join(soup.get_text(separator=" ").split())
    return title, text[:8000]


@router.post("/scrape", response_model=ScrapeResponse)
async def scrape_page(payload: ScrapeRequest) -> ScrapeResponse:
    parsed = urlparse(payload.url.strip())
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise HTTPException(status_code=400, detail="Invalid URL. Use http/https URL.")
    validated = payload.url.strip()

    try:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            response = await client.get(validated, headers={"User-Agent": "DataScienceAssistant/1.0"})
            response.raise_for_status()
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to fetch URL: {exc}") from exc

    title, extracted_text = _clean_scraped_text(response.text)
    if not extracted_text:
        raise HTTPException(status_code=400, detail="No readable text content found at URL")

    prompt = (
        f"Source title: {title}\n"
        f"User instruction: {payload.instruction}\n"
        "Generate concise actionable insights from this text for a data professional.\n\n"
        f"Text:\n{extracted_text}"
    )
    try:
        summary = await groq_client.chat(
            system_prompt=assistant_service.build_system_prompt(),
            user_prompt=prompt,
        )
    except Exception:
        summary = extracted_text[:1200]

    return ScrapeResponse(
        url=validated,
        title=title,
        extracted_text=extracted_text[:2000],
        summary=summary,
    )
