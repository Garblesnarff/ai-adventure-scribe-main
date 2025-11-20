from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
import httpx
import re
from textwrap import shorten
import time
import uuid
import json

app = FastAPI(title="CrewAI DM Orchestrator", version="0.1.0")

# CORS for local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://192.168.1.81:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def request_id_and_logging(request: Request, call_next):
    rid = request.headers.get("x-request-id") or str(uuid.uuid4())
    start = time.time()
    # Log request start
    print(json.dumps({
        "level": "info",
        "msg": "crewai.request.start",
        "requestId": rid,
        "method": request.method,
        "path": request.url.path,
        "client": request.client.host if request.client else None,
    }))
    response = await call_next(request)
    duration_ms = (time.time() - start) * 1000.0
    response.headers["x-request-id"] = rid
    print(json.dumps({
        "level": "info",
        "msg": "crewai.request.end",
        "requestId": rid,
        "status": response.status_code,
        "durationMs": round(duration_ms, 3),
    }))
    return response


class RollRequest(BaseModel):
    type: str
    formula: Optional[str] = None
    purpose: Optional[str] = None
    dc: Optional[int] = None
    ac: Optional[int] = None
    advantage: Optional[bool] = None
    disadvantage: Optional[bool] = None


class DMRequest(BaseModel):
    session_id: Optional[str] = None
    message: str
    context: dict
    state_section: Optional[str] = None
    history: Optional[List[dict]] = None


class NarrationSegment(BaseModel):
    type: str = "dm"
    text: str
    character: Optional[str] = None
    voice_category: Optional[str] = None


class DMResponse(BaseModel):
    text: str
    narration_segments: Optional[List[NarrationSegment]] = None
    roll_requests: Optional[List[RollRequest]] = None


class OptionsRequest(BaseModel):
    session_id: Optional[str] = None
    last_dm_text: str
    player_message: Optional[str] = None
    state_section: Optional[str] = None
    history: Optional[List[dict]] = None
    last_roll: Optional[dict] = None


