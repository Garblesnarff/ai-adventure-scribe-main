import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import CampaignCharacterList from './CampaignCharacterList';
import CharacterWizard from '@/components/character-creation/character-wizard';

interface Props {
  mode?: 'list' | 'create';
}

const CampaignCharacters: React.FC<Props> = ({ mode = 'list' }) => {
  const { id: campaignId } = useParams();
  const navigate = useNavigate();

  const openCreate = () => navigate(`/app/campaigns/${campaignId}/characters/new`);
  const closeCreate = () => navigate(`/app/campaigns/${campaignId}/characters`);

  return (
    <div className="mt-4 space-y-6">
      {mode === 'create' ? (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle asChild>
              <h2>Create Character</h2>
            </CardTitle>
            <Button variant="outline" onClick={closeCreate}>Cancel</Button>
          </CardHeader>
          <CardContent>
            <CharacterWizard />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle asChild>
              <h2>Characters</h2>
            </CardTitle>
            <Button onClick={openCreate}>Create Character</Button>
          </CardHeader>
          <CardContent>
            <CampaignCharacterList />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CampaignCharacters;
