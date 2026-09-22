"""Agent 对话端点：SSE 流式。"""
import json

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import get_db, engine
from app.agent.orchestrator import run
from app.schemas.agent import ChatRequest

router = APIRouter(prefix="/agent", tags=["agent"])


def _sse(event_type: str, data: dict) -> str:
    return f"event: {event_type}\ndata: {json.dumps(data, ensure_ascii=False, default=str)}\n\n"


@router.post("/chat")
async def chat(req: ChatRequest, request: Request, db: Session = Depends(get_db)):
    """POST /agent/chat，返回 text/event-stream。"""
    history = [{"role": m.role, "content": m.content} for m in req.history]
    user_role = getattr(request.state, "user_role", "viewer")

    async def gen():
        try:
            async for ev in run(req.message, history, db, user_role=user_role):
                t = ev["type"]
                if t == "delta":
                    yield _sse("delta", {"content": ev["content"]})
                elif t == "tool_call":
                    yield _sse("tool_call", {"name": ev["name"], "args": ev["args"]})
                elif t == "tool_result":
                    preview = ev["result"]
                    if len(preview) > 2000:
                        preview = preview[:2000] + "...(已截断)"
                    yield _sse("tool_result", {"name": ev["name"], "preview": preview})
                elif t == "done":
                    yield _sse("done", {"message": ev.get("message", "")})
                elif t == "error":
                    yield _sse("error", {"message": ev["message"]})
        except Exception as e:
            yield _sse("error", {"message": str(e)})

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/health")
def health():
    """健康检查：进程存活 + 数据库可连。"""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "ok", "db": "ok"}
    except Exception as e:
        return {"status": "degraded", "db": str(e)}
