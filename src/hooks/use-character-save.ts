// SDK Imports
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

// Project Imports
import { logger } from '../lib/logger';

import type { Character } from '@/types/character';

import { useToast } from '@/components/ui/use-toast'; // Assuming kebab-case
import { useCampaign } from '@/contexts/CampaignContext';
import { supabase } from '@/integrations/supabase/client';
import { characterBackgroundGenerator } from '@/services/character-background-generator';
import { characterSpellService } from '@/services/characterSpellApi';
import { transformCharacterForStorage } from '@/types/character';
import {
  transformAbilityScoresForStorage,
  transformEquipmentForStorage,
  transformMulticlassingForStorage,
} from '@/utils/characterTransformations';
import { convertSpellIdsToDatabase } from '@/utils/spell-id-mapping';

// Project Types

// Services

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
      const {
        data: { user },
      } = await supabase.auth.getUser();

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
        ...transformMulticlassingForStorage(character),
      };

      logger.info('Saving character data:', characterData);

      // For new characters, use atomic RPC function
      let savedCharacter: Character;
      if (!characterData.id) {
        // Transform stats data
        const statsData = transformAbilityScoresForStorage(
          character.abilityScores!,
          '00000000-0000-0000-0000-000000000000', // Temporary ID, will be replaced
        );

        // Transform equipment data if present
        const equipmentData =
          character.inventory && character.inventory.length > 0
            ? transformEquipmentForStorage(character, '00000000-0000-0000-0000-000000000000')
            : null;

        // Call atomic RPC function
        const { data: newCharacterId, error: rpcError } = await supabase.rpc(
          'create_character_atomic',
          {
            character_data: characterData,
            stats_data: {
              strength: statsData.strength,
              dexterity: statsData.dexterity,
              constitution: statsData.constitution,
              intelligence: statsData.intelligence,
              wisdom: statsData.wisdom,
              charisma: statsData.charisma,
              armor_class: statsData.armor_class,
              current_hit_points: statsData.current_hit_points,
              max_hit_points: statsData.max_hit_points,
            },
            equipment_data: equipmentData
              ? equipmentData.map((item) => ({
                  item_name: item.item_name,
                  item_type: item.item_type,
                  quantity: item.quantity,
                  equipped: item.equipped,
                  is_magic: item.is_magic,
                  magic_bonus: item.magic_bonus,
                  magic_properties: item.magic_properties,
                  requires_attunement: item.requires_attunement,
                  is_attuned: item.is_attuned,
                  attunement_requirements: item.attunement_requirements,
                  magic_item_type: item.magic_item_type,
                  magic_item_rarity: item.magic_item_rarity,
                  magic_effects: item.magic_effects,
                }))
              : null,
          },
        );

        if (rpcError) throw rpcError;
        characterData.id = newCharacterId;
        savedCharacter = { ...character, id: newCharacterId, campaign_id: effectiveCampaignId };
      } else {
        // For existing characters, use traditional update approach
        const { error: updateError } = await supabase
          .from('characters')
          .update(characterData)
          .eq('id', characterData.id);

        if (updateError) throw updateError;

        // Transform and save character stats
        const statsData = {
          ...transformAbilityScoresForStorage(character.abilityScores!, characterData.id),
        };

        const { error: statsError } = await supabase.from('character_stats').upsert(statsData, {
          onConflict: 'character_id',
        });

        if (statsError) {
          logger.warn('Stats save failed but continuing:', statsError);
          // Don't throw - character core data saved
        }

        // Save equipment if present (non-blocking)
        if (character.inventory && character.inventory.length > 0) {
          const equipmentData = transformEquipmentForStorage(character, characterData.id);

          const { error: equipmentError } = await supabase
            .from('character_equipment')
            .upsert(equipmentData, {
              onConflict: 'character_id,item_name',
            });

          if (equipmentError) {
            logger.warn('Equipment save failed but continuing:', equipmentError);
            // Don't throw - character core data saved
          }
        }

        savedCharacter = { ...character, campaign_id: effectiveCampaignId };
      }

      // Save spells if present (handled separately from atomic creation)
      // Note: Spell saving happens AFTER character creation to maintain separation of concerns
      // If spell saving fails for a NEW character, we should consider cleanup
      if (
        (character.cantrips && character.cantrips.length > 0) ||
        (character.knownSpells && character.knownSpells.length > 0)
      ) {
        try {
          const frontendSpellIds = [
            ...(character.cantrips || []),
            ...(character.knownSpells || []),
          ];
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
            className: character.class?.name || '',
          });
          logger.info(
            `✅ Successfully saved ${databaseSpellIds.length}/${frontendSpellIds.length} spells for character ${characterData.id}`,
          );
        } catch (spellError) {
          // For NEW characters, spell save failures are more critical
          // because the character might be in an inconsistent state
          if (!character.id) {
            logger.error(
              '❌ Critical: Spell save failed for new character. Character data saved but spells missing:',
              spellError,
            );
            toast({
              title: 'Partial Save Success',
              description:
                'Character created but spell assignment failed. You can add spells manually later.',
              variant: 'destructive',
            });
          } else {
            // For existing characters, spell failures are less critical
            logger.warn('❌ Spell save failed but continuing:', spellError);
          }
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
        queryClient.invalidateQueries({
          queryKey: ['campaign', effectiveCampaignId, 'characters'],
        });
      }
      queryClient.invalidateQueries({ queryKey: ['character', characterData.id] });

      // Return the complete character data
      return savedCharacter;
    } catch (error) {
      logger.error('Error saving character:', error);
      toast({
        title: 'Save Error',
        description: `Failed to save character: ${error.message || 'Unknown error'}`,
        variant: 'destructive',
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
      const options: {
        referenceImageUrl?: string;
        retryAttempts?: number;
        fallbackToDefault?: boolean;
        useSimplifiedPrompt?: boolean;
      } = {};
      if (character.image_url) {
        options.referenceImageUrl = character.image_url;
        logger.info(`Using character image as reference: ${character.image_url}`);
      }

      const imageUrl = await characterBackgroundGenerator.generateCharacterBackground(
        character,
        options,
      );

      // Update the character with the generated image URL
      const { error } = await supabase
        .from('characters')
        .update({
          background_image: imageUrl,
          updated_at: new Date().toISOString(), // Ensure updated_at triggers realtime
        })
        .eq('id', characterId);

      if (error) {
        logger.error('Error updating character with background image:', error);
        // Don't throw error - character creation should still succeed
      } else {
        logger.info(
          `Successfully generated and saved background image for character ${characterId}`,
        );

        // Invalidate specific queries to refresh the UI with the new image
        queryClient.invalidateQueries({ queryKey: ['characters'] });
        queryClient.invalidateQueries({ queryKey: ['character', characterId] });

        // Show success notification
        toast({
          title: 'Character Background Generated',
          description: 'Your character background image has been created successfully.',
        });
      }
    } catch (error) {
      logger.error(`Failed to generate background image for character ${characterId}:`, error);

      // Show user-friendly error notification
      toast({
        title: 'Background Image Generation Failed',
        description:
          "We couldn't generate a background image for your character, but your character was created successfully. You can add an image later.",
        variant: 'destructive',
      });

      // Don't throw error - character creation should still succeed even if image generation fails
    }
  };

  return {
    saveCharacter,
    isSaving,
  };
};
