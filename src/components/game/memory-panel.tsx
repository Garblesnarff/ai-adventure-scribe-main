import React, { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { useMemoryContext } from '@/contexts/memory-context';
import { List, ChevronDown, ChevronUp } from 'lucide-react';
import { MemoryCard } from './memory/MemoryCard';
import { MemoryFilter } from './memory/MemoryFilter';
import { useMemoryFiltering } from './memory/use-memory-filtering';
import { Textarea } from '../ui/textarea'; // Added for session notes
import { ExtendedGameSession } from '@/hooks/use-game-session'; // Added for type

interface MemoryPanelProps {
  sessionData: ExtendedGameSession | null;
  updateGameSessionState: (newState: Partial<ExtendedGameSession>) => Promise<void>;
}

/**
 * MemoryPanel Component
 * Main component for displaying and managing game memories and session notes
 * Provides filtering, sorting, and collapsible functionality
 */
export const MemoryPanel: React.FC<MemoryPanelProps> = ({ sessionData, updateGameSessionState }) => {
  // Get memories from context with default empty array
  const { memories = [], isLoading: memoriesLoading } = useMemoryContext(); // Added isLoading
  
  // Local state for panel expansion and type filtering
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [localSessionNotes, setLocalSessionNotes] = useState('');

  // Get filtered and sorted memories using custom hook
  const sortedMemories = useMemoryFiltering(memories, selectedType);

  useEffect(() => {
    // Update local notes if sessionData changes from elsewhere (e.g., initial load)
    setLocalSessionNotes(sessionData?.session_notes || '');
  }, [sessionData?.session_notes]);

  const handleSaveNotes = () => {
    if (sessionData) {
      updateGameSessionState({ session_notes: localSessionNotes });
    }
  };

  return (
    <Card className="w-full md:w-96 h-[calc(100vh-4rem)] bg-white/90 backdrop-blur-sm flex flex-col"> {/* Adjusted width and flex behavior */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <List className="h-5 w-5" />
          <h3 className="font-semibold">Session Log</h3> {/* Changed title */}
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
        <div className="flex-grow flex flex-col overflow-hidden"> {/* Ensure content can scroll if panel fixed height */}
          {/* Session Notes Section */}
          <div className="p-4 border-b">
            <h4 className="font-semibold mb-2 text-sm">Session Notes</h4>
            <Textarea
              value={localSessionNotes}
              onChange={(e) => setLocalSessionNotes(e.target.value)}
              placeholder="Type your session notes here..."
              rows={3}
              className="mb-2 text-xs"
            />
            <Button onClick={handleSaveNotes} size="xs" variant="outline">Save Notes</Button>
          </div>

          {/* Memories Section */}
          <div className="p-4 border-b">
            <MemoryFilter 
              selectedType={selectedType}
              onTypeSelect={setSelectedType}
            />
          </div>
          
          <ScrollArea className="flex-grow p-4"> {/* flex-grow allows scrollarea to take remaining space */}
            {memoriesLoading && <p className="text-xs text-gray-500">Loading memories...</p>}
            {!memoriesLoading && sortedMemories.length === 0 && <p className="text-xs text-gray-500">No memories logged yet.</p>}
            <div className="space-y-2"> {/* Reduced spacing */}
              {sortedMemories.map((memory) => (
                <MemoryCard key={memory.id} memory={memory} />
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </Card>
  );
};