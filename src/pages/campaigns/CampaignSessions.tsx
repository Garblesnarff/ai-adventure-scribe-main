import React from 'react';
import { Card } from '@/components/ui/card';

const CampaignSessions: React.FC = () => {
  return (
    <div className="mt-4">
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-2">Sessions</h2>
        <p className="text-muted-foreground">Manage and view campaign sessions here.</p>
      </Card>
    </div>
  );
};

export default CampaignSessions;
