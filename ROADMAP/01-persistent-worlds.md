# Persistent Worlds Architecture

## 🌍 Vision
Transform from **campaign-based** to **world-based** architecture where each user owns a single, persistent world that grows richer with every campaign played.

## Current vs. Future Architecture

### Current: Campaign-Isolated Model
```
User
├── Campaign 1: Medieval Fantasy
│   ├── Carnival locations (isolated)
│   ├── NPCs (forgotten after campaign)
│   └── Memories (campaign-only)
├── Campaign 2: Sci-Fi Horror  
│   ├── Space station locations (isolated)
│   ├── NPCs (no connection to Campaign 1)
│   └── Memories (separate)
└── Campaign 3: Modern Mystery
    └── (completely separate world)
```

### Future: Persistent World Model
```
User
└── Personal World (persistent, evolving)
    ├── World Memory (accumulates forever)
    ├── Locations (persistent across campaigns)
    ├── NPCs (remember all interactions)
    ├── World History (timeline of events)
    ├── Factions & Politics (evolving)
    └── Campaigns (adventures within the world)
        ├── Campaign 1: The Carnival Incident (Year 0)
        ├── Campaign 2: Steam Age Revolution (Year 200)  
        └── Campaign 3: Cyberpunk Awakening (Year 800)
```

---

## 🏗️ Technical Implementation

### Database Schema Changes

#### New Core Tables
```sql
-- User Worlds: One per user, persistent forever
CREATE TABLE user_worlds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    world_name TEXT NOT NULL,
    current_year INTEGER DEFAULT 0,
    creation_date TIMESTAMP DEFAULT NOW(),
    world_description TEXT,
    world_genre TEXT DEFAULT 'fantasy',
    world_state JSONB DEFAULT '{}',
    
    UNIQUE(user_id) -- One world per user
);

-- World Timeline: Major events across all campaigns
CREATE TABLE world_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    world_id UUID REFERENCES user_worlds(id) NOT NULL,
    year INTEGER NOT NULL,
    event_title TEXT NOT NULL,
    event_description TEXT,
    event_type TEXT, -- 'campaign_start', 'major_event', 'npc_death', etc.
    caused_by_campaign_id UUID REFERENCES campaigns(id),
    consequences JSONB,
    importance INTEGER DEFAULT 5 CHECK (importance >= 1 AND importance <= 10),
    created_at TIMESTAMP DEFAULT NOW()
);

-- World State: Politics, economics, technology levels
CREATE TABLE world_state_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    world_id UUID REFERENCES user_worlds(id) NOT NULL,
    year INTEGER NOT NULL,
    technology_level TEXT,
    magic_level TEXT,
    political_state JSONB, -- Kingdoms, rulers, wars
    economic_state JSONB,  -- Trade routes, currencies
    cultural_state JSONB,  -- Religions, philosophies
    environmental_state JSONB -- Climate, disasters
);
```

#### Modified Existing Tables
```sql
-- Add world_id to existing tables
ALTER TABLE campaigns ADD COLUMN world_id UUID REFERENCES user_worlds(id);
ALTER TABLE locations ADD COLUMN world_id UUID REFERENCES user_worlds(id);
ALTER TABLE npcs ADD COLUMN world_id UUID REFERENCES user_worlds(id);
ALTER TABLE quests ADD COLUMN world_id UUID REFERENCES user_worlds(id);

-- Make locations persistent across campaigns
ALTER TABLE locations DROP CONSTRAINT locations_campaign_id_fkey;
ALTER TABLE locations ALTER COLUMN campaign_id DROP NOT NULL;

-- Add world memory for NPCs
ALTER TABLE npcs ADD COLUMN world_memories JSONB DEFAULT '[]';
ALTER TABLE npcs ADD COLUMN first_met_campaign_id UUID;
ALTER TABLE npcs ADD COLUMN last_seen_year INTEGER;
ALTER TABLE npcs ADD COLUMN status TEXT DEFAULT 'alive'; -- 'alive', 'dead', 'missing'
```

### API Changes

#### New Endpoints
```typescript
// World Management
POST   /api/worlds              // Create user's world
GET    /api/worlds/me           // Get current user's world
PUT    /api/worlds/me           // Update world settings
GET    /api/worlds/me/timeline  // Get world timeline
GET    /api/worlds/me/state     // Get current world state

// Campaign Integration
POST   /api/campaigns           // Now requires world context
GET    /api/campaigns/:id/world-impact // How campaign affected world

// Cross-Campaign Elements
GET    /api/npcs/persistent     // NPCs that exist across campaigns
GET    /api/locations/world     // All world locations
GET    /api/memories/world      // World-level memories
```

---

## 🔄 Migration Strategy

### Phase 1: Add World Infrastructure
1. **Create new tables** without breaking existing functionality
2. **Default world creation** for all existing users
3. **Dual-write system** - write to both old and new structures
4. **Gradual feature rollout** behind feature flags

### Phase 2: Migrate Existing Data
```sql
-- Create worlds for existing users
INSERT INTO user_worlds (user_id, world_name, current_year)
SELECT 
    user_id, 
    'My World' as world_name,
    0 as current_year
FROM (SELECT DISTINCT user_id FROM campaigns) users;

-- Link campaigns to worlds
UPDATE campaigns 
SET world_id = (
    SELECT id FROM user_worlds WHERE user_id = campaigns.user_id
);

-- Migrate locations to world-level
UPDATE locations 
SET world_id = (
    SELECT world_id FROM campaigns WHERE campaigns.id = locations.campaign_id
);
```

### Phase 3: Enable Cross-Campaign Features
1. **NPC persistence** - NPCs remember previous campaigns
2. **Location continuity** - Locations exist between campaigns
3. **World memory** - Events remembered across time
4. **Timeline visualization** - Show world's history

