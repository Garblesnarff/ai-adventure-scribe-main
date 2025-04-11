import { supabase } from '@/integrations/supabase/client';
import { ErrorHandlingService } from '../../error/services/ErrorHandlingService';
import { ErrorCategory, ErrorSeverity } from '../../error/types';

export class CampaignContextProvider {
  private errorHandler: ErrorHandlingService;

  constructor() {
    this.errorHandler = ErrorHandlingService.getInstance();
  }

  public async fetchCampaignDetails(campaignId: string) {
    try {
      const { data, error } = await this.errorHandler.handleDatabaseOperation(
        async () => supabase.from('campaigns').select('*').eq('id', campaignId).single(),
        {
          category: ErrorCategory.DATABASE,
          context: 'CampaignContextProvider.fetchCampaignDetails',
          severity: ErrorSeverity.HIGH
        }
      );

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching campaign details:', error);
      return null;
    }
  }
}