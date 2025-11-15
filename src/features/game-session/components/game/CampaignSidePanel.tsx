import React from 'react';

import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCampaign } from '@/contexts/CampaignContext';

interface CampaignSidePanelProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

/**
 * Compact campaign info panel for the left sidebar. Collapsible with a fixed
 * width window to mirror Google AI Studio’s left rail.
 */
export const CampaignSidePanel: React.FC<CampaignSidePanelProps> = ({ isCollapsed, onToggle }) => {
  const { state } = useCampaign();
  const campaign = state.campaign;

  if (isCollapsed) return null;

  return (
    <div className="hidden md:block h-full">
      <Card className="h-full glass-strong shadow-2xl border-2 border-infinite-purple/40 overflow-hidden bg-gradient-to-b from-card/95 to-card/90 backdrop-blur-sm transition-all duration-300 hover:shadow-3xl">
        <div className="p-4 border-b border-border/60 flex items-center justify-between bg-gradient-to-r from-infinite-purple/10 to-transparent">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-infinite-gold rounded-full animate-pulse"></div>
            <h3 className="font-display font-semibold truncate text-infinite-purple">Campaign</h3>
          </div>
          <button
            onClick={onToggle}
            className="text-sm opacity-70 hover:opacity-100 hover:bg-infinite-purple/20 px-2 py-1 rounded-md transition-all duration-200"
            aria-label="Collapse campaign panel"
          >
            Hide
          </button>
        </div>
        <ScrollArea className="h-full p-4">
          {!campaign ? (
            <div className="text-sm text-muted-foreground">Loading campaign...</div>
          ) : (
            <div className="space-y-4 pr-2">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Name</div>
                <div className="font-medium break-words">{campaign.name}</div>
              </div>
              {campaign.description && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Description</div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {campaign.description}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {campaign.genre && (
                  <div>
                    <div className="text-xs text-muted-foreground">Genre</div>
                    <div>{campaign.genre}</div>
                  </div>
                )}
                {campaign.tone && (
                  <div>
                    <div className="text-xs text-muted-foreground">Tone</div>
                    <div>{campaign.tone}</div>
                  </div>
                )}
                {campaign.difficulty_level && (
                  <div>
                    <div className="text-xs text-muted-foreground">Difficulty</div>
                    <div>{campaign.difficulty_level}</div>
                  </div>
                )}
                {campaign.campaign_length && (
                  <div>
                    <div className="text-xs text-muted-foreground">Length</div>
                    <div>{campaign.campaign_length}</div>
                  </div>
                )}
              </div>
              {campaign.enhancementEffects?.themes &&
                campaign.enhancementEffects.themes.length > 0 && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Themes</div>
                    <div className="flex flex-wrap gap-2">
                      {campaign.enhancementEffects.themes.map((t, i) => (
                        <span key={i} className="px-2 py-1 rounded-full bg-muted text-xs">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          )}
        </ScrollArea>
      </Card>
    </div>
  );
};

export default CampaignSidePanel;
