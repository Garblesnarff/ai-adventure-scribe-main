import sys, os
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from main import app  # noqa: E402


def test_dm_options_normalization_and_fallback(monkeypatch):
    client = TestClient(app)

    # Ensure OPENROUTER_API_KEY absent to trigger fallback path
    monkeypatch.setenv("OPENROUTER_API_KEY", "")

    r = client.post(
        "/dm/options",
        json={
            "session_id": "s1",
            "last_dm_text": "The corridor splits ahead, torches guttering.",
            "player_message": "",
            "state_section": "",
            "history": [],
            "last_roll": None,
        },
    )
    assert r.status_code == 200
    data = r.json()
    opts = data.get("options", [])
    assert len(opts) == 3
    assert all(o[0] in ("A", "B", "C") and o[1:3] == ". " for o in opts)
