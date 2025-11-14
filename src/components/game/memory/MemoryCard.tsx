import React from 'react';

import { MEMORY_CATEGORIES } from './memoryConstants';

import type { Memory } from './types';

import { Card } from '@/components/ui/card';

interface MemoryCardProps {
  memory: Memory;
}

/**
 * MemoryCard Component
 * Displays individual memory entries with their associated icons and metadata
 * @param {Memory} memory - The memory object to display
 */
export const MemoryCard: React.FC<MemoryCardProps> = ({ memory }) => {
  const category = MEMORY_CATEGORIES.find((cat) => cat.type === memory.type);

  return (
    <Card className="p-3 bg-white/50 hover:bg-white/80 transition-colors">
      <div className="flex items-start gap-2">
        {category?.icon}
        <div>
          <p className="text-sm">{memory.content}</p>
          {memory.metadata && Object.keys(memory.metadata).length > 0 && (
            <div className="mt-1 text-xs text-muted-foreground">
              {Object.entries(memory.metadata).map(([key, value]) => (
                <span key={key} className="mr-2">
                  {key}: {value}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
