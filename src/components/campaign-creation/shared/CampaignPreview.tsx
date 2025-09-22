import React from 'react';
import { useCampaign } from '@/contexts/CampaignContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Map,
  Users,
  Calendar,
  Settings,
  Sparkles,
  Crown,
  Star,
  Wand2,
  BookOpen
} from 'lucide-react';

/**
 * Real-time campaign preview component
 * Shows campaign progression and current settings as choices are made
 */
const CampaignPreview: React.FC = () => {
  const { state } = useCampaign();
  const campaign = state.campaign;

  if (!campaign) {
    return (
      <Card className="p-6 bg-gradient-to-br from-amber-50/50 to-yellow-50/50 dark:from-amber-950/20 dark:to-yellow-950/20 border-2 border-dashed border-amber-200 dark:border-amber-800">
        <div className="text-center space-y-4">
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-amber-400 to-yellow-600 rounded-full flex items-center justify-center border-4 border-white shadow-lg">
            <Sparkles className="w-12 h-12 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-infinite-purple">Campaign Preview</h3>
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
      case 'fantasy': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'sci-fi': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'horror': return 'bg-red-100 text-red-800 border-red-200';
      case 'modern': return 'bg-green-100 text-green-800 border-green-200';
      case 'historical': return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'hard': return 'bg-red-100 text-red-800 border-red-200';
      case 'nightmare': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getToneColor = (tone: string) => {
    switch (tone?.toLowerCase()) {
      case 'serious': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'humorous': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'gritty': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-amber-50/50 via-yellow-50/50 to-orange-50/50 dark:from-amber-950/20 dark:via-yellow-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-800">
      <div className="space-y-6">
        {/* Campaign Header */}
        <div className="text-center space-y-3">
          <div className="relative">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-amber-400 to-yellow-600 rounded-full flex items-center justify-center border-4 border-white shadow-lg">
              <Map className="w-10 h-10 text-white" />
            </div>
            {campaign.name && (
              <Badge className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-white text-gray-800 border-2 border-amber-200">
                Campaign
              </Badge>
            )}
          </div>

          <div>
            <h3 className="font-bold text-xl text-infinite-purple">
              {campaign.name || 'Untitled Campaign'}
            </h3>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {campaign.genre && (
                <Badge className={getGenreColor(campaign.genre)}>
                  {campaign.genre}
                </Badge>
              )}
              {campaign.difficulty_level && (
                <Badge className={getDifficultyColor(campaign.difficulty_level)}>
                  {campaign.difficulty_level}
                </Badge>
              )}
              {campaign.tone && (
                <Badge className={getToneColor(campaign.tone)}>
                  {campaign.tone}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <Separator className="bg-amber-200 dark:bg-amber-800" />

        {/* Campaign Details */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm text-infinite-purple flex items-center">
            <Settings className="w-4 h-4 mr-2" />
            Campaign Settings
          </h4>
          <div className="grid grid-cols-1 gap-2">
            {campaign.campaign_length && (
              <div className="flex items-center justify-between p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-amber-100 dark:border-amber-900">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-medium">Campaign Length</span>
                </div>
                <div className="font-bold text-sm capitalize">{campaign.campaign_length}</div>
              </div>
            )}
            {campaign.setting?.location && (
              <div className="flex items-center justify-between p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-amber-100 dark:border-amber-900">
                <div className="flex items-center space-x-2">
                  <Map className="w-4 h-4 text-amber-600" />
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
            <h4 className="font-semibold text-sm text-infinite-purple flex items-center">
              <BookOpen className="w-4 h-4 mr-2" />
              Description
            </h4>
            <p className="text-xs text-muted-foreground bg-white/50 dark:bg-gray-800/50 p-2 rounded border border-amber-100 dark:border-amber-900 line-clamp-3">
              {campaign.description}
            </p>
          </div>
        )}



        {/* Campaign Status */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm text-infinite-purple flex items-center">
            <Crown className="w-4 h-4 mr-2" />
            Campaign Status
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-amber-100 dark:border-amber-900">
              <div className="text-lg font-bold text-infinite-purple">
                {campaign.genre ? '1' : '0'}/4
              </div>
              <div className="text-xs text-muted-foreground">Steps Complete</div>
            </div>
            <div className="text-center p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-amber-100 dark:border-amber-900">
              <div className="text-lg font-bold text-green-600">
                {campaign.name ? '✓' : '○'}
              </div>
              <div className="text-xs text-muted-foreground">Ready to Play</div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default CampaignPreview;
