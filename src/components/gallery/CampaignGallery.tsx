import React from 'react';
import { useQuery } from '@tanstack/react-query';
import GalleryGrid from './GalleryGrid';
import { listEntityImages } from '@/services/gallery-service';

interface CampaignGalleryProps {
  campaignId: string;
  backgroundImageUrl?: string | null;
}

const CampaignGallery: React.FC<CampaignGalleryProps> = ({ campaignId, backgroundImageUrl }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['gallery', 'campaign', campaignId],
    queryFn: () => listEntityImages('campaign', campaignId),
    staleTime: 60_000
  });

  const images = [] as { url: string; name?: string; createdAt?: string; label?: string }[];
  if (backgroundImageUrl) {
    images.push({ url: backgroundImageUrl, label: 'Background' });
  }
  if (data && data.length > 0) images.push(...data);

  if (isLoading) {
    return (
      <div className="border rounded p-6 text-sm text-muted-foreground">Loading gallery…</div>
    );
  }

  return (
    <GalleryGrid title="Campaign Gallery" images={images} emptyMessage="No campaign images yet." />
  );
};

export default CampaignGallery;
