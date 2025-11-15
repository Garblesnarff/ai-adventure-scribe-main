import { useQuery } from '@tanstack/react-query';
import React from 'react';

import GalleryGrid from './GalleryGrid';

import { listEntityImages } from '@/services/gallery-service';

interface CharacterGalleryProps {
  characterId: string;
  avatarUrl?: string | null;
  designSheetUrl?: string | null;
  backgroundUrl?: string | null;
}

const CharacterGallery: React.FC<CharacterGalleryProps> = ({
  characterId,
  avatarUrl,
  designSheetUrl,
  backgroundUrl,
}) => {
  const { data, isLoading } = useQuery({
    queryKey: ['gallery', 'character', characterId],
    queryFn: () => listEntityImages('character', characterId),
    staleTime: 60_000,
  });

  const images = [] as { url: string; name?: string; createdAt?: string; label?: string }[];
  if (backgroundUrl) images.push({ url: backgroundUrl, label: 'Background' });
  if (avatarUrl) images.push({ url: avatarUrl, label: 'Avatar' });
  if (designSheetUrl) images.push({ url: designSheetUrl, label: 'Design Sheet' });
  if (data && data.length > 0) images.push(...data);

  if (isLoading) {
    return <div className="border rounded p-6 text-sm text-muted-foreground">Loading gallery…</div>;
  }

  return (
    <GalleryGrid
      title="Character Gallery"
      images={images}
      emptyMessage="No character images yet."
    />
  );
};

export default CharacterGallery;
