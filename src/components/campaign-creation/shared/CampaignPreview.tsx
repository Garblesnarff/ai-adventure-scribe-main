import {
  Map,
  Users,
  Calendar,
  Settings,
  Sparkles,
  Crown,
  Star,
  Wand2,
  BookOpen,
} from 'lucide-react';
import React from 'react';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useCampaign } from '@/contexts/CampaignContext';

/**
 * Real-time campaign preview component
 * Shows campaign progression and current settings as choices are made
 */
const CampaignPreview: React.FC = () => {
  const { state } = useCampaign();
  const campaign = state.campaign;

  if (!campaign) {
    return (
      <Card className="p-6 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950 border-2 border-dashed border-muted-foreground/25">
        <div className="text-center space-y-4">
          <div className="w-24 h-24 mx-auto bg-muted rounded-full flex items-center justify-center">
            <Sparkles className="w-12 h-12 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Campaign Preview</h3>
            <p className="text-sm text-muted-foreground">
              Your campaign will appear here as you make choices
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const getGenreColor = (genre: string) => {
    switch (genre?.toLowerCase()) {
      case 'fantasy':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'sci-fi':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'horror':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'modern':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'historical':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'hard':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'nightmare':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getToneColor = (tone: string) => {
    switch (tone?.toLowerCase()) {
      case 'serious':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'humorous':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'gritty':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
      <div className="space-y-6">
        {/* Campaign Header */}
        <div className="text-center space-y-3">
          <div className="relative">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-400 to-purple-600 rounded-full flex items-center justify-center border-4 border-white shadow-lg">
              <Map className="w-10 h-10 text-white" />
            </div>
            {campaign.name && (
              <Badge className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-white text-gray-800 border-2 border-blue-200">
                Campaign
              </Badge>
            )}
          </div>

          <div>
            <h3 className="font-bold text-xl text-gray-900 dark:text-white">
              {campaign.name || 'Untitled Campaign'}
            </h3>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {campaign.genre && (
                <Badge variant="secondary" className={getGenreColor(campaign.genre)}>
                  {campaign.genre}
                </Badge>
              )}
              {campaign.difficulty_level && (
                <Badge
                  variant="secondary"
                  className={getDifficultyColor(campaign.difficulty_level)}
                >
                  {campaign.difficulty_level}
                </Badge>
              )}
              {campaign.tone && (
                <Badge variant="secondary" className={getToneColor(campaign.tone)}>
                  {campaign.tone}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <Separator className="bg-blue-200 dark:bg-blue-800" />

        {/* Campaign Details */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 flex items-center">
            <Settings className="w-4 h-4 mr-2" />
            Campaign Settings
          </h4>
          <div className="grid grid-cols-1 gap-2">
            {campaign.campaign_length && (
              <div className="flex items-center justify-between p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-blue-100 dark:border-blue-900">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs font-medium">Campaign Length</span>
                </div>
                <div className="font-bold text-sm capitalize">{campaign.campaign_length}</div>
              </div>
            )}
            {campaign.setting?.location && (
              <div className="flex items-center justify-between p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-blue-100 dark:border-blue-900">
                <div className="flex items-center space-x-2">
                  <Map className="w-4 h-4" />
                  <span className="text-xs font-medium">Location</span>
                </div>
                <div className="font-bold text-sm">{campaign.setting.location}</div>
              </div>
            )}
          </div>
        </div>

        {/* Campaign Description */}
        {campaign.description && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 flex items-center">
              <BookOpen className="w-4 h-4 mr-2" />
              Description
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-3 bg-white/50 dark:bg-gray-800/50 p-2 rounded border border-blue-100 dark:border-blue-900">
              {campaign.description}
            </p>
          </div>
        )}

        {/* Campaign Status */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 flex items-center">
            <Star className="w-4 h-4 mr-2" />
            Creation Progress
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-blue-100 dark:border-blue-900">
              <div className="text-lg font-bold text-blue-600">{campaign.genre ? '1' : '0'}/4</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Steps Complete</div>
            </div>
            <div className="text-center p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-blue-100 dark:border-blue-900">
              <div className="text-lg font-bold text-green-600">{campaign.name ? '✓' : '○'}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Ready to Play</div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default CampaignPreview;
