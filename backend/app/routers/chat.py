from __future__ import annotations

from uuid import uuid4

from fastapi import APIRouter
from fastapi import HTTPException

from app.schemas import ChatRequest, ChatResponse
from app.services.assistant import assistant_service
from app.services.dataset_store import dataset_store
from app.services.groq_client import groq_client

router = APIRouter(prefix="/api", tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest) -> ChatResponse:
    session_id = payload.session_id or str(uuid4())

    context = ""
    if payload.dataset_id:
        stored = dataset_store.get(payload.dataset_id)
        if not stored:
            raise HTTPException(status_code=404, detail="Dataset not found")

        profile = {
            "filename": stored.filename,
            "rows": int(stored.dataframe.shape[0]),
            "columns": int(stored.dataframe.shape[1]),
            "column_names": [str(c) for c in stored.dataframe.columns],
        }
        context = f"Dataset context: {profile}"

    user_prompt = payload.message if not context else f"{context}\n\nUser request: {payload.message}"

    try:
        answer = await groq_client.chat(
            system_prompt=assistant_service.build_system_prompt(),
            user_prompt=user_prompt,
        )
    except Exception:
        answer = assistant_service.fallback_chat_answer(payload.message)

    return ChatResponse(answer=answer, session_id=session_id)
