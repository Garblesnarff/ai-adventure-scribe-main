import React from 'react';

import { Card } from '@/components/ui/card';

const CampaignSettings: React.FC = () => {
  return (
    <div className="mt-4">
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-2">Settings</h2>
        <p className="text-muted-foreground">Configure campaign settings here.</p>
      </Card>
    </div>
  );
};

export default CampaignSettings;
