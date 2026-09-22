"""Agent 主循环：消息 → DeepSeek → tool_calls → 执行 → 回填 → 最终回复。

通过 async generator 产出事件 dict，由 API 层转成 SSE。
事件类型：
  - {"type": "tool_call", "name": "...", "args": {...}}
  - {"type": "tool_result", "name": "...", "result": "..."}
  - {"type": "delta", "content": "..."}
  - {"type": "done"}
  - {"type": "error", "message": "..."}
"""
import json
from typing import AsyncIterator

from sqlalchemy.orm import Session

from app.agent import deepseek_client
from app.agent.tools import EXECUTORS, WRITE_TOOLS, system_prompt, TOOLS
from app.core.config import settings

MAX_ITERATIONS = 6  # 防止 Agent 死循环


async def run(
    message: str,
    history: list[dict],
    db: Session,
    user_role: str = "viewer",
) -> AsyncIterator[dict]:
    """主入口：跑 Agent 循环，yield 事件。"""
    if not settings.DEEPSEEK_API_KEY:
        yield {"type": "error", "message": "未配置 DEEPSEEK_API_KEY，请先在 .env 中填入。"}
        return

    # 组装消息列表
    sys_msg = {"role": "system", "content": system_prompt()}
    msgs: list[dict] = [sys_msg] + list(history) + [{"role": "user", "content": message}]

    try:
        for _ in range(MAX_ITERATIONS):
            # 1. 调 DeepSeek 流式
            tool_calls_buffer: list[dict] = []
            collected_text: list[str] = []
            finish_reason = "stop"

            async for ev in deepseek_client.chat_stream(msgs, tools=TOOLS):
                if ev["type"] == "delta":
                    collected_text.append(ev["content"])
                    yield {"type": "delta", "content": ev["content"]}
                elif ev["type"] == "tool_calls":
                    tool_calls_buffer = ev["tool_calls"]
                elif ev["type"] == "finish":
                    finish_reason = ev["reason"]

            # 2. 把 assistant 这条消息（含 tool_calls）记入历史
            assistant_msg: dict = {"role": "assistant", "content": "".join(collected_text)}
            if tool_calls_buffer:
                assistant_msg["tool_calls"] = tool_calls_buffer
            msgs.append(assistant_msg)

            # 3. 没有工具调用 → 结束
            if not tool_calls_buffer or finish_reason == "stop":
                yield {"type": "done"}
                return

            # 4. 执行所有 tool_calls，回填 tool 结果
            for tc in tool_calls_buffer:
                fn = tc.get("function", {})
                name = fn.get("name", "")
                raw_args = fn.get("arguments", "{}") or "{}"
                try:
                    args = json.loads(raw_args)
                except json.JSONDecodeError:
                    args = {}
                yield {"type": "tool_call", "name": name, "args": args}
                try:
                    if user_role != "admin" and name in WRITE_TOOLS:
                        result = "当前账号为只读，无法执行写操作。请联系管理员。"
                    else:
                        executor = EXECUTORS.get(name)
                        if executor is None:
                            result = f"未知工具：{name}"
                        else:
                            result = executor(db, args)
                except Exception as e:
                    result = f"工具执行失败：{e}"
                yield {"type": "tool_result", "name": name, "result": result}
                msgs.append({
                    "role": "tool",
                    "tool_call_id": tc.get("id", ""),
                    "content": result,
                })

        yield {"type": "done", "message": "已达最大工具调用轮数，结束本轮。"}
    except Exception as e:
        yield {"type": "error", "message": f"Agent 运行出错：{e}"}
