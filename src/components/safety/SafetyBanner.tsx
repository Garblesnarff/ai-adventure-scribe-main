import { AlertTriangle, PauseCircle, PlayCircle, Shield, Info } from 'lucide-react';
import React from 'react';

import { Card } from '../ui/card';

interface SafetyBannerProps {
  isPaused?: boolean;
  lastSafetyCommand?: {
    type: 'x_card' | 'veil' | 'pause' | 'resume';
    timestamp: string;
    autoTriggered?: boolean;
  };
  contentWarnings?: string[];
  comfortLevel?: 'pg' | 'pg13' | 'r' | 'custom';
  showSafetyInfo?: boolean;
}

export const SafetyBanner: React.FC<SafetyBannerProps> = ({
  isPaused = false,
  lastSafetyCommand,
  contentWarnings = [],
  comfortLevel = 'pg13',
  showSafetyInfo = false,
}) => {
  const getTimeSinceSafetyCommand = (timestamp: string): string => {
    const now = new Date();
    const safetyTime = new Date(timestamp);
    const diffMs = now.getTime() - safetyTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}min ago`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h ago`;
  };

  const getComfortLevelColor = (level: string): string => {
    switch (level) {
      case 'pg':
        return 'bg-green-500/20 border-green-500 text-green-700';
      case 'pg13':
        return 'bg-yellow-500/20 border-yellow-500 text-yellow-700';
      case 'r':
        return 'bg-orange-500/20 border-orange-500 text-orange-700';
      case 'custom':
        return 'bg-purple-500/20 border-purple-500 text-purple-700';
      default:
        return 'bg-blue-500/20 border-blue-500 text-blue-700';
    }
  };

  if (isPaused) {
    return (
      <Card
        className="mb-4 border-2 border-orange-300 bg-orange-50/90 backdrop-blur-sm"
        role="alert"
        aria-live="polite"
        aria-label="Game is paused for safety"
        tabIndex={0}
      >
        <div className="p-4 flex items-center gap-3">
          <PauseCircle className="w-6 h-6 text-orange-600 flex-shrink-0" aria-hidden="true" />
          <div className="flex-1">
            <h3 className="font-semibold text-orange-800" id="paused-title">
              Game Paused
            </h3>
            <p className="text-sm text-orange-700" id="paused-description">
              The game is currently paused. Use /resume when you're ready to continue. Your comfort
              and safety are the priority.
            </p>
            <div className="mt-2 text-xs text-orange-600">
              <span aria-hidden="true">⌨️</span> Keyboard shortcut: Press{' '}
              <kbd className="px-1 py-0.5 bg-orange-200 rounded">Ctrl+R</kbd> to resume
            </div>
          </div>
          <div
            className="flex items-center gap-2 text-xs text-orange-600"
            role="img"
            aria-label="Safety tools are active"
          >
            <Shield className="w-4 h-4" aria-hidden="true" />
            Safety Tools Active
          </div>
        </div>
      </Card>
    );
  }

  if (lastSafetyCommand) {
    const timeSince = getTimeSinceSafetyCommand(lastSafetyCommand.timestamp);
    const isXCard = lastSafetyCommand.type === 'x_card';
    const safetyAriaLabel = isXCard
      ? 'X-card was activated to stop uncomfortable content'
      : 'Safety tool was used to manage content';

    return (
      <Card
        className={`mb-4 ${
          isXCard
            ? 'border-2 border-red-300 bg-red-50/90'
            : 'border-2 border-blue-300 bg-blue-50/90'
        } backdrop-blur-sm`}
        role="alert"
        aria-live="assertive"
        aria-label={safetyAriaLabel}
        tabIndex={0}
      >
        <div className="p-4 flex items-center gap-3">
          {isXCard ? (
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" aria-hidden="true" />
          ) : (
            <Shield className="w-6 h-6 text-blue-600 flex-shrink-0" aria-hidden="true" />
          )}
          <div className="flex-1">
            <h3 className="font-semibold text-gray-800" id="safety-title">
              {isXCard ? 'X-Card Activated' : 'Safety Tool Used'}
            </h3>
            <p className="text-sm text-gray-700" id="safety-description">
              {isXCard
                ? 'The scene was stopped and content was rewound for your comfort.'
                : lastSafetyCommand.type === 'veil'
                  ? 'Sensitive content was faded to maintain comfort.'
                  : 'Safety measures were applied to ensure a comfortable experience.'}
              {lastSafetyCommand.autoTriggered && (
                <span className="ml-2 italic" aria-label="This was automatically triggered">
                  (Auto-triggered)
                </span>
              )}
            </p>
            <div className="mt-1 text-xs text-gray-600">
              <span aria-hidden="true">⌨️</span> Keyboard shortcuts:
              <kbd className="mx-1 px-1 py-0.5 bg-gray-200 rounded" aria-label="X-card shortcut">
                Ctrl+X
              </kbd>{' '}
              X-card,
              <kbd className="mx-1 px-1 py-0.5 bg-gray-200 rounded" aria-label="Pause shortcut">
                Ctrl+P
              </kbd>{' '}
              Pause
            </div>
          </div>
          <div
            className="text-xs text-gray-500"
            role="timer"
            aria-label={`Safety command activated ${timeSince}`}
          >
            {timeSince}
          </div>
        </div>
      </Card>
    );
  }

  if (showSafetyInfo && (contentWarnings.length > 0 || comfortLevel !== 'pg13')) {
    return (
      <Card className="mb-4 border border-gray-200 bg-gray-50/80 backdrop-blur-sm">
        <div className="p-3 flex items-center gap-3">
          <Info className="w-5 h-5 text-gray-600 flex-shrink-0" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`text-xs font-medium px-2 py-1 rounded-full border ${getComfortLevelColor(comfortLevel)}`}
              >
                {comfortLevel.toUpperCase()}
              </span>
              {contentWarnings.length > 0 && (
                <span className="text-xs text-gray-600">
                  {contentWarnings.length} content warnings
                </span>
              )}
            </div>
            {contentWarnings.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {contentWarnings.slice(0, 3).map((warning, index) => (
                  <span key={index} className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded">
                    {warning}
                  </span>
                ))}
                {contentWarnings.length > 3 && (
                  <span className="text-xs px-2 py-1 bg-gray-200 text-gray-500 rounded">
                    +{contentWarnings.length - 3} more
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  }

  return null;
};
