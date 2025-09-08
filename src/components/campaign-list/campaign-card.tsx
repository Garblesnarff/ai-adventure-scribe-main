// ... existing code ...

            contextPrompt += `\n**CRITICAL: STRUCTURED RESPONSE FORMAT**
When providing a response, you MUST structure it as JSON with both display text AND pre-segmented narration for voice synthesis.

**IMPORTANT: ALWAYS INCLUDE DIRECT CHARACTER DIALOGUE**
- NPCs should speak directly using quoted dialogue in BOTH the "text" field AND narration_segments
- Never avoid character speech - it's essential for immersion!
- The "text" field should be exactly what the player sees, including all NPC dialogue in quotes

**RESPONSE FORMAT (JSON):**
{
  "text": "Your full narrative response as normal text for display, INCLUDING all NPC dialogue in quotes",
  "narration_segments": [
    {
      "type": "dm",
      "text": "DM narration text here", 
      "character": null,
      "voice_category": null
    },
    {
      "type": "character",
      "text": "Character dialogue here",
      "character": "Character Name",
      "voice_category": "appropriate_voice_category"
    }
  ]
}

**SEGMENTATION RULES FOR PROPER AUDIO:**
1. **Complete Sentences Only**: Each segment MUST contain complete sentences that end with proper punctuation (. ! ?)
2. **No Mid-Word Splits**: Never break a segment in the middle of a word - always end at word boundaries
3. **Sentence Boundaries**: Split at natural sentence endings, not in the middle of clauses or phrases
4. **DM Narration**: type="dm", no character/voice_category needed - use for descriptive text and scene-setting
5. **Character Speech**: type="character", include character name and voice_category - use ONLY for actual spoken dialogue
6. **Voice Categories**: Use existing categories for known characters, select appropriate ones for new characters
7. **Character Names**: Use consistent, clean names (e.g., "village elder" not "the old village elder")
8. **Dialogue Purity**: Only actual spoken words go in character segments, not attribution like "he said"
9. **Natural Flow**: Each segment should sound natural when read aloud as a complete thought
10. **Abbreviation Handling**: Be careful with abbreviations like "Dr.", "Mr.", "etc." - don't split after these

**CORRECTED EXAMPLE:**
Player says: "I approach the tavern keeper and ask about rooms"

Response:
{
  "text": "You approach the burly tavern keeper behind the bar. He looks up from cleaning a mug with tired but friendly eyes. \"Aye, we've got a room available,\" he says in a gruff voice. \"Two silver for the night, includes breakfast. What do you say?\"",
  "narration_segments": [
    {
      "type": "dm",
      "text": "You approach the burly tavern keeper behind the bar. He looks up from cleaning a mug with tired but friendly eyes.",
      "character": null,
      "voice_category": null
    },
    {
      "type": "character", 
      "text": "Aye, we've got a room available. Two silver for the night, includes breakfast. What do you say?",
      "character": "tavern keeper",
      "voice_category": "merchant"
    }
  ]
}

**EXAMPLE FOR OPENING SCENE:**
{
  "text": "The village elder approaches you with worry etched on his weathered face. \"Stranger,\" he says, his voice trembling slightly, \"we need your help. Dark things have been happening since those cloaked figures arrived. Will you investigate?\"",
  "narration_segments": [
    {
      "type": "dm",
      "text": "The village elder approaches you with worry etched on his weathered face.",
      "character": null,
      "voice_category": null
    },
    {
      "type": "character",
      "text": "Stranger, we need your help. Dark things have been happening since those cloaked figures arrived. Will you investigate?",
      "character": "village elder",
      "voice_category": "elder"
    }
  ]
}

**BAD SEGMENTATION (DO NOT DO):**
- Splitting mid-sentence: "The dragon ro-" / "ars loudly"  ❌
- Incomplete thoughts: "The wizard" / "casts a spell"  ❌  
- Mixed dialogue: "The guard says, 'Halt! Who goes there?'"  ❌
- Breaking at abbreviations: "Dr. Smith" split as "Dr." / "Smith"  ❌
- AVOIDING CHARACTER DIALOGUE: "He recounts the tale..." instead of "He says, 'Let me tell you what happened...'"  ❌

**GOOD SEGMENTATION (DO THIS):**
- Complete sentences: "The dragon roars loudly, shaking the cavern walls."  ✅
- Full thoughts: "The wizard raises his staff and begins casting a powerful spell."  ✅
- Pure dialogue: "Halt! Who goes there?"  ✅
- Proper abbreviations: "Dr. Smith examines the ancient tome carefully."  ✅
- DIRECT CHARACTER SPEECH: "Welcome, traveler!" ✅`;

