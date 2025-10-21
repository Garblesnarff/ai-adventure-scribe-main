import React from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
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
        <Card className="p-6">Loading campaign…</Card>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-6">
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-3">About</h2>
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
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-3">Gallery</h3>
        {campaignId && (
          <CampaignGallery
            campaignId={campaignId as string}
            backgroundImageUrl={campaign.background_image ?? null}
          />
        )}
      </Card>

      {/* Characters are shown in the Characters tab. */}
    </div>
  );
};

export default CampaignOverview;