class OptionsResponse(BaseModel):
    options: List[str]


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/dm/respond", response_model=DMResponse, response_model_exclude_none=True)
def respond(req: DMRequest):
    def build_lettered_options(kind: Optional[str], skill: Optional[str], success: Optional[bool]) -> str:
        # Returns a string with lettered options A./B./C. formatted as required
        options: List[str] = []
        sk = (skill or '').lower()
        if kind == "check":
            if sk in ("deception", "persuasion", "intimidation"):
                if success is True:
                    options = [
                        "A. **Slip away under the distraction**, moving quickly while their attention is elsewhere.",
                        "B. **Reposition for advantage**, circling behind cover to set up your next move.",
                        "C. **Press the bluff**, doubling down to steer them where you want."
                    ]
                else:
                    options = [
                        "A. **Duck into cover**, using shadows and obstacles to break line of sight.",
                        "B. **Change tactics**, shift to stealth or speed instead of misdirection.",
                        "C. **Create a louder diversion**, throw debris or shout from another angle."
                    ]
            elif sk in ("stealth",):
                if success is True:
                    options = [
                        "A. **Shadow the pursuers**, tailing them to learn their route.",
                        "B. **Slip past**, bypassing the danger to reach your objective.",
                        "C. **Set an ambush**, choose a chokepoint and prepare."
                    ]
                else:
                    options = [
                        "A. **Freeze and conceal**, minimize movement and sound.",
                        "B. **Break line of sight**, dash to sturdier cover immediately.",
                        "C. **Create a cover noise**, toss something to mask your movement."
                    ]
            elif sk in ("athletics", "acrobatics"):
                if success is True:
                    options = [
                        "A. **Scale the terrain**, gaining a high vantage to escape or observe.",
                        "B. **Dash through obstacles**, using momentum to widen the gap.",
                        "C. **Shove or trip**, hinder a pursuer to buy time."
                    ]
                else:
                    options = [
                        "A. **Retreat to safer footing**, then try a different approach.",
                        "B. **Use the environment**, topple a crate or door to block pursuit.",
                        "C. **Switch tactics**, avoid risky stunts and move cautiously."
                    ]
            else:
                # Generic check options
                if success is True:
                    options = [
                        "A. **Capitalize immediately**, act before the window closes.",
                        "B. **Gather more information**, probe for extra clues.",
                        "C. **Set up allies**, coordinate for a stronger follow‑through."
                    ]
                else:
                    options = [
                        "A. **Try a different angle**, apply another skill or approach.",
                        "B. **Leverage the environment**, find cover or tools nearby.",
                        "C. **Withdraw briefly**, reassess and plan your next move."
                    ]
        elif kind == "attack":
            if success is True:
                options = [
                    "A. **Press the attack**, keep the pressure on your target.",
                    "B. **Grapple or shove**, control their movement to gain advantage.",
                    "C. **Withdraw to cover**, reposition before their counterattack."
                ]
            else:
                options = [
                    "A. **Feint then strike**, change timing to throw them off.",
                    "B. **Disengage and reposition**, set up a better line or range.",
                    "C. **Switch tactics**, try a different target or approach."
                ]
        elif kind == "save":
            if success is True:
                options = [
                    "A. **Push the advantage**, advance while the danger subsides.",
                    "B. **Aid an ally**, help someone still in peril.",
                    "C. **Secure a safer position**, reduce future risk."
                ]
            else:
                options = [
                    "A. **Seek cover immediately**, minimize ongoing effects.",
                    "B. **Use a resource**, potion or feature to mitigate harm.",
                    "C. **Call for aid**, coordinate with allies."
                ]
        elif kind == "initiative":
            options = [
                "A. **Act decisively**, take the first aggressive move.",
                "B. **Hold and observe**, wait for an opening.",
                "C. **Reposition**, move to advantageous terrain."
            ]
        else:
            # Generic exploration options
            options = [
                "A. **Approach cautiously**, gather more information before acting.",
                "B. **Create a distraction**, change the situation in your favor.",
                "C. **Withdraw and reassess**, plan a better approach."
            ]

        return "\n" + "\n".join(options)

    # Detect if the player's message contains a dice result and produce an outcome narration
    def roll_followup_from_history() -> Optional[DMResponse]:
        m = (req.message or "").lower()
        # Extract numeric result from variants: "I rolled 12", "Rolled 1d20+3 = 15", "total: 10"
        result = None
        for pattern in [
            r"\bi\s*rolled\s*(\d+)\b",
            r"rolled[^\d]*(\d+)\b",
            r"\btotal\s*[:=]\s*(\d+)\b",
        ]:
            mm = re.search(pattern, m)
            if mm:
                try:
                    result = int(mm.group(1))
                    break
                except Exception:
                    pass

        if result is None:
            return None

        # Find the most recent assistant prompt that requested a roll
        last_kind = None
        last_skill = None
        last_dc: Optional[int] = None
        last_ac: Optional[int] = None

        history = req.history or []
        for h in reversed(history[-8:]):  # search last few messages
            if (h or {}).get("role") != "assistant":
                continue
            content = ((h or {}).get("content") or "").lower()

            # Check/save
            m_dc = re.search(r"\b(?:dc|difficulty\s*class)\s*(\d+)\b", content)
            if m_dc:
                try:
                    last_dc = int(m_dc.group(1))
                except Exception:
                    pass

            # Attack vs AC
            m_ac = re.search(r"\b(?:ac)\s*(\d+)\b", content)
            if m_ac:
                try:
                    last_ac = int(m_ac.group(1))
                except Exception:
                    pass

            if any(kw in content for kw in ["initiative", "roll initiative"]):
                last_kind = "initiative"
                break

            # Detect skill check phrasing
            skill_list = [
                "stealth", "perception", "investigation", "athletics", "acrobatics",
                "insight", "persuasion", "deception", "intimidation", "survival",
                "arcana", "history", "religion", "nature", "medicine", "performance",
                "sleight of hand", "animal handling"
            ]
            for s in skill_list:
                if f"{s} check" in content or f"roll {s}" in content or f"roll for {s}" in content:
                    last_kind = "check"
                    last_skill = s
                    break
            if last_kind:
                break

            # Saving throw detection
            saves = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]
            for abil in saves:
                if f"{abil} saving throw" in content:
                    last_kind = "save"
                    last_skill = abil
                    break
            if last_kind:
                break

            # Attack roll detection
            if "attack roll" in content or "make an attack" in content or "please roll attack" in content:
                last_kind = "attack"
                break

        # Default targets if not found
        if last_kind == "check" and last_dc is None:
            last_dc = 12  # reasonable default DC for simple tasks
        if last_kind == "save" and last_dc is None:
            last_dc = 13
        if last_kind == "attack" and last_ac is None:
            last_ac = 13

        # Build outcome text heuristically
        def outcome_line(kind: Optional[str], skill: Optional[str], dc: Optional[int], ac: Optional[int], total: int) -> str:
            if kind == "initiative":
                return f"Initiative noted: {total}."
            if kind == "attack":
                if ac is None:
                    return f"Your attack roll is {total}."
                return f"Your attack roll is {total} {'(hit)' if total >= ac else '(miss)'}."
            if kind == "save":
                if dc is None:
                    return f"Your saving throw total is {total}."
                return f"Your {skill or 'saving'} throw is {total} {'(success)' if total >= dc else '(failure)'}."
            if kind == "check":
                if dc is None:
                    return f"Your {skill or 'ability'} check totals {total}."
                ok = total >= dc
                return f"Your {skill or 'ability'} check is {total} {'(success)' if ok else '(failure)'}."
            # Unknown kind
            return f"Roll total recorded: {total}."

        summary = outcome_line(last_kind, last_skill, last_dc, last_ac, result)
        # Determine success for options where applicable
        success_flag: Optional[bool] = None
        if last_kind in ("check", "save") and last_dc is not None:
            success_flag = result >= last_dc
        if last_kind == "attack" and last_ac is not None:
            success_flag = result >= last_ac

        # Build lettered options at the end
        text = summary + " " + "What do you do next?" + build_lettered_options(last_kind, last_skill, success_flag)
        seg = [NarrationSegment(type="dm", text=text)]
        return DMResponse(text=text, narration_segments=seg, roll_requests=[])

    followup = roll_followup_from_history()
    if followup is not None:
        return followup
    # Helper to build heuristic response (no external API)
    def heuristic_response() -> DMResponse:
        m = (req.message or "").lower()
        roll_requests: List[RollRequest] = []
        dc_match = re.search(r"\b(?:dc|difficulty\s*class)\s*(\d+)\b", m, re.IGNORECASE)
        parsed_dc = int(dc_match.group(1)) if dc_match else None

        if "initiative" in m:
            roll_requests.append(RollRequest(type="initiative", formula="1d20+2", purpose="Roll initiative"))
        if "attack" in m:
            roll_requests.append(RollRequest(type="attack", formula="1d20+5", purpose="Attack roll", ac=13))

        skills = [
            "stealth", "perception", "investigation", "athletics", "acrobatics",
            "insight", "persuasion", "deception", "intimidation", "survival",
            "arcana", "history", "religion", "nature", "medicine", "performance",
            "sleight of hand", "animal handling"
        ]
        # Synonym-based detection to improve roll requests
        synonyms = [
            ("stealth", ["sneak", "sneaking", "sneakily", "quiet", "quietly", "hide", "hidden", "shadows", "creep", "silently", "tiptoe"]),
            ("deception", ["diversion", "distract", "distracting", "bluff", "mislead", "decoy"]),
            ("athletics", ["throw", "toss", "hurl", "shove", "lift", "climb", "jump", "grapple"]),
            ("acrobatics", ["tumble", "flip", "balance", "dodge", "roll away"]),
            ("persuasion", ["persuade", "convince", "appeal", "negotiate", "bargain", "charm"]),
            ("intimidation", ["intimidate", "threaten", "menace", "coerce", "scare"]),
            ("investigation", ["search", "examine", "inspect", "analyze", "study", "look over"]),
            ("perception", ["look", "listen", "scan", "spot", "notice", "observe", "hear"]),
            ("sleight of hand", ["pickpocket", "palm", "conceal", "snatch", "nimble fingers"]),
            ("survival", ["track", "forage", "navigate", "trail"]),
        ]
        detected_skill = None
        for skill_name, words in synonyms:
            if any(w in m for w in words):
                detected_skill = skill_name
                break
        for skill in skills:
            if skill in m or f"roll for {skill}" in m:
                purpose = f"{skill.title()} check"
                roll_requests.append(RollRequest(type="check", formula="1d20+3", purpose=purpose, dc=parsed_dc))
                break
        if detected_skill and not any(r.type == "check" for r in roll_requests):
            purpose = f"{detected_skill.title()} check"
            roll_requests.append(RollRequest(type="check", formula="1d20+3", purpose=purpose, dc=parsed_dc))

        if "check" in m and not any(r.type == "check" for r in roll_requests):
            roll_requests.append(RollRequest(type="check", formula="1d20+3", purpose="Ability check", dc=parsed_dc))
        if "save" in m:
            roll_requests.append(RollRequest(type="save", formula="1d20+2", purpose="Saving throw", dc=parsed_dc))

        # Build a concise text: if a roll is requested, prompt for the roll; otherwise provide a brief narrative nudge
        if len(roll_requests) > 0:
            rr = roll_requests[0]
            type_label = {
                "check": "Check",
                "save": "Saving Throw",
                "attack": "Attack",
                "damage": "Damage",
                "initiative": "Initiative",
            }.get(rr.type, rr.type.title())
            purpose = rr.purpose or type_label
            target = f" (DC {rr.dc})" if rr.dc is not None else (f" (AC {rr.ac})" if rr.ac is not None else "")
            text = f"Please roll {purpose}{target}."
        else:
            base = "The scene awaits your action. Describe what you do next—I'll respond with clear consequences and options."
            # Inline options are disabled by default; enable via INLINE_OPTIONS=true
            def _truthy(v: Optional[str]) -> bool:
                return str(v or '').strip().lower() in ("1", "true", "yes", "on")
            if _truthy(os.getenv("INLINE_OPTIONS")) and "A." not in base:
                text = base + build_lettered_options(None, None, None)
            else:
                text = base

        seg = [NarrationSegment(type="dm", text=text)]
        return DMResponse(text=text, narration_segments=seg, roll_requests=roll_requests)

    # If OpenRouter API key is present, attempt generation, otherwise use heuristic
    api_key = os.getenv("OPENROUTER_API_KEY")
    requested_model = os.getenv("OPENROUTER_MODEL")

    if api_key:
        try:
            messages = []
            messages.append({
                "role": "system",
                "content": (
                    "You are a D&D 5e Dungeon Master. Keep responses concise (<= 3 short paragraphs). "
                    "Use direct quoted NPC dialogue. End with 2-3 lettered options (A./B./C.)."
                ),
            })

            ctx_bits = []
            if req.state_section:
                ctx_bits.append(req.state_section)
            if req.history:
                last_history = req.history[-5:]
                hist_text = "\n".join([f"{m.get('role')}: {m.get('content')}" for m in last_history])
                ctx_bits.append("RECENT HISTORY:\n" + hist_text)

            ctx_str = ("\n\n".join(ctx_bits)).strip()
            user_content = (ctx_str + "\n\nPlayer: " + (req.message or "")).strip()

            messages.append({"role": "user", "content": user_content})

            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                # Helpful (sometimes required) for OpenRouter
                "HTTP-Referer": os.getenv("OPENROUTER_SITE_URL", "http://localhost:3000"),
                "X-Title": os.getenv("OPENROUTER_TITLE", "Infinite Realms (local)"),
            }

            # Try requested model, then a known free fallback
            models_to_try = []
            if requested_model:
                models_to_try.append(requested_model)
            if "google/gemini-2.0-flash-exp:free" not in models_to_try:
                models_to_try.append("google/gemini-2.0-flash-exp:free")

            with httpx.Client(timeout=30.0) as client:
                last_err = None
                for mdl in models_to_try:
                    payload = {
                        "model": mdl,
                        "messages": messages,
                        "temperature": 0.8,
                        "max_tokens": 600,
                    }
                    try:
                        r = client.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload)
                        if r.status_code == 200:
                            data = r.json()
                            text = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                            # Build heuristic roll requests from the player's message
                            roll_requests: List[RollRequest] = []
                            m = (req.message or "").lower()
                            dc_match = re.search(r"\b(?:dc|difficulty\s*class)\s*(\d+)\b", m, re.IGNORECASE)
                            parsed_dc = int(dc_match.group(1)) if dc_match else None

                            if "initiative" in m:
                                roll_requests.append(RollRequest(type="initiative", formula="1d20+2", purpose="Roll initiative"))
                            if "attack" in m:
                                roll_requests.append(RollRequest(type="attack", formula="1d20+5", purpose="Attack roll", ac=13))

                            skills = [
                                "stealth", "perception", "investigation", "athletics", "acrobatics",
                                "insight", "persuasion", "deception", "intimidation", "survival",
                                "arcana", "history", "religion", "nature", "medicine", "performance",
                                "sleight of hand", "animal handling"
                            ]
                            # Synonym-based detection to improve roll requests
                            synonyms = [
                                ("stealth", ["sneak", "sneaking", "sneakily", "quiet", "quietly", "hide", "hidden", "shadows", "creep", "silently", "tiptoe"]),
                                ("deception", ["diversion", "distract", "distracting", "bluff", "mislead", "decoy"]),
                                ("athletics", ["throw", "toss", "hurl", "shove", "lift", "climb", "jump", "grapple"]),
                                ("acrobatics", ["tumble", "flip", "balance", "dodge", "roll away"]),
                                ("persuasion", ["persuade", "convince", "appeal", "negotiate", "bargain", "charm"]),
                                ("intimidation", ["intimidate", "threaten", "menace", "coerce", "scare"]),
                                ("investigation", ["search", "examine", "inspect", "analyze", "study", "look over"]),
                                ("perception", ["look", "listen", "scan", "spot", "notice", "observe", "hear"]),
                                ("sleight of hand", ["pickpocket", "palm", "conceal", "snatch", "nimble fingers"]),
                                ("survival", ["track", "forage", "navigate", "trail"]),
                            ]
                            detected_skill = None
                            for skill_name, words in synonyms:
                                if any(w in m for w in words):
                                    detected_skill = skill_name
                                    break
                            for skill in skills:
                                if skill in m or f"roll for {skill}" in m:
                                    purpose = f"{skill.title()} check"
                                    roll_requests.append(RollRequest(type="check", formula="1d20+3", purpose=purpose, dc=parsed_dc))
                                    break
                            if detected_skill and not any(r.type == "check" for r in roll_requests):
                                purpose = f"{detected_skill.title()} check"
                                roll_requests.append(RollRequest(type="check", formula="1d20+3", purpose=purpose, dc=parsed_dc))

                            if "check" in m and not any(r.type == "check" for r in roll_requests):
                                roll_requests.append(RollRequest(type="check", formula="1d20+3", purpose="Ability check", dc=parsed_dc))
                            if "save" in m:
                                roll_requests.append(RollRequest(type="save", formula="1d20+2", purpose="Saving throw", dc=parsed_dc))

                            # Inline options only if explicitly enabled
                            def _truthy(v: Optional[str]) -> bool:
                                return str(v or '').strip().lower() in ("1", "true", "yes", "on")
                            if _truthy(os.getenv("INLINE_OPTIONS")) and len(roll_requests) == 0 and "A." not in text:
                                text = (text or "").rstrip() + " " + "What do you do next?" + build_lettered_options(None, None, None)

                            seg = [NarrationSegment(type="dm", text=text)]
                            return DMResponse(text=text, narration_segments=seg, roll_requests=roll_requests)
                        else:
                            print("OpenRouter non-200 for", mdl, ":", r.status_code, r.text[:200])
                            last_err = f"{r.status_code}: {r.text[:200]}"
                    except Exception as call_err:
                        print("OpenRouter call error for", mdl, ":", repr(call_err))
                        last_err = repr(call_err)

                # If all models fail, use heuristic
                if last_err:
                    print("OpenRouter all attempts failed, using heuristic. Last error:", last_err)
                return heuristic_response()

                # Build heuristic roll requests from the player's message
                roll_requests: List[RollRequest] = []
                m = (req.message or "").lower()
                dc_match = re.search(r"\b(?:dc|difficulty\s*class)\s*(\d+)\b", m, re.IGNORECASE)
                parsed_dc = int(dc_match.group(1)) if dc_match else None

                if "initiative" in m:
                    roll_requests.append(RollRequest(type="initiative", formula="1d20+2", purpose="Roll initiative"))
                if "attack" in m:
                    roll_requests.append(RollRequest(type="attack", formula="1d20+5", purpose="Attack roll", ac=13))

                skills = [
                    "stealth", "perception", "investigation", "athletics", "acrobatics",
                    "insight", "persuasion", "deception", "intimidation", "survival",
                    "arcana", "history", "religion", "nature", "medicine", "performance",
                    "sleight of hand", "animal handling"
                ]
                for skill in skills:
                    if skill in m or f"roll for {skill}" in m:
                        purpose = f"{skill.title()} check"
                        roll_requests.append(RollRequest(type="check", formula="1d20+3", purpose=purpose, dc=parsed_dc))
                        break

                if "check" in m and not any(r.type == "check" for r in roll_requests):
                    roll_requests.append(RollRequest(type="check", formula="1d20+3", purpose="Ability check", dc=parsed_dc))
                if "save" in m:
                    roll_requests.append(RollRequest(type="save", formula="1d20+2", purpose="Saving throw", dc=parsed_dc))

                seg = [NarrationSegment(type="dm", text=text)]
                return DMResponse(text=text, narration_segments=seg, roll_requests=roll_requests)
        except Exception as e:
            # Fallback instead of throwing 500
            print("OpenRouter call failed:", repr(e))
            return heuristic_response()

    # No API key or disabled: use heuristic
    return heuristic_response()


