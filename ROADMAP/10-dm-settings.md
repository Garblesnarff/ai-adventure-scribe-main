# DM Settings & Personalization Architecture

## 🎭 Vision
Transform the AI Dungeon Master from a **one-size-fits-all narrator** to a **fully customizable personal storyteller** that evolves with each user's preferences, adapts to their persistent world's tone, and maintains consistency across multi-generational campaigns.

## The Personal DM Evolution

### Current: Static AI Narrator
```
User → Generic AI DM → Same style for everyone
```

### Future: Personalized Storytelling Companion
```
User 
└── Personal DM Profile (persistent, evolving)
    ├── Narrative Style Settings
    ├── World-Specific Adaptations
    ├── Learned Player Preferences
    ├── Campaign Era Adjustments
    └── Multi-Generational Consistency
```

---

## 🎮 Core Features

### 1. Narrative Style Customization
Users can fine-tune their DM's storytelling approach:

#### Tone & Atmosphere
- **Grimdark**: Brutal, unforgiving worlds with moral ambiguity
- **Heroic**: Classic good vs evil, inspiring adventures
- **Comedic**: Light-hearted, pun-filled, absurdist humor
- **Realistic**: Grounded, consequences matter, tactical
- **Mythic**: Epic scale, legendary deeds, divine intervention
- **Horror**: Psychological terror, cosmic dread, survival focus
- **Custom Blend**: Mix percentages of different tones

#### Descriptive Density
- **Minimalist**: "You enter the tavern. It's crowded."
- **Balanced**: "The warm tavern buzzes with conversation and clinking mugs."
- **Verbose**: "The ancient oak door groans as you push into the smoke-filled tavern, where the cacophony of drunken laughter mingles with a bard's melancholic tune..."
- **Dynamic**: Adjusts based on scene importance

#### Combat Narration
- **Mechanical**: "You hit for 12 damage. The orc has 3 HP remaining."
- **Cinematic**: "Your blade catches the moonlight as it arcs through the air, biting deep into the orc's shoulder!"
- **Tactical**: "Your strike exploits the opening in his guard. He staggers, favoring his left side now."
- **Brutal**: "Blood sprays as your blade finds its mark. The orc's scream is cut short."

### 2. World-Adaptive DM Behavior
The DM automatically adjusts based on your persistent world's current era and state:

#### Era-Specific Language
- **Medieval**: "By the gods!", "Mayhaps", "M'lord"
- **Steampunk**: "Blast these gears!", "Clockwork precision"
- **Cyberpunk**: "Neural spike detected", "Jack in, choom"
- **Post-Apocalyptic**: "Before the fall", "Scav territory ahead"

#### Technology & Magic Balance
- Adjusts descriptions based on world's tech/magic levels
- References appropriate tools, weapons, and concepts
- Maintains consistency with world's established rules

#### Cultural Memory Integration
- References past campaigns naturally
- NPCs remember player's ancestral deeds
- Weaves world history into current narrative

### 3. Mechanical Preferences

#### Rules Enforcement
- **Rules as Written (RAW)**: Strict D&D 5e adherence
- **Rules as Fun (RAF)**: Flexible, rule of cool applies
- **Narrative First**: Story trumps mechanics
- **Homebrew Friendly**: Custom rules welcomed
- **Old School**: Deadly, resource management focus

#### Dice & Randomness
- **Player Rolls**: "Roll a d20 for perception"
- **DM Rolls Hidden**: AI handles all dice secretly
- **Narrative Resolution**: No dice, story-based outcomes
- **Hybrid**: Important moments use dice, rest is narrative

#### Difficulty & Challenge
- **Tutorial Mode**: Gentle guidance, forgiving failures
- **Standard**: Balanced challenge and reward
- **Hardcore**: Death is permanent, resources scarce
- **Dark Souls**: Prepare to die, repeatedly
- **Adaptive**: Adjusts based on player success rate

### 4. Interactive Behavior

#### Pacing Control
- **Player-Led**: Waits for explicit actions
- **Proactive**: DM introduces events and complications
- **Real-Time**: Events happen with or without player action
- **Chapter-Based**: Clear act breaks and transitions

#### NPC Personality Depth
- **Simple**: Basic motivations and reactions
- **Complex**: Full personalities, hidden agendas
- **Memorable**: Distinct voices, catchphrases, quirks
- **Realistic**: Nuanced, contradictory, human

