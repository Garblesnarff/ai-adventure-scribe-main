import React from 'react';
import { Card } from '@/components/ui/card';

const CampaignOverview: React.FC = () => {
  return (
    <div className="mt-4">
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-2">Overview</h2>
        <p className="text-muted-foreground">Campaign summary and recent activity will appear here.</p>
      </Card>
    </div>
  );
};

export default CampaignOverview;
