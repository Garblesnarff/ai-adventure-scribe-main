from typing import Dict, Any
from .agents import NarrativeDirector, RulesArbiter, ContinuityScribe


def run_turn(payload: Dict[str, Any]) -> Dict[str, Any]:
    nd = NarrativeDirector()
    ra = RulesArbiter()
    cs = ContinuityScribe()

    narrative = nd.run()
    rules = ra.run()
    continuity = cs.run()

    text = f"{narrative} | {rules} | {continuity}"
    return {"text": text, "narration_segments": [text], "roll_requests": []}
