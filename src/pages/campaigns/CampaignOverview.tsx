import React from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import CampaignGallery from '@/components/gallery/CampaignGallery';
import CampaignCharacterList from './CampaignCharacterList';

interface CampaignOverviewProps {
  campaign?: {
    id: string;
    description?: string | null;
    genre?: string | null;
    tone?: string | null;
    campaign_length?: string | null;
    difficulty_level?: string | null;
    background_image?: string | null;
  } | null;
}

const CampaignOverview: React.FC<CampaignOverviewProps> = ({ campaign }) => {
  const { id: campaignId } = useParams();

  if (!campaign) {
    return (
      <div className="mt-4 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent>
            Loading campaign…
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground whitespace-pre-line">
            {campaign.description || 'No description provided.'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 text-sm">
            {campaign.genre && (
              <div><span className="font-medium">Genre:</span> {campaign.genre}</div>
            )}
            {campaign.tone && (
              <div><span className="font-medium">Tone:</span> {campaign.tone}</div>
            )}
            {campaign.campaign_length && (
              <div><span className="font-medium">Length:</span> {campaign.campaign_length}</div>
            )}
            {campaign.difficulty_level && (
              <div><span className="font-medium">Difficulty:</span> {campaign.difficulty_level}</div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gallery</CardTitle>
        </CardHeader>
        <CardContent>
          {campaignId && (
            <CampaignGallery
              campaignId={campaignId as string}
              backgroundImageUrl={campaign.background_image ?? null}
            />
          )}
        </CardContent>
      </Card>

      {/* Characters are shown in the Characters tab. */}
    </div>
  );
};

export default CampaignOverview;
