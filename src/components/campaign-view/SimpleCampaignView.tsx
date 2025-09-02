import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { SimpleGameChat } from '@/components/game/SimpleGameChat';
import { toast } from 'sonner';

interface Campaign {
  id: string;
  name: string;
  description: string;
  genre: string;
  difficulty_level: string;
  campaign_length: string;
  tone: string;
  era: string;
  location: string;
  atmosphere: string;
}

interface Character {
  id: string;
  name: string;
  race: string;
  class: string;
  level: number;
}

export const SimpleCampaignView: React.FC = () => {
  const { id: campaignId } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGameStarted, setIsGameStarted] = useState(false);

  const characterIdFromUrl = searchParams.get('character');

  useEffect(() => {
    if (campaignId) {
      loadCampaignData();
      loadUserCharacters();
    }
  }, [campaignId, user]);

  useEffect(() => {
    if (characterIdFromUrl && characters.length > 0) {
      const character = characters.find(c => c.id === characterIdFromUrl);
      if (character) {
        setSelectedCharacter(character);
        setIsGameStarted(true);
      }
    }
  }, [characterIdFromUrl, characters]);

  const loadCampaignData = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (error) throw error;
      setCampaign(data);
    } catch (error) {
      console.error('Error loading campaign:', error);
      toast.error('Failed to load campaign data');
    }
  };

  const loadUserCharacters = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('characters')
        .select('id, name, race, class, level')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCharacters(data || []);
    } catch (error) {
      console.error('Error loading characters:', error);
      toast.error('Failed to load characters');
    } finally {
      setLoading(false);
    }
  };

  const startGameWithCharacter = (character: Character) => {
    setSelectedCharacter(character);
    setIsGameStarted(true);
    setSearchParams({ character: character.id });
  };

  const backToCharacterSelection = () => {
    setIsGameStarted(false);
    setSelectedCharacter(null);
    setSearchParams({});
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex flex-col items-center space-y-2">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">Loading campaign...</p>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">Campaign not found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Campaign Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-3xl">{campaign.name}</CardTitle>
            {isGameStarted && selectedCharacter && (
              <Button onClick={backToCharacterSelection} variant="outline">
                Change Character
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{campaign.genre}</Badge>
            <Badge variant="secondary">{campaign.difficulty_level}</Badge>
            <Badge variant="secondary">{campaign.campaign_length}</Badge>
            <Badge variant="secondary">{campaign.tone}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">{campaign.description}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium">Era:</span> {campaign.era}
            </div>
            <div>
              <span className="font-medium">Location:</span> {campaign.location}
            </div>
            <div>
              <span className="font-medium">Atmosphere:</span> {campaign.atmosphere}
            </div>
          </div>
        </CardContent>
      </Card>

      {!isGameStarted ? (
        /* Character Selection */
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Choose Your Character</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {characters.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">You don't have any characters yet.</p>
                <Button onClick={() => window.location.href = '/characters/create'}>
                  Create Your First Character
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {characters.map((character) => (
                  <Card key={character.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <h3 className="font-semibold text-lg">{character.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Level {character.level} {character.race} {character.class}
                        </p>
                        <Button 
                          onClick={() => startGameWithCharacter(character)}
                          className="w-full"
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Start Adventure
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Game Interface */
        <div className="h-[600px]">
          <SimpleGameChat
            campaignId={campaign.id}
            characterId={selectedCharacter!.id}
            campaignDetails={campaign}
            characterDetails={selectedCharacter}
          />
        </div>
      )}
    </div>
  );
};