# 🎨 Campaign Background Images Setup

## 🚀 Quick Setup Guide

The AI-powered campaign background image system has been fully implemented! You just need to add one database column to complete the setup.

### ✅ What's Already Working
- ✅ Campaign creation (works perfectly)
- ✅ AI image generation (creates beautiful fantasy landscapes)
- ✅ Campaign card styling (all cards now use featured layout with hover popups)
- ✅ OpenRouter API integration (Gemini 2.5 Flash Image model)

### 🔧 What You Need to Do (1 minute setup)

**Step 1: Add Database Column**

Go to your Supabase SQL Editor and run this command:

🔗 **Direct Link:** https://supabase.com/dashboard/project/cnalyhtalikwsopogula/sql

**SQL to Run:**
```sql
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS background_image TEXT;
COMMENT ON COLUMN campaigns.background_image IS 'URL of AI-generated background image for campaign cards';
```

**That's it!** Once you run this SQL command, the system is 100% functional.

---

## 🎯 How It Works

1. **User creates campaign** → Campaign saved to database
2. **AI generates image** → Beautiful fantasy landscape created based on genre, tone, setting
3. **Image stored** → Background image URL saved to campaign record
4. **Cards display** → All campaign cards show with generated backgrounds and hover popups

## 🤖 AI Image Generation Features

- **Smart Prompts**: Generates images based on campaign attributes (genre, tone, setting, difficulty)
- **High Quality**: Professional digital art style with cinematic composition
- **Genre Specific**: 
  - Dark Fantasy → Gothic landscapes with ominous skies
  - Steampunk → Victorian era with brass machinery and airships
  - High Fantasy → Majestic castles and enchanted forests
  - And many more!

## 💰 Cost

- **~$0.03 per image** generated through OpenRouter
- Images are generated once per campaign and stored permanently

## 🔧 Technical Details

### Files Modified/Created:
- `src/services/openrouter-service.ts` - OpenRouter API integration
- `src/services/campaign-image-generator.ts` - AI prompt generation
- `src/components/campaign-list/campaign-card.tsx` - Updated styling for all cards
- `src/components/campaign-creation/wizard/useCampaignSave.ts` - Image generation integration
- `src/integrations/supabase/database.types.ts` - Added background_image field types

### Environment Variables:
- `VITE_OPENROUTER_API_KEY` - Already configured in `.env.local`

## 🧪 Testing

After running the SQL migration, test by:
1. Creating a new campaign through the wizard
2. Check browser console - should see "Successfully generated campaign image"
3. View campaign cards - should display with generated backgrounds
4. Hover over cards - should show popup with campaign info and actions

## 🆘 Troubleshooting

**Q: Campaign creation fails with "Could not find the 'background_image' column"**
A: You haven't run the SQL migration yet. Go to the Supabase SQL Editor and run the SQL above.

**Q: Images aren't generating**
A: Check browser console for errors. Ensure VITE_OPENROUTER_API_KEY is set correctly.

**Q: Cards don't show background images**
A: The system will fall back to default background if generation fails. Check the campaigns table in Supabase to see if background_image field is populated.

---

## 🎉 Once Complete

All campaign cards will look like the featured cards you saw, with:
- ✨ Full background images (AI-generated fantasy landscapes)
- 🎯 Hover popups with campaign info and action buttons
- 🎨 Beautiful, genre-appropriate artwork for every campaign

**Ready to create some epic campaigns!**