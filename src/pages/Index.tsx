import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus, Users } from 'lucide-react';
import CampaignList from '@/components/campaign-list/campaign-list';

/**
 * Index page component serving as the landing page
 * Displays available campaigns and quick actions
 * @returns {JSX.Element} The index page with campaign list
 */
const Index = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [sortBy, setSortBy] = React.useState<'name' | 'created_at'>('created_at');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100">
      {/* Hero Header */}
      <div className="relative bg-cover py-24 px-4" style={{ backgroundImage: "url('/hero_header.png')", backgroundPosition: "center top -675px" }}>
        <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-black/20 to-black/30"></div>
        <div className="relative max-w-7xl mx-auto text-center">
          <div className="mb-6 h-20"></div>
          <p className="text-xl text-white/95 mb-12 max-w-3xl mx-auto drop-shadow-lg leading-relaxed">Step into boundless worlds of adventure, where every choice shapes destiny and legends are forged in the fires of imagination</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-md mx-auto">
            <Button
              onClick={() => navigate('/app/campaigns/create')}
              variant="fantasy"
              size="lg"
              className="px-8 py-4 text-lg font-semibold shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300"
            >
              <Plus className="w-6 h-6 mr-2" />
              Create Epic Saga
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="px-8 py-4 text-lg border-infinite-gold text-infinite-gold hover:bg-infinite-gold/10"
            >
              Explore Gallery
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 -mt-12 relative z-10">
        {/* Search and Sort Controls */}
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center mb-8 bg-background/80 backdrop-blur-sm rounded-2xl p-6 border border-border/30 shadow-lg">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <input
                type="text"
                placeholder="Search your campaigns by name or genre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 pl-12 pr-4 rounded-xl border-2 border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-infinite-purple focus:border-transparent transition-all duration-200"
              />
              <Users className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            </div>
          </div>
          
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'created_at')}
              className="px-4 py-3 rounded-xl border-2 border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-infinite-purple focus:border-transparent transition-all duration-200"
            >
              <option value="created_at">Sort by: Recent</option>
              <option value="name">Sort by: Name</option>
            </select>
          </div>
        </div>

        <CampaignList searchTerm={searchTerm} sortBy={sortBy} />
      </div>
    </div>
  );
};

export default Index;