---

## 🎮 User Experience Changes

### World Creation Flow
```
New User Registration
    ↓
World Creation Wizard
    ├── Choose world name
    ├── Select starting genre/era
    ├── Define basic geography
    └── Set initial world state
        ↓
First Campaign Creation
    └── Campaign is created within the world
```

### World Dashboard
```
My World: "Aethermoor"
├── Timeline (0 - 847 years of history)
├── Active Locations (247 discovered)
├── Known NPCs (89 met, 23 deceased, 12 missing)  
├── Major Events (31 world-changing moments)
├── Current State (Steampunk Era, Year 847)
└── Campaigns
    ├── The Carnival Mystery (Year 0-1) ✓ Complete
    ├── The Brass Revolution (Year 200-205) ✓ Complete  
    ├── Shadows of Steam (Year 400-410) ✓ Complete
    └── The Gear War (Year 847+) 🎮 Currently Playing
```

### Cross-Campaign Recognition
```
Player: "I enter the tavern"

DM: "As you push open the familiar oak door of The Brass Lantern, 
the elderly barkeeper looks up. His eyes widen with recognition. 
'By the gears... you have the same eyes as that adventurer who 
saved this place during the Revolution, fifty years past. 
Are you perhaps... related to the legendary [Previous Character Name]?'"
```

---

## 🧠 Memory Integration

### Hierarchical Memory Structure
```
World Memory (Permanent)
├── Major Historical Events
├── Important NPCs (with full relationship history)
├── Significant Locations (with evolution timeline)
└── World-Changing Player Actions

Campaign Memory (Archived after completion)
├── Campaign-specific events
├── Temporary NPCs
├── Session-by-session progress
└── Character development arcs

Session Memory (Recent, active)
├── Last 20 conversation exchanges
├── Immediate context
└── Current objectives
```

### Smart Memory Retrieval
```typescript
// When player enters a location
const relevantMemories = await getWorldMemories({
  location: currentLocation,
  timeframe: 'any',
  importance: '>= 6',
  involvedNPCs: nearbyNPCs,
  connectionType: ['location_history', 'npc_interactions', 'player_actions']
});

// AI gets enriched context about this location's history
const contextPrompt = `
This is The Brass Lantern tavern. Important history:
- Year 23: Player character saved it from bandits
- Year 156: Became meeting place for revolutionaries  
- Year 203: Current owner inherited it from grateful grandfather
- Barkeeper remembers stories of the "legendary hero" (player's previous character)
`;
```

---

## 📊 Success Metrics

### World Richness Metrics
- **Temporal Depth**: Years of world history per user
- **Location Density**: Persistent locations per world
- **NPC Relationships**: Cross-campaign connections tracked
- **Event Continuity**: References to previous campaigns per session

### User Engagement Metrics  
- **World Investment**: Time spent in world dashboard
- **Cross-Campaign References**: How often previous adventures are mentioned
- **Long-term Retention**: Users playing 3+ campaigns in same world
- **Narrative Satisfaction**: User ratings of world continuity

### Technical Performance
- **Memory Query Speed**: Time to retrieve relevant world context
- **Database Growth**: Storage per user world over time
- **Cross-Reference Accuracy**: Correct historical references generated

---

## 🚧 Implementation Phases

### Phase 1.1: World Infrastructure (Month 1)
- [ ] Create world database tables
- [ ] Implement world creation API
- [ ] Build basic world dashboard
- [ ] Add world context to AI prompts

### Phase 1.2: Campaign Integration (Month 2)
- [ ] Migrate campaign creation to world-based
- [ ] Add world timeline tracking
- [ ] Implement basic cross-campaign memory
- [ ] Create world state management

### Phase 1.3: NPC Persistence (Month 3)
- [ ] Enable NPCs to persist across campaigns
- [ ] Implement NPC memory of previous interactions
- [ ] Add NPC status tracking (alive/dead/missing)
- [ ] Create cross-campaign NPC recognition

### Phase 1.4: Location Continuity (Month 3)
- [ ] Move locations to world-level
- [ ] Track location evolution over time
- [ ] Enable location reuse across campaigns
- [ ] Implement location memory system

---

## 🔮 Future Enhancements

### Advanced World Features
- **Seasonal Changes**: World state changes over time
- **Economic Simulation**: Trade routes, currency values
- **Political Evolution**: Kingdoms rise and fall
- **Cultural Shifts**: Religions, philosophies evolve
- **Environmental Changes**: Climate, geography evolution

### User Experience Improvements
- **World Visualization**: Interactive maps and timelines
- **NPC Relationship Graphs**: Visual relationship tracking
- **Event Impact Analysis**: See how actions changed the world
- **World Comparison**: Compare worlds with other users
- **World Export**: Export world as novel or RPG setting

### Technical Optimizations
- **Intelligent Caching**: Pre-load likely world context
- **Memory Compression**: Summarize old events efficiently
- **Parallel Processing**: Background world state updates
- **Smart Indexing**: Fast queries across large world histories

---

## 💡 Innovation Impact

### What This Enables
1. **Genuine Attachment**: Users become invested in their world's future
2. **Infinite Replayability**: Same world, unlimited stories
3. **Emergent Storytelling**: Unplanned narrative connections
4. **Social Sharing**: "Look how my world evolved!"
5. **Long-term Value**: Worlds become more valuable over time

### Competitive Differentiation
- **First mover advantage** in persistent AI worlds
- **Emotional user investment** creates platform lock-in
- **Viral sharing potential** through world showcases
- **Subscription justification** through world value accumulation
- **Platform expansion** into world sharing, collaboration

---

**This architecture transforms AI Adventure Scribe from a campaign manager into a personal universe creator - where every story matters forever.** 🌟