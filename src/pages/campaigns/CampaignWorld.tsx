import React from 'react';

import { Card } from '@/components/ui/card';

const CampaignWorld: React.FC = () => {
  return (
    <div className="mt-4">
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-2">World</h2>
        <p className="text-muted-foreground">
          World details, locations, and NPCs will be shown here.
        </p>
      </Card>
    </div>
  );
};

export default CampaignWorld;
