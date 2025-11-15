import { Image as ImageIcon, RefreshCw, Loader2 } from 'lucide-react';
import React from 'react';

import ChatImage from '@/components/game/ChatImage';
import { Button } from '@/components/ui/button';

interface MessageImageSectionProps {
  messageId: string;
  isGenerating: boolean;
  imageUrl?: string;
  error?: string;
  onGenerate: () => void;
}

/**
 * MessageImageSection Component
 * Displays scene image generation UI for DM messages
 * - Generate/Regenerate button
 * - ChatImage display (mobile inline, desktop floating overlay)
 * - Error display
 */
export const MessageImageSection: React.FC<MessageImageSectionProps> = ({
  messageId,
  isGenerating,
  imageUrl,
  error,
  onGenerate,
}) => {
  const hasImage = Boolean(imageUrl);

  return (
    <>
      {/* Mobile inline thumbnail */}
      {hasImage && (
        <div className="mt-2 md:hidden flex justify-center">
          <ChatImage url={imageUrl!} alt="Scene" />
        </div>
      )}

      {/* Generate/Regenerate button */}
      <div className="mt-2 flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={onGenerate}
          disabled={isGenerating}
          className="h-8 px-2 py-1"
        >
          {isGenerating ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Generating...
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              {hasImage ? <RefreshCw className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
              {hasImage ? 'Regenerate image' : 'Generate scene image'}
            </span>
          )}
        </Button>
        {error && <span className="text-xs text-red-300">{error}</span>}
      </div>

      {/* Desktop floating thumbnail overlay */}
      {hasImage && (
        <div className="absolute hidden md:block bottom-0 left-[75%] -translate-x-1/2 translate-y-20 z-20 pointer-events-auto">
          <ChatImage
            url={imageUrl!}
            alt="Scene"
            className="w-[220px] max-w-[260px] rounded-xl shadow-2xl ring-1 ring-black/10"
          />
        </div>
      )}
    </>
  );
};
