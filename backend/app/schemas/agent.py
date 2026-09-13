"""Agent 对话 Pydantic 模型。"""
from pydantic import BaseModel


class ChatMessage(BaseModel):
    role: str  # user/assistant
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []


class ToolCallEvent(BaseModel):
    """Agent 调用工具过程中的事件，用于前端展示进度。"""
    tool: str
    args: dict
    result: str | None = None
