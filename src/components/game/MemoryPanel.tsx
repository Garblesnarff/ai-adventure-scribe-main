import React, { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { useMemoryContext } from '@/contexts/MemoryContext';
import { List, ChevronDown, ChevronUp } from 'lucide-react';
import { MemoryCard } from './memory/MemoryCard';
import { MemoryFilter } from './memory/MemoryFilter';
import { useMemoryFiltering } from './memory/useMemoryFiltering';

/**
 * MemoryPanel Component
 * Main component for displaying and managing game memories
 * Provides filtering, sorting, and collapsible functionality
 */
export const MemoryPanel: React.FC = () => {
  // Get memories from context with default empty array
  const { memories = [] } = useMemoryContext();
  
  // Local state for panel expansion and type filtering
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  // Get filtered and sorted memories using custom hook
  const sortedMemories = useMemoryFiltering(memories, selectedType);

  return (
    <Card className="w-full md:w-80 h-[calc(100vh-4rem)] bg-white/90 backdrop-blur-sm">
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <List className="h-5 w-5" />
          <h3 className="font-semibold">Memories</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronUp className="h-4 w-4" />
          )}
        </Button>
      </div>
      
      {isExpanded && (
        <>
          <MemoryFilter 
            selectedType={selectedType}
            onTypeSelect={setSelectedType}
          />
          
          <ScrollArea className="h-[calc(100%-8rem)] p-4">
            <div className="space-y-4">
              {sortedMemories.map((memory) => (
                <MemoryCard key={memory.id} memory={memory} />
              ))}
            </div>
          </ScrollArea>
        </>
      )}
    </Card>
  );
};