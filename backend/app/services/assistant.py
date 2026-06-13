from __future__ import annotations

from app.schemas import DatasetProfile
from app.services.analysis import top_correlations
from app.services.dataset_store import StoredDataset


class AssistantService:
    @staticmethod
    def build_system_prompt() -> str:
        return (
            "You are an expert data science copilot. "
            "Provide practical, production-focused answers with assumptions, risks, and next steps. "
            "Prefer concise bullet points when useful."
        )

    @staticmethod
    def build_analysis_system_prompt() -> str:
        return (
            "You are a senior data scientist producing decision-ready output. "
            "Default behavior is RESULT-FIRST, not tutorial-first. "
            "When user asks for ranking, best feature, top N, or comparison, provide the final ranked answer immediately. "
            "Do not output long methodology unless the user explicitly asks for process. "
            "If evidence is weak, state uncertainty clearly and still provide the best direct answer."
        )

    @staticmethod
    def build_analysis_user_prompt(dataset_context: str, user_question: str) -> str:
        return (
            "Analyze the dataset context below and answer the user question.\n\n"
            "Output format (strict):\n"
            "1) FINAL ANSWER (short, direct)\n"
            "2) EVIDENCE (key numbers/columns that support answer)\n"
            "3) ACTIONS (max 3 concise next actions)\n\n"
            "Avoid long plans. Avoid generic text. Be specific.\n\n"
            f"Dataset context:\n{dataset_context}\n\n"
            f"User question:\n{user_question}"
        )

    @staticmethod
    def fallback_chat_answer(message: str) -> str:
        return (
            "Groq API key is not configured, so I am in local fallback mode.\n\n"
            f"Your question: {message}\n\n"
            "Set GROQ_API_KEY in backend/.env to enable high-quality LLM responses."
        )

    @staticmethod
    def fallback_analysis_answer(profile: DatasetProfile, user_question: str) -> str:
        return (
            "FINAL ANSWER\n"
            "Groq is currently unavailable, so this is a local result-only summary.\n\n"
            "EVIDENCE\n"
            f"- Dataset: {profile.filename}\n"
            f"- Rows: {profile.rows}, Columns: {profile.columns}\n"
            f"- Numeric columns: {list(profile.numeric_summary.keys())}\n"
            f"- Missing counts: {profile.missing_counts}\n"
            f"- User question: {user_question}\n\n"
            "ACTIONS\n"
            "1. Configure GROQ_API_KEY for full ranked/insightful analysis.\n"
            "2. Ask a direct question like: 'For target_1d, rank top 5 features with scores'."
        )

    @staticmethod
    def build_dataset_context(profile: DatasetProfile, stored: StoredDataset) -> str:
        correlations = top_correlations(stored.dataframe, limit=5)
        corr_text = "\n".join(
            [f"- {a} vs {b}: correlation={val:.3f}" for a, b, val in correlations]
        ) or "- No numeric correlation pairs available"

        return (
            f"Dataset: {profile.filename}\n"
            f"Rows: {profile.rows}, Columns: {profile.columns}\n"
            f"Columns: {', '.join(profile.column_names)}\n"
            f"Missing values: {profile.missing_counts}\n"
            f"Top correlations:\n{corr_text}\n"
            f"Numeric summary: {profile.numeric_summary}\n"
            f"Preview rows: {profile.preview_rows}"
        )


assistant_service = AssistantService()
