"""DeepSeek Chat Completions 客户端（OpenAI 兼容）。"""
import asyncio
import json
from typing import AsyncIterator

import httpx

from app.core.config import settings

MAX_RETRIES = 2
RETRY_BACKOFF_SECONDS = 0.5


def _is_retryable(exc: Exception) -> bool:
    if isinstance(exc, httpx.HTTPStatusError):
        return exc.response.status_code == 429 or exc.response.status_code >= 500
    return isinstance(exc, httpx.TransportError)


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {settings.DEEPSEEK_API_KEY}",
        "Content-Type": "application/json",
    }


def _payload(messages: list[dict], tools: list[dict] | None = None, stream: bool = False,
             temperature: float = 0.4) -> dict:
    p = {
        "model": settings.DEEPSEEK_MODEL,
        "messages": messages,
        "temperature": temperature,
        "stream": stream,
    }
    if tools:
        p["tools"] = tools
        p["tool_choice"] = "auto"
    return p


async def chat(messages: list[dict], tools: list[dict] | None = None) -> dict:
    """非流式调用，返回完整 message 对象（含 tool_calls），失败时自动重试。"""
    last_exc = None
    for attempt in range(MAX_RETRIES + 1):
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                r = await client.post(
                    settings.chat_completions_url,
                    json=_payload(messages, tools, stream=False),
                    headers=_headers(),
                )
                r.raise_for_status()
                data = r.json()
                return data["choices"][0]["message"]
        except httpx.HTTPError as exc:
            last_exc = exc
            if attempt >= MAX_RETRIES or not _is_retryable(exc):
                raise
            await asyncio.sleep(RETRY_BACKOFF_SECONDS * (attempt + 1))
    raise last_exc


async def chat_stream(
    messages: list[dict], tools: list[dict] | None = None
) -> AsyncIterator[dict]:
    """流式调用，逐 delta 返回 dict；请求建立阶段失败会自动重试一次。"""
    last_exc = None
    for attempt in range(MAX_RETRIES + 1):
        produced = False
        try:
            async for ev in _chat_stream_once(messages, tools):
                produced = True
                yield ev
            return
        except httpx.HTTPError as exc:
            last_exc = exc
            if produced or attempt >= MAX_RETRIES or not _is_retryable(exc):
                raise
            await asyncio.sleep(RETRY_BACKOFF_SECONDS * (attempt + 1))
    raise last_exc


async def _chat_stream_once(
    messages: list[dict], tools: list[dict] | None = None
) -> AsyncIterator[dict]:
    """单次流式调用。
    - {"type": "delta", "content": "..."} 文本增量
    - {"type": "tool_calls", "tool_calls": [...]} 工具调用（已聚合）
    - {"type": "finish", "reason": "stop" | "tool_calls"} 结束原因
    """
    buffer: dict = {}  # 聚合 tool_calls
    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream(
            "POST",
            settings.chat_completions_url,
            json=_payload(messages, tools, stream=True),
            headers=_headers(),
        ) as r:
            r.raise_for_status()
            async for line in r.aiter_lines():
                if not line or not line.startswith("data: "):
                    continue
                raw = line[6:]
                if raw == "[DONE]":
                    if buffer:
                        yield {"type": "tool_calls", "tool_calls": _normalize_tool_calls(buffer)}
                    yield {"type": "finish", "reason": "tool_calls" if buffer else "stop"}
                    return
                try:
                    chunk = json.loads(raw)
                except json.JSONDecodeError:
                    continue
                delta = chunk.get("choices", [{}])[0].get("delta", {})
                if "content" in delta and delta["content"]:
                    yield {"type": "delta", "content": delta["content"]}
                if "tool_calls" in delta and delta["tool_calls"]:
                    _merge_tool_calls(buffer, delta["tool_calls"])


def _merge_tool_calls(buffer: dict, tool_calls: list[dict]) -> None:
    """把流式 tool_calls 增量合并到 buffer。"""
    for tc in tool_calls:
        idx = tc.get("index", 0)
        slot = buffer.setdefault(idx, {"id": "", "type": "function",
                                        "function": {"name": "", "arguments": ""}})
        if tc.get("id"):
            slot["id"] = tc["id"]
        fn = tc.get("function", {})
        if fn.get("name"):
            slot["function"]["name"] = fn["name"]
        if fn.get("arguments"):
            slot["function"]["arguments"] += fn["arguments"]


def _normalize_tool_calls(buffer: dict) -> list[dict]:
    return [buffer[k] for k in sorted(buffer.keys())]
