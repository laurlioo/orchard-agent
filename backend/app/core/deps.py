"""通用 FastAPI 依赖。"""
from fastapi import Query


def get_orchard(orchard: str = Query("peach", pattern="^(peach|grape)$")) -> str:
    """从查询参数读取当前果园（桃园 peach / 葡萄园 grape）。"""
    return orchard
