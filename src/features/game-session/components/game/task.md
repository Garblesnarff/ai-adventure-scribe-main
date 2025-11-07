I am experiencing the following issue:

<bug>
It appears that not everything in the code is conneting corretly. We are supposed to have enhanced DM prompting for the opening scene, as well as combat and stuff. We're supposed to have a proper combat system, with dice rolling, skill checks, effect tracking ect. 

None of that works. I don't see any combat centered pop ups, the AI DM doesn't direct the gameplay well. The entire combat system (check the recent few git commits) was created with AI (the entire codebase was actually). It made lots and lots of changes, so i assume that it actually coded the combat system, but it might not all be connected correctly.

<campaign_description>
In the sleepy, rural town of Ravenswood, a sense of unease settles over the residents like a shroud. It's been three days since the local children's hospital was evacuated due to a mysterious outbreak, and the townsfolk are on edge. Rumors of a malevolent presence haunting the abandoned halls have begun to circulate, and the once-quiet streets are now filled with an air of dread. As outsiders, you've been drawn to Ravenswood by the promise of answers and the need to uncover the truth behind the hospital's sudden closure. Your investigation will take you into the heart of darkness, where the lines between reality and nightmare are blurred. As you approach the hospital, the atmosphere grows thick with an unsettling energy. The building looms before you, its windows like empty eyes staring back. You can feel the weight of the town's fear bearing down upon you, and the silence is oppressive. Your mission is to explore the abandoned hospital, uncover the source of the evil that has taken hold, and put an end to it. But be warned: the forces of darkness that reside within those walls will not give up their secrets easily. You will need to steel yourselves for the horrors that await, and be prepared to face the darkness head-on. This one-shot campaign is designed for those who dare to confront the unknown, and is suitable for players of all experience levels. The difficulty is balanced to provide a chilling experience without being overwhelming, allowing you to focus on the story and the terrifying atmosphere that pervades it. As you delve into the heart of the hospital, you will encounter unspeakable horrors, make difficult choices, and confront the ultimate evil that has taken hold of Ravenswood. Will you be able to survive the night and uncover the truth, or will you succumb to the darkness that lurks within? The fate of Ravenswood hangs in the balance, and the choice is yours.
</campaign_description>
<opening_message>
The chill wind whips at your robes as you stand at the edge of Ravenswood. The town itself, usually a quaint collection of wooden buildings nestled against the whispering forest, feels unnaturally still. The scent of pine and damp earth is now tinged with a faint, metallic odor that tickles the back of your throat.  Three days. Three days since the whispers began, since the lights flickered out at the St. Jude's Children's Hospital, and since the townsfolk started locking their doors before dusk.  The imposing silhouette of the hospital now looms before you, a monolithic shadow against the bruised twilight sky. Its brick facade is stained with age and neglect, and the broken panes of its upper windows stare like vacant, accusing eyes. You can almost feel the weight of the fear clinging to the air, a palpable tension that presses in on your senses. Eldric, your keen elven eyes, honed by years of studying arcane lore, can detect faint, unnatural currents in the air around the building, a subtle dissonance that sets your teeth on edge. This is no mere illness; this is something far older and far more sinister.
</openeing_message>