@app.post("/dm/options", response_model=OptionsResponse, response_model_exclude_none=True)
def generate_options(req: OptionsRequest):
    def normalize_options(raw: str) -> List[str]:
        lines = [ln.strip() for ln in raw.splitlines() if ln.strip()]
        picked: List[str] = []
        for ln in lines:
            m = re.match(r"^([A-C])\.\s*(.*)$", ln)
            if m:
                body = m.group(2).strip()
                # ensure bold action before comma
                if "," in body:
                    head, tail = body.split(",", 1)
                    formatted = f"{m.group(1)}. **{head.strip()}**, {tail.strip()}"
                else:
                    formatted = f"{m.group(1)}. **{body}**"
                picked.append(formatted)
        # If less than 3 extracted, pad with generic
        while len(picked) < 3:
            idx = len(picked)
            label = ["A", "B", "C"][idx]
            picked.append(f"{label}. **Explore another angle**, adapt your approach to the situation.")
        return picked[:3]

    api_key = os.getenv("OPENROUTER_API_KEY")
    base_headers = {
        "Authorization": f"Bearer {api_key}" if api_key else "",
        "Content-Type": "application/json",
        "HTTP-Referer": os.getenv("OPENROUTER_SITE_URL", "http://localhost:3000"),
        "X-Title": os.getenv("OPENROUTER_TITLE", "Infinite Realms (local)"),
    }

    # Detect combat state
    is_combat = False
    if req.state_section:
        is_combat = "COMBAT: ACTIVE" in req.state_section or "COMBAT STATE - ACTIVE" in req.state_section

    # Build prompts based on combat state
    if is_combat:
        system = (
            "You craft exactly three tactical combat options for a D&D 5e battle. "
            "Output must be ONLY three lines, each starting with a capital letter and period (A./B./C.), "
            "formatted as: A. **Action Name**, brief tactical description. "
            "Focus on: attacking specific targets, defensive maneuvers, tactical positioning, "
            "using abilities/items/spells, helping allies, or strategic retreat. "
            "Ground options in combat state, initiative order, and last action taken."
        )
    else:
        system = (
            "You craft exactly three concise, story-appropriate action options for a D&D scene. "
            "Output must be ONLY three lines, each starting with a capital letter and period (A./B./C.), "
            "formatted as: A. **Action Name**, brief description. Avoid dice prompts; avoid meta. "
            "Vary approaches (social/stealth/combat/investigation) and ground in provided context."
        )

    ctx_bits: List[str] = []
    if req.state_section:
        ctx_bits.append(shorten(f"STATE\n{req.state_section}", width=1200, placeholder="…"))
    if req.last_roll:
        # minimal summary if present
        try:
            kind = req.last_roll.get("kind")
            skill = req.last_roll.get("skill")
            dc = req.last_roll.get("dc")
            ac = req.last_roll.get("ac")
            result = req.last_roll.get("result")
            summary = f"Last roll: {kind or ''} {skill or ''} {result or ''} vs DC {dc or ''}{' vs AC ' + str(ac) if ac else ''}"
            ctx_bits.append(summary)
        except Exception:
            pass
    if req.history:
        try:
            last_history = req.history[-5:]
            hist = "\n".join([f"{h.get('role')}: {h.get('content')}" for h in last_history])
            ctx_bits.append("RECENT:\n" + shorten(hist, width=1200, placeholder="…"))
        except Exception:
            pass
    ctx_bits.append("LAST_DM:\n" + shorten(req.last_dm_text or "", width=1400, placeholder="…"))
    if req.player_message:
        ctx_bits.append("PLAYER:\n" + shorten(req.player_message, width=400, placeholder="…"))

    user = "\n\n".join([b for b in ctx_bits if b]) + "\n\nReturn only the three lettered lines."

    # If no key, fallback to heuristic generic options
    if not api_key:
        generic = [
            "A. **Approach cautiously**, gather information before acting.",
            "B. **Create a distraction**, shift attention in your favor.",
            "C. **Withdraw and reassess**, plan a better approach.",
        ]
        return OptionsResponse(options=generic)

    try:
        with httpx.Client(timeout=20.0) as client:
            payload = {
                "model": "z-ai/glm-4.5-air:free",
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                "temperature": 0.7,
                "top_p": 0.9,
                "max_tokens": 220,
                "reasoning": {"enabled": False},
            }
            r = client.post("https://openrouter.ai/api/v1/chat/completions", headers=base_headers, json=payload)
            if r.status_code != 200:
                print("/dm/options non-200:", r.status_code, r.text[:200])
                raise HTTPException(status_code=502, detail="OpenRouter error")
            data = r.json()
            text = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            return OptionsResponse(options=normalize_options(text))
    except Exception as e:
        print("/dm/options error:", repr(e))
        # Fallback generic options
        fallback = [
            "A. **Approach cautiously**, gather information before acting.",
            "B. **Create a distraction**, shift attention in your favor.",
            "C. **Withdraw and reassess**, plan a better approach.",
        ]
        return OptionsResponse(options=fallback)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
