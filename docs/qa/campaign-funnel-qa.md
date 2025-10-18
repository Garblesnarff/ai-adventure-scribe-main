QA Checklist: Campaign-first funnel

Scope
- Routing: Campaign view → character creation → game session start
- Telemetry: Analytics events for tab switches and character creation lifecycle
- Style: Art style propagation into AI regenerate actions

Preconditions
- A logged-in user
- At least one campaign exists (or create via wizard)

Manual Steps
1) Campaign Hub
- Open a campaign (e.g., /app/campaign/:id)
- Verify the gallery and campaign details render
- If no characters exist, click "Forge Your First Hero"
  - Expected: Navigates to /app/characters/create?campaign=:id
  - Expected: Analytics event campaign_character_creation_started fired

2) Game Hub Tabs (after starting a game or in existing session)
- Open /app/game/:campaignId?character=:characterId
- Toggle right-side panel tabs between Character / Memories / Combat
  - Expected: Analytics campaign_hub_tab_viewed fired per tab

3) Character Creation Completion
- Complete the character wizard with required fields (name, race, class, background, ability scores)
- Finish the final step to save
  - Expected: Success toast and navigation to /app/characters
  - Expected: Analytics campaign_character_creation_completed fired with campaignId from URL

4) AI Style Regeneration
- In Character Finalization step
  - Ensure character has a name so actions are enabled
  - Click "Regenerate with AI" on Description
  - Click "Generate/Regenerate Avatar"
  - Click "Generate/Regenerate Design Sheet"
  - Expected: Each click fires ai_regenerate_clicked with kind in {description, avatar, design_sheet}
  - Expected: Actions complete successfully or show clear errors if a key is missing

5) Backfill Messaging
- If character/background images continue generating after save, verify a toast is shown and UI remains stable

Notes
- Art style in analytics derives from character.theme when set; otherwise campaign.genre is used.
- Tests mock analytics; in production, gtag/posthog should receive events if configured.
