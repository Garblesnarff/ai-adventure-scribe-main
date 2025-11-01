// SDK Imports
import { useState } from 'react';

// Project Imports
import { useToast } from '@/components/ui/use-toast'; // Assuming kebab-case
import { supabase } from '@/integrations/supabase/client';
import { logger } from '../lib/logger';
import {
  transformAbilityScoresForStorage,
  transformEquipmentForStorage,
  transformMulticlassingForStorage
} from '@/utils/characterTransformations';
import { characterSpellService } from '@/services/characterSpellApi';
import { convertSpellIdsToDatabase } from '@/utils/spell-id-mapping';

// Project Types
import { Character, transformCharacterForStorage } from '@/types/character';

// Services
import { characterBackgroundGenerator } from '@/services/character-background-generator';
import { useQueryClient } from '@tanstack/react-query';
import { useCampaign } from '@/contexts/CampaignContext';


/**
 * Constant UUID for local users when no authentication is present
 * This follows the UUID v4 format required by Supabase
 */
const LOCAL_USER_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Custom hook for handling character data persistence
 * Provides methods and state for saving character data to Supabase
 */
export const useCharacterSave = () => {
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { state: campaignState } = useCampaign();

  /**
   * Saves character data to Supabase
   * Handles both creation and updates of character data
   * @param character - The character data to save
   * @returns Promise<Character | null> The saved character data or null if save failed
   */
  const saveCharacter = async (character: Character): Promise<Character | null> => {
    if (!character) return null;

    try {
      setIsSaving(true);

      // Get current user if authenticated
      const { data: { user } } = await supabase.auth.getUser();

      const effectiveCampaignId = character.campaign_id || campaignState.campaign?.id || null;

      if (!effectiveCampaignId) {
        logger.warn('Attempted to save character without campaign context');
        toast({
          title: 'Campaign Required',
          description: 'Select or create a campaign before saving this character.',
          variant: 'destructive',
        });
        return null;
      }

      // Transform and save character data
      const characterData = {
        ...transformCharacterForStorage({
          ...character,
          campaign_id: effectiveCampaignId,
          // Use authenticated user ID if available, otherwise use local UUID
          user_id: user?.id || LOCAL_USER_ID,
        }),
        ...transformMulticlassingForStorage(character)
      };

      logger.info('Saving character data:', characterData);

      // For new characters, we need to insert first to get an ID
      let savedCharacter: Character;
      if (!characterData.id) {
        const { data: newCharacter, error: insertError } = await supabase
          .from('characters')
          .insert(characterData)
          .select()
          .single();

        if (insertError) throw insertError;
        characterData.id = newCharacter.id;
        savedCharacter = { ...character, id: newCharacter.id, campaign_id: effectiveCampaignId };
      } else {
        // For existing characters, we can update
        const { error: updateError } = await supabase
          .from('characters')
          .update(characterData)
          .eq('id', characterData.id);

        if (updateError) throw updateError;
        savedCharacter = { ...character, campaign_id: effectiveCampaignId };
      }

      // Transform and save character stats
      const statsData = {
        ...transformAbilityScoresForStorage(
          character.abilityScores!,
          characterData.id
        )
      };

      const { error: statsError } = await supabase
        .from('character_stats')
        .upsert(statsData, {
          onConflict: 'character_id'
        });

      if (statsError) {
        logger.warn('Stats save failed but continuing:', statsError);
        // Don't throw - character core data saved
      }

      // Save equipment if present (non-blocking)
      if (character.inventory && character.inventory.length > 0) {
        const equipmentData = transformEquipmentForStorage(
          character,
          characterData.id
        );

        const { error: equipmentError } = await supabase
          .from('character_equipment')
          .upsert(equipmentData, { 
            onConflict: 'character_id,item_name'
          });

        if (equipmentError) {
          logger.warn('Equipment save failed but continuing:', equipmentError);
          // Don't throw - character core data saved
        }
      }

      // Save spells if present (non-blocking)
      if ((character.cantrips && character.cantrips.length > 0) || (character.knownSpells && character.knownSpells.length > 0)) {
        try {
          const frontendSpellIds = [...(character.cantrips || []), ...(character.knownSpells || [])];
          logger.info('🔄 Frontend spell IDs:', frontendSpellIds);

          // Convert frontend kebab-case IDs to database UUIDs
          const databaseSpellIds = convertSpellIdsToDatabase(frontendSpellIds);
          logger.info('🔄 Converted to database UUIDs:', databaseSpellIds);

          if (databaseSpellIds.length === 0) {
            logger.warn('⚠️ No valid spell mappings found, skipping spell save');
            return savedCharacter;
          }

          await characterSpellService.saveCharacterSpells(characterData.id, {
            spells: databaseSpellIds,
            className: character.class?.name || ''
          });
          logger.info(`✅ Successfully saved ${databaseSpellIds.length}/${frontendSpellIds.length} spells for character ${characterData.id}`);
        } catch (spellError) {
          logger.warn('❌ Spell save failed but continuing:', spellError);
          // Don't throw - character core data saved
        }
      }

      // Generate background image asynchronously for new characters
      // Don't block character creation on image generation
      if (!character.id && characterData.id) {
        generateBackgroundImage(characterData.id, savedCharacter);
      }

      // Invalidate queries for character lists
      queryClient.invalidateQueries({ queryKey: ['characters'] });
      if (effectiveCampaignId) {
        queryClient.invalidateQueries({ queryKey: ['campaign', effectiveCampaignId, 'characters'] });
      }
      queryClient.invalidateQueries({ queryKey: ['character', characterData.id] });

      // Return the complete character data
      return savedCharacter;
    } catch (error) {
      logger.error('Error saving character:', error);
      toast({
        title: "Save Error",
        description: `Failed to save character: ${error.message || 'Unknown error'}`,
        variant: "destructive",
      });
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Generate background image for the character
   * This runs asynchronously after character creation
   */
  const generateBackgroundImage = async (characterId: string, character: Character) => {
    try {
      logger.info(`Generating background image for character ${characterId}`);

      // Generate the image with character portrait as reference if available
      const options: { referenceImageUrl?: string; retryAttempts?: number; fallbackToDefault?: boolean; useSimplifiedPrompt?: boolean } = {};
      if (character.image_url) {
        options.referenceImageUrl = character.image_url;
        logger.info(`Using character image as reference: ${character.image_url}`);
      }

      const imageUrl = await characterBackgroundGenerator.generateCharacterBackground(character, options);

      // Update the character with the generated image URL
      const { error } = await supabase
        .from('characters')
        .update({
          background_image: imageUrl,
          updated_at: new Date().toISOString() // Ensure updated_at triggers realtime
        })
        .eq('id', characterId);

      if (error) {
        logger.error('Error updating character with background image:', error);
        // Don't throw error - character creation should still succeed
      } else {
        logger.info(`Successfully generated and saved background image for character ${characterId}`);

        // Invalidate specific queries to refresh the UI with the new image
        queryClient.invalidateQueries({ queryKey: ['characters'] });
        queryClient.invalidateQueries({ queryKey: ['character', characterId] });

        // Show success notification
        toast({
          title: "Character Background Generated",
          description: "Your character background image has been created successfully.",
        });
      }
    } catch (error) {
      logger.error(`Failed to generate background image for character ${characterId}:`, error);

      // Show user-friendly error notification
      toast({
        title: "Background Image Generation Failed",
        description: "We couldn't generate a background image for your character, but your character was created successfully. You can add an image later.",
        variant: "destructive",
      });

      // Don't throw error - character creation should still succeed even if image generation fails
    }
  };

  return {
    saveCharacter,
    isSaving
  };
};
