# Multi-User Security Architecture

## Overview
AI Adventure Scribe is designed as a multi-tenant application where each user has completely isolated campaigns and game data.

## Database Security Model

### User Isolation at Database Level
```
User (auth.users)
├── user_id: unique identifier
└── Campaigns (campaigns.user_id = user.id)
    ├── Characters (characters.user_id = user.id)  
    ├── Game Sessions (linked via campaign_id)
    ├── Locations (linked via campaign_id)
    ├── NPCs (linked via campaign_id)
    ├── Quests (linked via campaign_id)
    └── Memories (linked via session_id → campaign_id)
```

### Row Level Security (RLS)
**Status**: Should be enabled in Supabase dashboard

**Required Policies:**
```sql
-- Campaigns: Users can only see their own campaigns
CREATE POLICY "Users can only access their own campaigns" 
ON campaigns FOR ALL USING (auth.uid() = user_id);

-- Characters: Users can only see their own characters
CREATE POLICY "Users can only access their own characters" 
ON characters FOR ALL USING (auth.uid() = user_id);

-- Locations: Users can only see locations from their campaigns
CREATE POLICY "Users can only access locations from their campaigns" 
ON locations FOR ALL USING (
  campaign_id IN (
    SELECT id FROM campaigns WHERE user_id = auth.uid()
  )
);

-- Similar policies needed for: npcs, quests, game_sessions, memories
```

## Application-Level Security

### World Builder Security Checks
All world builders now include validation:

1. **User Authentication Check**
   ```typescript
   const { data: { user } } = await supabase.auth.getUser();
   if (!user) throw new Error('User not authenticated');
   ```

2. **Campaign Ownership Validation**  
   ```typescript
   const { data: campaign } = await supabase
     .from('campaigns')
     .select('*')
     .eq('id', campaignId)
     .eq('user_id', user.id) // Only user's campaigns
     .single();
   ```

3. **Security Logging**
   ```typescript
   if (!hasAccess) {
     console.warn('🚨 Unauthorized world building attempt blocked');
     return null;
   }
   ```

### Protected Functions
The following functions now include user validation:

- `WorldBuilderService.expandWorld()`
- `WorldBuilderService.respondToPlayerAction()`  
- `LocationGenerator.generateContextualLocation()`
- `NPCGenerator.generateContextualNPC()`
- `QuestGenerator.generateMemoryBasedQuest()`

### Memory System Security
- Memories are linked to `session_id`
- Sessions are linked to `campaign_id`  
- Campaigns are linked to `user_id`
- **Result**: Memories are automatically user-isolated

## Security Guarantees

### What's Protected
✅ **Campaign Isolation** - Users can't access other users' campaigns  
✅ **Character Isolation** - Users can't see other users' characters  
✅ **World Data Isolation** - NPCs/Locations/Quests are campaign-scoped  
✅ **Memory Isolation** - Conversation history stays with campaigns  
✅ **Generation Prevention** - Can't create content for other users' campaigns

### Authentication Flow
1. User signs up/logs in via Supabase Auth
2. Gets unique `user.id` in JWT token
3. All database queries filter by `user_id`
4. World builders validate ownership before generation
5. Unauthorized attempts are blocked and logged

## Testing Multi-User Isolation

### Manual Test Steps
1. Create Account A, start carnival campaign
2. Create Account B, start sci-fi campaign  
3. Log in as Account A
4. Verify you only see carnival data
5. Log in as Account B
6. Verify you only see sci-fi data
7. Check console for any security warnings

### Expected Behavior
- No cross-user data visibility
- No world building for wrong users
- Security warnings logged for unauthorized attempts
- Clean separation between different users' worlds

## Future Enhancements

### Potential Features
- **Campaign Sharing** - Allow users to invite others to their campaigns
- **Public Campaigns** - Opt-in sharing for inspiration
- **Multi-DM Support** - Multiple users managing same campaign
- **Backup/Export** - Users export their own campaign data

### Additional Security
- **Rate Limiting** - Prevent AI abuse per user
- **Content Filtering** - Scan generated content
- **Audit Logging** - Track all world building actions
- **Data Encryption** - Encrypt sensitive campaign data

## Implementation Status
- ✅ Database schema supports multi-user
- ✅ Authentication system active
- ✅ World builders have user validation  
- ✅ Security logging implemented
- ❓ RLS policies (needs manual verification in Supabase)
- ❓ Full end-to-end testing

## Next Steps
1. **Verify RLS policies** in Supabase dashboard
2. **Test with multiple accounts** to confirm isolation
3. **Add rate limiting** to prevent API abuse
4. **Monitor security logs** in production