#### World Reactivity
- **Static**: World waits for player
- **Living**: World evolves independently
- **Butterfly Effect**: Small actions have large consequences
- **Persistent**: Changes permanent across campaigns

### 5. Content Filters & Boundaries

#### Content Maturity
- **Family Friendly**: G-rated content only
- **Teen**: Mild violence, no explicit content
- **Mature**: Adult themes, realistic violence
- **Unrestricted**: Full creative freedom

#### Topic Boundaries
- Toggle specific content types on/off:
  - Romance/relationships
  - Gore/graphic violence
  - Political themes
  - Religious themes
  - Mental health topics
  - Body horror
  - Slavery/oppression

#### Safety Tools
- **X-Card**: Skip uncomfortable content instantly
- **Lines & Veils**: Pre-set hard and soft boundaries
- **Fade to Black**: Skip detailed descriptions
- **Content Warnings**: Alert before sensitive content

---

## 🏗️ Technical Implementation

### Database Schema

```sql
-- DM Profiles: One per user, evolves over time
CREATE TABLE dm_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    world_id UUID REFERENCES user_worlds(id),
    profile_name TEXT DEFAULT 'My DM',
    
    -- Style Settings
    tone_settings JSONB DEFAULT '{}',
    narrative_density TEXT DEFAULT 'balanced',
    combat_style TEXT DEFAULT 'cinematic',
    
    -- Mechanical Preferences
    rules_style TEXT DEFAULT 'balanced',
    dice_handling TEXT DEFAULT 'player_rolls',
    difficulty_mode TEXT DEFAULT 'standard',
    
    -- Behavior Settings
    pacing_style TEXT DEFAULT 'player_led',
    npc_depth TEXT DEFAULT 'complex',
    world_reactivity TEXT DEFAULT 'living',
    
    -- Content Settings
    maturity_rating TEXT DEFAULT 'teen',
    content_boundaries JSONB DEFAULT '[]',
    safety_tools JSONB DEFAULT '{}',
    
    -- Learning & Adaptation
    learned_preferences JSONB DEFAULT '{}',
    player_statistics JSONB DEFAULT '{}',
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(user_id, world_id)
);

-- DM Learning History: Tracks preferences over time
CREATE TABLE dm_learning_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES dm_profiles(id),
    event_type TEXT, -- 'preference_detected', 'manual_adjustment', 'feedback'
    preference_category TEXT,
    preference_value JSONB,
    confidence FLOAT DEFAULT 0.5,
    session_id UUID REFERENCES game_sessions(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- DM Style Templates: Pre-made profiles users can adopt
CREATE TABLE dm_style_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_name TEXT NOT NULL,
    description TEXT,
    creator_id UUID REFERENCES auth.users(id),
    is_official BOOLEAN DEFAULT FALSE,
    settings JSONB NOT NULL,
    popularity_score INTEGER DEFAULT 0,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);
```

### AI Prompt Engineering

```typescript
interface DMProfileContext {
  // Core style settings
  toneSettings: {
    primary: 'grimdark' | 'heroic' | 'comedic' | 'realistic' | 'mythic' | 'horror';
    blendPercentages?: Record<string, number>;
  };
  narrativeDensity: 'minimalist' | 'balanced' | 'verbose' | 'dynamic';
  combatStyle: 'mechanical' | 'cinematic' | 'tactical' | 'brutal';
  
  // World context
  worldEra: string; // 'medieval', 'steampunk', 'cyberpunk', etc.
  techLevel: number; // 1-10 scale
  magicLevel: number; // 1-10 scale
  
  // Behavioral preferences
  pacingStyle: 'player_led' | 'proactive' | 'real_time';
  npcDepth: 'simple' | 'complex' | 'memorable' | 'realistic';
  
  // Learned preferences
  playerTendencies: {
    prefersCombat: boolean;
    prefersRoleplay: boolean;
    likesPlanning: boolean;
    enjoysHumor: boolean;
  };
}

// Dynamic prompt construction based on profile
function buildDMPrompt(profile: DMProfileContext, worldContext: WorldContext): string {
  return `You are a ${profile.toneSettings.primary} Dungeon Master 
    with ${profile.narrativeDensity} descriptive style.
    
    World Setting: ${worldContext.currentEra} (Year ${worldContext.currentYear})
    Technology Level: ${profile.techLevel}/10
    Magic Level: ${profile.magicLevel}/10
    
    Narration Guidelines:
    - Combat descriptions should be ${profile.combatStyle}
    - NPC interactions should be ${profile.npcDepth}
    - Pacing should be ${profile.pacingStyle}
    
    Remember: This world has ${worldContext.yearsOfHistory} years of history.
    The player's ancestors have shaped this world.
    ${getRelevantWorldMemories(worldContext)}`;
}
```

