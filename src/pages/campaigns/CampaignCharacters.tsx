import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
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
    <div className="mt-4">
      {mode === 'create' ? (
        <>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Create Character</h2>
            <Button variant="outline" onClick={closeCreate}>Cancel</Button>
          </div>
          <CharacterWizard />
        </>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Characters</h2>
            <Button onClick={openCreate}>Create Character</Button>
          </div>
          <CampaignCharacterList />
        </>
      )}
    </div>
  );
};

export default CampaignCharacters;
