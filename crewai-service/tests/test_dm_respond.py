import sys, os
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from main import app  # noqa: E402


def test_dm_respond_roll_first_heuristic():
    client = TestClient(app)
    payload = {
        "session_id": "s1",
        "message": "I try to sneak past the guards (DC 14)",
        "context": {"campaignId": "c1", "characterId": "pc1", "sessionId": "s1"},
        "state_section": "",
        "history": [],
    }
    r = client.post("/dm/respond", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, dict)
    # Requires at least one roll request for roll-first flow
    assert any(rr.get("type") in {"check", "attack", "initiative", "save"} for rr in data.get("roll_requests", []))
    # Response should not include nulls due to response_model_exclude_none
    assert "null" not in r.text.lower()
