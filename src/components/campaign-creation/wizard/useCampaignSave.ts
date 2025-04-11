import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

/**
 * Custom hook for handling campaign saving functionality
 * @returns Object containing save function and loading state
 */
export const useCampaignSave = () => {
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  /**
   * Saves campaign data to Supabase
   * @param campaignData - The campaign data to save
   * @returns The saved campaign's ID if successful
   */
  const saveCampaign = async (campaignData: any) => {
    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .insert([{
          ...campaignData,
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

      return data.id;
    } catch (error) {
      console.error('Error in saveCampaign:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  return { saveCampaign, isSaving };
};