import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import CampaignCharacterList from './CampaignCharacterList';
import CreateCharacterPanel from './CreateCharacterPanel';

import { Button } from '@/components/ui/button';

interface Props {
  mode?: 'list' | 'create';
}

const CampaignCharacters: React.FC<Props> = ({ mode = 'list' }) => {
  const { id: campaignId } = useParams();
  const navigate = useNavigate();

  const openCreate = () => {
    if (!campaignId) {
      return;
    }
    navigate(`/app/campaigns/${campaignId}/characters/new?campaign=${campaignId}`);
  };

  const closeCreate = () => {
    if (!campaignId) {
      return;
    }
    navigate(`/app/campaigns/${campaignId}/characters`, { replace: true });
  };

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Characters</h2>
        <Button onClick={openCreate} disabled={!campaignId}>
          Create Character
        </Button>
      </div>
      <CampaignCharacterList />
      {mode === 'create' && <CreateCharacterPanel open onClose={closeCreate} />}
    </div>
  );
};

export default CampaignCharacters;