// ... existing code ...

          contextPrompt += `\n\nDM RESPONSE GUIDELINES:
**Core Principles:**
- Respond to the player's action with clear consequences and vivid descriptions
- Use D&D 5e mechanics when appropriate (ask for ability checks, saving throws, attacks)
- Always provide 2-3 meaningful choices for the player's next action
- Include sensory details and environmental context
- Track narrative threads and callback to previous events
- Give NPCs distinct voices and personalities
- **CRITICAL: NPCs should speak directly using quoted dialogue - never just describe what they say!**

**NPC Dialogue Requirements:**
- NPCs MUST speak in direct quotes: "Welcome, traveler!" NOT "He welcomes you"
- Every significant NPC interaction should include actual spoken words
- Give each NPC a distinct voice, vocabulary, and speech pattern
- Include body language and emotional cues alongside dialogue
- Example: The merchant nervously fidgets with his coin purse. "Perhaps we can make a deal?" he whispers.

**When to Request Dice Rolls:**
- Uncertain outcomes: "Roll a d20 + your Investigation modifier"
- Skill challenges: "Make a Persuasion check (d20 + Charisma + proficiency if applicable)"
- Combat actions: "Roll initiative (d20 + Dex modifier)" or "Make an attack roll"
- Saving throws: "Make a Constitution saving throw"
- Stealth/perception: "Roll for Stealth" or "Everyone make Perception checks"

**Response Structure:**
1. **Consequences**: Describe what happens as a result of their action
2. **New Information**: Reveal new details, clues, or developments
3. **NPC Interaction**: ALWAYS include NPC dialogue in quotes with distinct voice when NPCs are present
4. **Environmental Details**: Paint the scene with sensory information
5. **Choice Point**: End with 2-3 clear options or ask what they want to do next

**Combat Guidelines:**
- Request initiative rolls at combat start
- Ask for attack rolls, damage rolls, and saving throws as needed
- Describe hits/misses cinematically
- Track position and tactical elements

Keep responses engaging, 1-3 paragraphs, and always end with a clear prompt for player action or decision.

${voiceContext ? '**REMEMBER: Always respond in the JSON format with narration_segments for voice synthesis, AND ALWAYS INCLUDE DIRECT NPC DIALOGUE!**' : ''}`;

// ... existing code ...import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Trash2, Play } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import CharacterSelectionModal from './character-selection-modal';

interface CampaignCardProps {
  campaign: {
    id: string;
    name: string;
    description: string | null;
    genre: string | null;
    difficulty_level: string | null;
    campaign_length: string | null;
    tone: string | null;
    background_image?: string | null;
  };
  isFeatured?: boolean;
  coverImage?: string;
}

/**
 * CampaignCard component
 * Displays individual campaign information in a card format
 * @param campaign - Campaign data to display
 */