---

## 🔄 Progressive Enhancement

### Phase 1: Basic Customization (Month 1)
- [ ] Create DM Settings UI tab
- [ ] Implement tone & style selection
- [ ] Add narrative density controls
- [ ] Store preferences in database

### Phase 2: Advanced Settings (Month 2)
- [ ] Add mechanical preferences
- [ ] Implement content boundaries
- [ ] Create safety tools
- [ ] Add import/export settings

### Phase 3: Adaptive Learning (Month 3)
- [ ] Track player behavior patterns
- [ ] Auto-adjust based on feedback
- [ ] Learn from player choices
- [ ] Suggest optimizations

### Phase 4: World Integration (Month 4)
- [ ] Era-specific adaptations
- [ ] Cultural memory weaving
- [ ] Multi-campaign consistency
- [ ] Generational storytelling

### Phase 5: Community Features (Month 5)
- [ ] Share DM profiles
- [ ] Community templates
- [ ] Rate and review styles
- [ ] "DMs of the Month"

---

## 🎯 User Experience

### Settings Interface
```
DM Settings
├── Quick Setup Wizard
│   ├── Choose your preferred genre
│   ├── Select narrative style
│   ├── Set content boundaries
│   └── Generate personalized DM
├── Detailed Customization
│   ├── Narrative Style [sliders & toggles]
│   ├── Mechanical Preferences [dropdowns]
│   ├── Behavioral Settings [matrix]
│   └── Content Filters [checkboxes]
├── Templates Gallery
│   ├── Official Presets
│   ├── Community Favorites
│   └── Import/Export
└── Learning Dashboard
    ├── AI observations
    ├── Suggestion panel
    └── Feedback integration
```

### Progressive Disclosure
1. **New Users**: Simple wizard with 3-4 key choices
2. **Regular Players**: Preset templates to choose from
3. **Power Users**: Full customization matrix
4. **Veterans**: AI learning insights and fine-tuning

---

## 🌟 Innovation Opportunities

### AI Memory Integration
- DM remembers player preferences across sessions
- Adapts to player mood and engagement levels
- Learns optimal challenge levels
- Personalizes NPC interactions based on history

### Multi-DM Campaigns
- Different DM styles for different aspects:
  - Combat DM (tactical, precise)
  - Roleplay DM (character-focused, emotional)
  - Exploration DM (descriptive, atmospheric)
- Seamless transitions between styles

### Generational Adaptation
- DM style evolves with world eras
- Medieval DM → Steampunk DM → Cyberpunk DM
- Maintains personality while adapting vocabulary
- Creates narrative continuity across centuries

### Collaborative Storytelling Modes
- **Author Mode**: DM as co-writer
- **Director Mode**: DM as scene-setter
- **Referee Mode**: DM as rules arbiter
- **Companion Mode**: DM as fellow adventurer

---

## 📊 Success Metrics

### Engagement Metrics
- Settings modification frequency
- Template adoption rates
- Session length correlation with customization
- Player retention based on DM matching

### Quality Metrics
- Player satisfaction scores per DM style
- Narrative consistency ratings
- World integration success
- Learning accuracy measurements

### Growth Metrics
- Template sharing frequency
- Community style creation
- Cross-pollination of preferences
- Viral DM profile shares

---

## 🔮 Future Vision

### The Personal Storyteller AI
Eventually, each user's DM becomes:
- A unique narrative companion that knows them deeply
- A consistent voice across decades of gaming
- A creative partner in world-building
- A legacy narrator for future generations

### Integration with Persistent Worlds
- DM style influences world evolution
- Grimdark DMs create darker world events
- Comedic DMs spawn absurdist factions
- Player and DM co-create mythology

### Publishing Integration
When users export their campaigns as novels:
- DM style becomes the novel's narrative voice
- Consistent tone across all exported content
- Professional writing style templates
- Genre-appropriate language and pacing

---

**This DM Settings system transforms the AI from a tool into a personalized creative companion, making each user's experience unique while maintaining consistency across their persistent world's multi-generational saga.** 🎲