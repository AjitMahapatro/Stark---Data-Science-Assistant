from typing import Any

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = "ok"
    service: str = "data-science-assistant"


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    session_id: str | None = None
    dataset_id: str | None = None


class ChatResponse(BaseModel):
    answer: str
    session_id: str


class DatasetProfile(BaseModel):
    dataset_id: str
    filename: str
    rows: int
    columns: int
    duplicate_rows: int
    duplicate_percentage: float
    memory_usage_mb: float
    column_names: list[str]
    dtypes: dict[str, str]
    unique_counts: dict[str, int]
    missing_counts: dict[str, int]
    missing_percentages: dict[str, float]
    numeric_summary: dict[str, dict[str, float | int | None]]
    preview_rows: list[dict[str, Any]]


class AnalysisRequest(BaseModel):
    dataset_id: str
    prompt: str = Field(..., min_length=2)


class AnalysisResponse(BaseModel):
    answer: str


class DatasetRowsResponse(BaseModel):
    dataset_id: str
    rows: list[dict[str, Any]]


class ScrapeRequest(BaseModel):
    url: str = Field(..., min_length=8)
    instruction: str = Field(
        default="Summarize key points for a data analyst.",
        min_length=5,
    )


class ScrapeResponse(BaseModel):
    url: str
    title: str
    extracted_text: str
    summary: str


class ErrorResponse(BaseModel):
    detail: str
