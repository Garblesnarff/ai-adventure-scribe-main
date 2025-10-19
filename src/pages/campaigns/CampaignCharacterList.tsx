import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MemoizedCharacterCard } from '@/components/character-list/character-card';
import { Character } from '@/types/character';
import { Skeleton } from '@/components/ui/skeleton';
import logger from '@/lib/logger';

const CampaignCharacterList: React.FC = () => {
  const { id: campaignId } = useParams();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['campaign', campaignId, 'characters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('characters')
        .select(`
          id, name, description, race, class, level, image_url, background_image, appearance, personality_traits, backstory_elements, background,
          character_stats!left (
            strength, dexterity, constitution, intelligence, wisdom, charisma,
            max_hit_points, current_hit_points, armor_class
          )
        `)
        .eq('campaign_id', campaignId as string)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: Boolean(campaignId),
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-64 w-full" />
        ))}
      </div>
    );
  }

  const transformCharacterData = (rawData: any[]): Partial<Character>[] => {
    return rawData.map((char) => ({
      ...char,
    }));
  };

  const characters = transformCharacterData(data || []);

  if (!characters.length) {
    return <div className="text-muted-foreground mt-4">No characters in this campaign yet.</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-2">
      {characters.map((character) => {
        if (!character.id || !character.name) return null;
        return (
          <MemoizedCharacterCard
            key={character.id}
            character={character as Partial<Character> & { id: string; name: string }}
            onDelete={() => refetch()}
          />
        );
      })}
    </div>
  );
};

export default CampaignCharacterList;
