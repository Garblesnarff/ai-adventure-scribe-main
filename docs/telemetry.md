Telemetry: Campaign-centric flow

Events
- campaign_hub_tab_viewed
  - When: User switches tabs in the campaign/game hub side panel (Character, Memories, Combat)
  - Payload:
    - campaignId: string
    - tab: 'character' | 'memory' | 'combat'
    - art_style: string (character.theme when available, else campaign.genre, else 'unknown')
    - featureFlags: object of enabled flags

- campaign_character_creation_started
  - When: User begins the character creation flow from a campaign hub or lands on the wizard with ?campaign=...
  - Payload:
    - campaignId: string
    - art_style: string (best-effort mapping as above)
    - featureFlags

- campaign_character_creation_completed
  - When: Character wizard successfully saves a character
  - Payload:
    - campaignId: string (from URL query ?campaign=... when available)
    - art_style: string (character.theme when available)
    - featureFlags

- ai_regenerate_clicked
  - When: User clicks regenerate/generate in the Character Finalization step
  - Payload:
    - kind: 'description' | 'avatar' | 'design_sheet'
    - campaignId
    - art_style
    - featureFlags

Implementation Notes
- Helper: src/services/analytics.ts wraps window.gtag and window.posthog.
- The helper gracefully no-ops if analytics globals are absent.
- Art style detection uses analytics.detectArtStyle({ characterTheme, campaignGenre }).

Wiring
- Game hub tabs: src/components/game/MemoryPanel.tsx (GameSidePanel) -> analytics.campaignTabViewed(...)
- Character wizard start: triggered from SimpleCampaignView CTA and on CharacterWizard mount
- Character wizard completion: src/components/character-creation/wizard/WizardContent.tsx after successful save
- AI regenerate clicks: src/components/character-creation/steps/CharacterFinalization.tsx in the three handlers

Testing
- Frontend tests mock the analytics module and assert it is called on relevant interactions.
- Backend RLS test is guarded and will skip when Supabase isn’t configured in CI.
