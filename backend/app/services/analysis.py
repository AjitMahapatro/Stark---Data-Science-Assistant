from __future__ import annotations

import pandas as pd


def sanitize_value(value: object) -> object:
    if pd.isna(value):
        return None
    if hasattr(value, "item"):
        try:
            return value.item()
        except Exception:
            return str(value)
    return value


def build_numeric_summary(df: pd.DataFrame) -> dict[str, dict[str, float | int | None]]:
    numeric_df = df.select_dtypes(include=["number"])
    if numeric_df.empty:
        return {}

    summary: dict[str, dict[str, float | int | None]] = {}
    desc = numeric_df.describe().to_dict()
    for col, stats in desc.items():
        summary[col] = {key: sanitize_value(val) for key, val in stats.items()}
    return summary


def build_preview(df: pd.DataFrame, max_rows: int) -> list[dict[str, object]]:
    preview = df.head(max_rows)
    result: list[dict[str, object]] = []
    for _, row in preview.iterrows():
        cleaned = {col: sanitize_value(row[col]) for col in preview.columns}
        result.append(cleaned)
    return result


def build_missing_percentages(df: pd.DataFrame) -> dict[str, float]:
    total_rows = max(int(df.shape[0]), 1)
    return {
        str(col): round((int(df[col].isna().sum()) / total_rows) * 100, 2)
        for col in df.columns
    }


def build_unique_counts(df: pd.DataFrame) -> dict[str, int]:
    return {str(col): int(df[col].nunique(dropna=True)) for col in df.columns}


def dataset_memory_mb(df: pd.DataFrame) -> float:
    memory_bytes = int(df.memory_usage(deep=True).sum())
    return round(memory_bytes / (1024 * 1024), 3)


def top_correlations(df: pd.DataFrame, limit: int = 5) -> list[tuple[str, str, float]]:
    numeric_df = df.select_dtypes(include=["number"])
    if numeric_df.shape[1] < 2:
        return []

    corr = numeric_df.corr(numeric_only=True)
    pairs: list[tuple[str, str, float]] = []
    columns = list(corr.columns)

    for i, col_a in enumerate(columns):
        for col_b in columns[i + 1 :]:
            value = corr.loc[col_a, col_b]
            if pd.isna(value):
                continue
            pairs.append((col_a, col_b, float(value)))

    pairs.sort(key=lambda x: abs(x[2]), reverse=True)
    return pairs[:limit]
