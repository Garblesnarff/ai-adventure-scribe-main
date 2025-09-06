import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { campaignImageGenerator } from '@/services/campaign-image-generator';

/**
 * Custom hook for handling campaign saving functionality
 * @returns Object containing save function and loading state
 */
export const useCampaignSave = () => {
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  /**
   * Saves campaign data to Supabase and generates background image
   * @param campaignData - The campaign data to save
   * @returns The saved campaign's ID if successful
   */
  const saveCampaign = async (campaignData: any) => {
    setIsSaving(true);
    try {
      console.log('Creating campaign and generating background image...');
      
      // First, save the campaign without the background image
      // Extract background_image from campaignData to avoid schema errors
      const { background_image, ...campaignDataWithoutImage } = campaignData;
      
      const { data, error } = await supabase
        .from('campaigns')
        .insert([{
          ...campaignDataWithoutImage,
          status: 'active',
          setting_details: campaignData.setting_details || {},
        }])
        .select()
        .single();

      if (error) {
        console.error('Error saving campaign:', error);
        throw new Error(error.message);
      }

      if (!data) {
        throw new Error('No data returned from insert');
      }

      const campaignId = data.id;

      // Generate background image asynchronously
      // Don't block campaign creation on image generation
      generateBackgroundImage(campaignId, campaignData);

      return campaignId;
    } catch (error) {
      console.error('Error in saveCampaign:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Generate background image for the campaign
   * This runs asynchronously after campaign creation
   */
  const generateBackgroundImage = async (campaignId: string, campaignData: any) => {
    try {
      console.log(`Generating background image for campaign ${campaignId}`);
      
      // Generate the image
      const imageUrl = await campaignImageGenerator.generateCampaignImage(campaignData);
      
      // Update the campaign with the generated image URL
      const { error } = await supabase
        .from('campaigns')
        .update({ background_image: imageUrl })
        .eq('id', campaignId);

      if (error) {
        console.error('Error updating campaign with background image:', error);
        // Don't throw error - campaign creation should still succeed
      } else {
        console.log(`Successfully generated and saved background image for campaign ${campaignId}`);
      }
    } catch (error) {
      console.error(`Failed to generate background image for campaign ${campaignId}:`, error);
      // Don't throw error - campaign creation should still succeed even if image generation fails
    }
  };

  return { saveCampaign, isSaving };
};