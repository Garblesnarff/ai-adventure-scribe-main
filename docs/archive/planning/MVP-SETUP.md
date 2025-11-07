# AI Adventure Scribe - MVP Setup Guide

## Quick Start for MVP Launch

### Prerequisites
- Node.js 18+ installed
- Supabase account
- Google Gemini API key
- Vercel account (for deployment)

### 1. Environment Setup

#### Frontend Environment
1. Copy `.env.example` to `.env.local`
2. Update with your Supabase credentials:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
# Keep the test account settings for development
VITE_DEV_TEST_EMAIL=test@example.com
VITE_DEV_TEST_PASSWORD=testpass123
```

#### Supabase Edge Functions Environment
In your Supabase dashboard, set these secrets:
```bash
GOOGLE_GEMINI_API_KEY=your_primary_gemini_api_key
```

#### AI API Keys Setup
1. Get Gemini API keys from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Add multiple keys to `.env.local` for automatic rotation:
```env
VITE_GEMINI_API_KEYS=key1,key2,key3
VITE_GOOGLE_GEMINI_API_KEY=key1
```

### 2. Database Setup

#### Run Supabase Migrations
The app will work with existing Supabase setup. Key tables needed:
- `campaigns` 
- `characters`
- `game_sessions`
- `dialogue_history`

### 3. Deploy Edge Functions

Deploy the required Supabase Edge Functions:
```bash
# In your Supabase project
supabase functions deploy generate-campaign-description
supabase functions deploy chat-ai
```

### 4. Local Development

```bash
# Install dependencies
npm install

# (Optional) Create test account with sample data
npm run seed:test-data

# Start development server
npm run dev
```

#### Development Test Account

In development mode, you'll see a yellow "Development Test Account" section on the login page with:

- **Quick Login**: Instantly logs you in with the test account
- **Fill Form**: Pre-fills the login form with test credentials
- **Credentials**: `test@example.com` / `testpass123`

To create the test account and sample data:
1. Add `SUPABASE_SERVICE_ROLE_KEY` to your `.env.local` (from Supabase dashboard)
2. Run: `npm run seed:test-data`

This creates:
- ✅ Test user account
- ✅ Sample campaign ("The Lost Temple of Mysteries")  
- ✅ Sample character ("Eldric the Wise")
- ✅ Active game session with dialogue history

### 5. Production Deployment

#### Deploy to Vercel
1. Connect your GitHub repo to Vercel
2. Set environment variables in Vercel dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_ENVIRONMENT=production`

3. Deploy automatically via GitHub integration

### 6. MVP Features Enabled

✅ **Core Features Working:**
- User authentication (Supabase Auth)
- Campaign creation with AI-generated descriptions
- Character creation and management  
- Basic game chat with AI DM (with automatic failover)
- Session persistence
- API key rotation for reliability

🚫 **Features Disabled for MVP:**
- Complex multi-agent system
- Voice narration
- Advanced memory system
- Offline messaging queue

### 7. Post-Launch Improvements

After getting initial users, you can progressively enable:
1. Voice narration with ElevenLabs
2. Enhanced memory system with embeddings
3. Multi-agent orchestration
4. Real-time features

### 8. Testing Checklist

Before launch, test:
- [ ] User signup/login works
- [ ] Campaign creation generates AI description
- [ ] Character creation saves properly  
- [ ] Game chat responds with AI
- [ ] Messages persist between sessions
- [ ] Authentication protects all routes

### 9. Common Issues

**If Edge Functions fail:**
- Check Supabase logs
- Verify GOOGLE_GEMINI_API_KEY is set
- Ensure functions are deployed

**If authentication fails:**
- Verify Supabase URL and anon key
- Check Supabase Auth settings

**If deployment fails:**
- Verify all environment variables in Vercel
- Check build logs for missing dependencies

### 10. Support

For issues, check:
1. Browser console for frontend errors
2. Supabase dashboard logs for backend errors
3. Vercel deployment logs for build issues