<browser_console>
use-simple-game-session.ts:130 📚 No existing sessions found, creating first session
SimpleGameChatWithVoice.tsx:125 📚 Loading conversation history for session: cb0d47ae-37c7-421a-8aa8-dadb53a9ad44
SimpleGameChatWithVoice.tsx:155 📚 No message history found, generating opening message
SimpleGameChatWithVoice.tsx:70 🎭 Generating opening message for new session...
ai-service.ts:165 Using local Gemini API for chat...
ai-service.ts:177 📚 Retrieved 0 relevant memories
voice-consistency-service.ts:53 🎭 Getting voice context for session: cb0d47ae-37c7-421a-8aa8-dadb53a9ad44
voice-consistency-service.ts:185 ⚠️ Voice consistency database not available, using in-memory mapping
voice-consistency-service.ts:71 📋 Voice context: {knownCharacters: Array(0), availableCategories: 12}
ai-service.ts:188 🎭 Retrieved voice context for 0 known characters
ai-service.ts:196 ⚔️ Combat detection: NO (confidence: 0%)
gemini-api-manager.ts:275 🔑 Attempt 1: Using API key AIzaSyC8BW... (index: 1)
ai-service.ts:473 🎭 Successfully parsed structured voice response
ai-service.ts:476 📥 RAW AI RESPONSE: {
  "text": "The chill wind whips at your robes as you stand at the edge of Ravenswood. The town itself, usually a quaint collection of wooden buildings nestled against the whispering forest, feels unnaturally still. The scent of pine and damp earth is now tinged with a faint, metallic odor that tickles the back of your throat.  Three days. Three days since the whispers began, since the lights flickered out at the St. Jude's Children's Hospital, and since the townsfolk started locking their doors before dusk.  The imposing silhouette of the hospital now looms before you, a monolithic shadow against the bruised twilight sky. Its brick facade is stained with age and neglect, and the broken panes of its upper windows stare like vacant, accusing eyes. You can almost feel the weight of the fear clinging to the air, a palpable tension that presses in on your senses. Eldric, your keen elven eyes, honed by years of studying arcane lore, can detect faint, unnatural currents in the air around the building, a subtle dissonance that sets your teeth on edge. This is no mere illness; this is something far older and far more sinister.",
  "narration_segments": [
    {
      "type": "dm",
      "text": "The chill wind whips at your robes as you stand at the edge of Ravenswood. The town itself, usually a quaint collection of wooden buildings nestled against the whispering forest, feels unnaturally still. The scent of pine and damp earth is now tinged with a faint, metallic odor that tickles the back of your throat. Three days. Three days since the whispers began, since the lights flickered out at the St. Jude's Children's Hospital, and since the townsfolk started locking their doors before dusk. The imposing silhouette of the hospital now looms before you, a monolithic shadow against the bruised twilight sky. Its brick facade is stained with age and neglect, and the broken panes of its upper windows stare like vacant, accusing eyes. You can almost feel the weight of the fear clinging to the air, a palpable tension that presses in on your senses.",
      "character": null,
      "voice_category": null
    },
    {
      "type": "dm",
      "text": "Eldric, your keen elven eyes, honed by years of studying arcane lore, can detect faint, unnatural currents in the air around the building, a subtle dissonance that sets your teeth on edge. This is no mere illness; this is something far older and far more sinister.",
      "character": null,
      "voice_category": null
    }
  ]
}
ai-service.ts:479 📊 AI SEGMENTS ANALYSIS:
ai-service.ts:481   Segment 1: {type: 'dm', character: null, voice_category: null, text_length: 857, text_preview: 'The chill wind whips at your robes as you stand at...'}
ai-service.ts:481   Segment 2: {type: 'dm', character: null, voice_category: null, text_length: 264, text_preview: 'Eldric, your keen elven eyes, honed by years of st...'}
ai-service.ts:542 Successfully generated DM response using local Gemini API
voice-consistency-service.ts:104 🎪 Processing voice assignments for 2 segments
voice-consistency-service.ts:185 ⚠️ Voice consistency database not available, using in-memory mapping
voice-consistency-service.ts:172 🎯 Voice assignments completed: narrator(narrator), narrator(narrator)
ai-service.ts:557 🎪 Processed voice assignments for character consistency
gemini-api-manager.ts:275 🔑 Attempt 1: Using API key AIzaSyC8BW... (index: 1)
memory-manager.ts:148 ✅ Saved 4 memories
ai-service.ts:582 🧠 Extracted and saved 4 memories
world-builder-service.ts:72 User does not own campaign, allowing for MVP: d2d8377d-183a-41fe-baed-f7f40bb12357
validateUserCampaignAccess @ world-builder-service.ts:72
await in validateUserCampaignAccess
respondToPlayerAction @ world-builder-service.ts:269
chatWithDM @ ai-service.ts:590
await in chatWithDM
(anonymous) @ SimpleGameChatWithVoice.tsx:71
(anonymous) @ SimpleGameChatWithVoice.tsx:157
await in (anonymous)
(anonymous) @ SimpleGameChatWithVoice.tsx:173
commitHookEffectListMount @ chunk-FJ2A54M7.js?v=bcc2d4b2:16915
commitPassiveMountOnFiber @ chunk-FJ2A54M7.js?v=bcc2d4b2:18156
commitPassiveMountEffects_complete @ chunk-FJ2A54M7.js?v=bcc2d4b2:18129
commitPassiveMountEffects_begin @ chunk-FJ2A54M7.js?v=bcc2d4b2:18119
commitPassiveMountEffects @ chunk-FJ2A54M7.js?v=bcc2d4b2:18109
flushPassiveEffectsImpl @ chunk-FJ2A54M7.js?v=bcc2d4b2:19490
flushPassiveEffects @ chunk-FJ2A54M7.js?v=bcc2d4b2:19447
performSyncWorkOnRoot @ chunk-FJ2A54M7.js?v=bcc2d4b2:18868
flushSyncCallbacks @ chunk-FJ2A54M7.js?v=bcc2d4b2:9119
commitRootImpl @ chunk-FJ2A54M7.js?v=bcc2d4b2:19432
commitRoot @ chunk-FJ2A54M7.js?v=bcc2d4b2:19277
finishConcurrentRender @ chunk-FJ2A54M7.js?v=bcc2d4b2:18805
performConcurrentWorkOnRoot @ chunk-FJ2A54M7.js?v=bcc2d4b2:18718
workLoop @ chunk-FJ2A54M7.js?v=bcc2d4b2:197
flushWork @ chunk-FJ2A54M7.js?v=bcc2d4b2:176
performWorkUntilDeadline @ chunk-FJ2A54M7.js?v=bcc2d4b2:384
world-builder-service.ts:299 📝 No world building needed (confidence: 0.2)
use-progressive-voice.ts:95 🔑 Attempting to retrieve ElevenLabs API key...
use-progressive-voice.ts:99 📝 Environment check: {hasEnvKey: false, keyLength: 0, keyPrefix: 'N/A'}
use-progressive-voice.ts:112 🔄 No environment variable found, trying Supabase edge function...
use-progressive-voice.ts:125 ✅ Retrieved ElevenLabs API key from Supabase secrets
</browser_console>
</bug>