const CampaignCardComponent = ({ campaign, isFeatured = false, coverImage }: CampaignCardProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCharacterModal, setShowCharacterModal] = useState(false);

  /**
   * Handles campaign deletion confirmation
   * Shows delete dialog when user clicks delete button
   */
  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  /**
   * Handles actual campaign deletion
   * Removes campaign from database and updates UI
   */
  const handleDelete = useCallback(async () => {
    try {
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', campaign.id);

      if (error) throw error;

      toast({
        title: "Campaign Deleted",
        description: "The campaign has been successfully removed.",
      });

      setShowDeleteDialog(false);
      
      // Invalidate campaigns query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast({
        title: "Error",
        description: "Failed to delete campaign. Please try again.",
        variant: "destructive",
      });
      setShowDeleteDialog(false);
    }
  }, [campaign.id, toast, queryClient]);

  // Use campaign's generated background image, fallback to coverImage, then default
  const resolvedImage = useMemo(() => 
    campaign.background_image || 
    (coverImage ? new URL(coverImage, import.meta.url).href : null) ||
    new URL('/card-background.jpeg', import.meta.url).href, 
  [campaign.background_image, coverImage]);

  return (
    <Card
      className="campaign-card featured-card group relative overflow-hidden border border-border/30 shadow-md transition-all duration-300 hover:shadow-xl hover:border-infinite-purple/50 aspect-square"
      style={{ padding: 0 }}
    >
      {/* Hero / thumbnail area */}
      <div
        className="campaign-hero featured flex items-end p-4 cursor-pointer aspect-square bg-cover bg-center bg-no-repeat filter sepia-[0.1]"
        onClick={() => navigate(`/campaign/${campaign.id}`)}
        style={resolvedImage ? { backgroundImage: `url(${resolvedImage})` } : undefined}
      >
        {/* Overlay and popup for all cards */}
        {isFeatured && (
          <div className="absolute top-2 right-2 z-10">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-infinite-gold text-infinite-dark">
              Featured
            </span>
          </div>
        )}
        <div className="featured-overlay bg-gradient-to-b from-infinite-purple/80 via-transparent to-infinite-dark/90" />
        <div className="hover-popup opacity-0 transform translate-y-2 transition-all duration-200 pointer-events-none">
          <div className="bg-white/95 p-4 rounded-lg shadow-md border border-border">
            <div className="text-xl font-bold text-infinite-dark mb-2 leading-tight break-words">{campaign.name}</div>
            {campaign.description && <div className="text-base text-muted-foreground line-clamp-3 leading-relaxed mb-3 break-words hyphens-auto">{campaign.description}</div>}
            
            {/* Campaign badges in popup */}
            <div className="campaign-badges flex gap-1 flex-wrap text-xs mt-2 mb-4">
              {campaign.genre && <span className="inline-flex items-center px-2 py-1 rounded-full bg-infinite-purple/10 text-infinite-purple border border-infinite-purple/20 font-medium">{campaign.genre}</span>}
              {campaign.difficulty_level && <span className="inline-flex items-center px-2 py-1 rounded-full bg-destructive/10 text-destructive border border-destructive/20 font-medium">{campaign.difficulty_level}</span>}
              {campaign.campaign_length && <span className="inline-flex items-center px-2 py-1 rounded-full bg-secondary/10 text-secondary-foreground border border-secondary/20 font-medium">{campaign.campaign_length}</span>}
              {campaign.tone && <span className="inline-flex items-center px-2 py-1 rounded-full bg-accent/10 text-accent-foreground border border-accent/20 font-medium">{campaign.tone}</span>}
            </div>

            <div className="flex items-center gap-2">
              <Button size="sm" className="bg-infinite-gold text-infinite-dark flex items-center gap-2 hover:bg-infinite-purple" onClick={(e) => { e.stopPropagation(); setShowCharacterModal(true); }}>
                <Play className="w-4 h-4" />
                Play
              </Button>
              <Button size="sm" variant="outline" className="border-infinite-teal text-infinite-teal hover:bg-infinite-teal hover:text-infinite-dark" onClick={(e) => { e.stopPropagation(); navigate(`/campaign/${campaign.id}`); }}>
                Enter
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-infinite-dark/20"
                onClick={(e) => { e.stopPropagation(); handleDeleteClick(); }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{campaign.name}"? This will permanently remove the campaign and all associated game sessions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Campaign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CharacterSelectionModal
        isOpen={showCharacterModal}
        onClose={() => setShowCharacterModal(false)}
        campaignId={campaign.id}
        campaignName={campaign.name}
      />
    </Card>
  );
};

const MemoizedCampaignCard = React.memo(CampaignCardComponent);

export { MemoizedCampaignCard };
export default CampaignCardComponent;
