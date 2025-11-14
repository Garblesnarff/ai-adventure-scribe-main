import React from 'react';
import { useParams } from 'react-router-dom';

import CampaignGallery from '@/components/gallery/CampaignGallery';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CampaignOverviewProps {
  campaign?: {
    id: string;
    description?: string | null;
    genre?: string | null;
    tone?: string | null;
    campaign_length?: string | null;
    difficulty_level?: string | null;
    background_image?: string | null;
  } | null;
  onStartNewSession?: () => void;
}

const CampaignOverview: React.FC<CampaignOverviewProps> = ({ campaign, onStartNewSession }) => {
  const { id: campaignId } = useParams();

  if (!campaign) {
    return (
      <div className="space-y-8">
        {/* Hero Skeleton */}
        <div className="relative h-64 sm:h-80 rounded-2xl bg-gradient-to-br from-slate-800 via-purple-900/40 to-indigo-900 animate-pulse">
          <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-black/25 to-black/40 rounded-2xl"></div>
          <div className="absolute bottom-6 left-6 right-6">
            <div className="h-8 bg-white/20 rounded-lg w-1/3 mb-4"></div>
            <div className="flex gap-2">
              <div className="h-6 bg-white/20 rounded-full w-16"></div>
              <div className="h-6 bg-white/20 rounded-full w-20"></div>
              <div className="h-6 bg-white/20 rounded-full w-18"></div>
            </div>
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-strong rounded-2xl p-8">
              <div className="h-8 bg-white/20 rounded-lg w-1/4 mb-6"></div>
              <div className="space-y-4">
                <div className="h-4 bg-white/10 rounded w-full"></div>
                <div className="h-4 bg-white/10 rounded w-5/6"></div>
                <div className="h-4 bg-white/10 rounded w-4/5"></div>
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <div className="glass-strong rounded-2xl p-6">
              <div className="h-6 bg-white/20 rounded-lg w-1/2 mb-4"></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="h-4 bg-white/10 rounded"></div>
                <div className="h-4 bg-white/10 rounded"></div>
                <div className="h-4 bg-white/10 rounded"></div>
                <div className="h-4 bg-white/10 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Immersive Hero Section - Integrated with Header */}
      <div className="relative h-48 sm:h-64 rounded-2xl overflow-hidden bg-gradient-to-br from-slate-800 via-purple-900/40 to-indigo-900">
        {campaign.background_image && (
          <img
            src={campaign.background_image}
            alt="Campaign background"
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-black/60"></div>

        {/* Floating Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-infinite-gold/30 rounded-full animate-pulse"></div>
          <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-white/40 rounded-full animate-pulse delay-1000"></div>
          <div className="absolute bottom-1/4 left-1/2 w-1.5 h-1.5 bg-infinite-teal/40 rounded-full animate-pulse delay-500"></div>
        </div>

        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex flex-wrap gap-2">
            {campaign.genre && (
              <Badge className="bg-brand-primary/20 text-brand-primary border-brand-primary/30 hover:bg-brand-primary/30">
                {campaign.genre}
              </Badge>
            )}
            {campaign.difficulty_level && (
              <Badge className="bg-brand-accent/20 text-brand-accent border-brand-accent/30 hover:bg-brand-accent/30">
                {campaign.difficulty_level}
              </Badge>
            )}
            {campaign.campaign_length && (
              <Badge className="bg-brand-secondary/20 text-brand-secondary border-brand-secondary/30 hover:bg-brand-secondary/30">
                {campaign.campaign_length}
              </Badge>
            )}
            {campaign.tone && (
              <Badge variant="outline" className="border-white/30 text-white/90 hover:bg-white/10">
                {campaign.tone}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Description Panel */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-strong rounded-2xl p-8 hover-lift">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-infinite-purple to-infinite-gold flex items-center justify-center">
                <span className="text-white font-bold text-lg">📜</span>
              </div>
              <h2 className="text-2xl font-bold dark:text-white text-gray-900">
                Campaign Overview
              </h2>
            </div>

            <div className="prose prose-lg max-w-none">
              <p className="dark:text-white text-gray-900 leading-relaxed whitespace-pre-line text-base sm:text-lg">
                {campaign.description || 'No description provided yet. The journey awaits...'}
              </p>
            </div>

            {/* Campaign Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-border/30">
              {campaign.genre && (
                <div className="text-center p-3 rounded-lg bg-brand-primary/10 border border-brand-primary/20">
                  <div className="text-brand-primary font-semibold text-sm">Genre</div>
                  <div className="dark:text-white text-gray-900 text-sm">{campaign.genre}</div>
                </div>
              )}
              {campaign.tone && (
                <div className="text-center p-3 rounded-lg bg-white/10 border border-border/40">
                  <div className="dark:text-gray-200 text-gray-700 font-semibold text-sm">Tone</div>
                  <div className="dark:text-white text-gray-900 font-medium text-sm">
                    {campaign.tone}
                  </div>
                </div>
              )}
              {campaign.campaign_length && (
                <div className="text-center p-3 rounded-lg bg-brand-secondary/10 border border-brand-secondary/20">
                  <div className="text-brand-secondary font-semibold text-sm">Length</div>
                  <div className="dark:text-white text-gray-900 text-sm">
                    {campaign.campaign_length}
                  </div>
                </div>
              )}
              {campaign.difficulty_level && (
                <div className="text-center p-3 rounded-lg bg-brand-accent/10 border border-brand-accent/20">
                  <div className="text-brand-accent font-semibold text-sm">Difficulty</div>
                  <div className="dark:text-white text-gray-900 text-sm">
                    {campaign.difficulty_level}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Info Panel */}
        <div className="space-y-6">
          <div className="glass-strong rounded-2xl p-6 hover-lift">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 dark:text-white text-gray-900">
              <span className="w-2 h-2 rounded-full bg-infinite-gold"></span>
              Campaign Details
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center py-2 border-b border-border/30">
                <span className="dark:text-gray-200 text-gray-700 font-medium">Status</span>
                <Badge className="bg-success/20 text-success border-success/30">Active</Badge>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/30">
                <span className="dark:text-gray-200 text-gray-700 font-medium">Created</span>
                <span className="dark:text-white text-gray-900 font-semibold">Recently</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="dark:text-gray-200 text-gray-700 font-medium">Players</span>
                <span className="dark:text-white text-gray-900 font-semibold">0 / 6</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="glass-strong rounded-2xl p-6 hover-lift">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 dark:text-white text-gray-900">
              <span className="w-2 h-2 rounded-full bg-infinite-teal"></span>
              Quick Actions
            </h3>
            <div className="space-y-3">
              <button
                onClick={() => onStartNewSession?.()}
                className="w-full px-4 py-3 bg-gradient-to-r from-infinite-purple to-infinite-purple-dark text-white rounded-lg hover:from-infinite-purple-dark hover:to-infinite-purple transition-all duration-300 hover-lift font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Start New Session
              </button>
              <button className="w-full px-4 py-3 border-2 border-infinite-gold text-infinite-gold rounded-lg hover:bg-infinite-gold/10 transition-all duration-300 font-medium">
                Invite Players
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Gallery Section */}
      <div className="glass-strong rounded-2xl p-8 hover-lift">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-infinite-teal to-infinite-purple flex items-center justify-center">
            <span className="text-white font-bold text-lg">🎨</span>
          </div>
          <h2 className="text-2xl font-bold dark:text-white text-gray-900">Campaign Gallery</h2>
        </div>

        {campaignId && (
          <CampaignGallery
            campaignId={campaignId as string}
            backgroundImageUrl={campaign.background_image ?? null}
          />
        )}
      </div>
    </div>
  );
};

export default CampaignOverview;