I need your help to identify the exact cause of this bug and implement an effective solution. To do this, carefully follow the workflow below, in this specific order:

Workflow:

Step 1: Clarification (if needed)
- If any part of this prompt is unclear or confusing, ask clarifying questions before proceeding.
- Do not ask questions unnecessarily… only ask if essential information is missing.

Step 2: Deeply Understand the Issue (Ultrathink)
- Carefully review and analyze the entire relevant codebase.
- Trace through the code step-by-step until you fully understand the bug and all relevant context.
- Continue analyzing until you feel completely confident in your understanding. If in doubt, research more deeply. It’s better to over-research than under-research.

Step 3: Special Case (if the cause is extremely obvious)
- If, after completing Step 2, you identify the root cause with extremely high confidence (95%+ certainty), explicitly state this clearly. Be realistic here. Do NOT be overconfident.
- In this scenario, instead of generating unrelated causes (see below for context), propose multiple practical variations of fixes for this single, clearly identified cause.
- Then proceed directly to Step 7 (Implementation), creating separate sub-agents and git worktrees for each variation, and implementing each fix independently.

Step 4: Identify Possible Causes (if cause is not extremely obvious)
- Thoughtfully generate a comprehensive list of at least 20 plausible causes for the bug.
- Be thorough. Explore various angles, even ones that initially seem less likely.

Step 5: Refine and Prioritize Causes
- Carefully review your list from Step 4.
- Remove theories that don’t hold up upon closer analysis.
- Combine related or overlapping theories into clearer, more likely scenarios.
- Add any additional theories you may have initially missed.
- Clearly rewrite and finalize this refined list.

Step 6: Rank by Likelihood
- Rank your refined theories clearly and explicitly, ordering them from most likely to least likely based on the probability of each theory being the true root cause.

Step 7: Propose Solutions
- For each of the top 10 most likely causes, clearly outline a practical and actionable solution to fix the issue.

Step 8: Implement Solutions Using Sub-agents
- For each of these top 10 cause/solution pairs (or multiple variations in the Special Case scenario), create a separate sub-agent, each with its own git worktree.
- Each sub-agent should clearly understand the specific cause it’s addressing and implement the corresponding solution directly in its own git worktree.

Step 9: Test the Solutions
- If testing each solution is possible given your available resources, perform tests (one worktree at a time) to determine if the bug is fixed.
- “Possible” means you have the appropriate tools and resources (e.g., a CURL command for API bugs; browser access for frontend bugs).
- If testing is not possible due to resource limitations, clearly summarize the implemented solutions and provide explicit, step-by-step instructions for me to test each solution manually.

⸻

Please carefully and thoughtfully complete every step of this workflow, maintaining clear communication throughout. Keep me updated at each major step, but only pause if you encounter something that requires my input.