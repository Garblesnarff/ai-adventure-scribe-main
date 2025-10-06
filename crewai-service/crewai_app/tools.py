from typing import Any, Dict


def search_memory(query: str) -> Dict[str, Any]:
    return {"result": f"[memory stub] {query}"}


def state_snapshot() -> Dict[str, Any]:
    return {"scene": None, "combat": None, "quests": []}
