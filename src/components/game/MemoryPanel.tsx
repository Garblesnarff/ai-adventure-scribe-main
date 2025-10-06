import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '../ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useMemoryContext } from '@/contexts/MemoryContext';
import { useCharacter } from '@/contexts/CharacterContext';
import { useCombat } from '@/contexts/CombatContext';
import { List, ChevronDown, ChevronUp, User, Sword, Menu, ChevronLeft } from 'lucide-react';
import { MemoryCard } from './memory/MemoryCard';
import { MemoryFilter } from './memory/MemoryFilter';
import { useMemoryFiltering } from '@/hooks/memory/useMemoryFiltering';
import { Textarea } from '../ui/textarea';
import { CompactCharacterHeader } from './CompactCharacterHeader';
import { CombatSummary } from './CombatSummary';
import { ExtendedGameSession } from '@/hooks/use-game-session';

interface MemoryPanelProps {
  sessionData: ExtendedGameSession | null;
  updateGameSessionState: (newState: Partial<ExtendedGameSession>) => Promise<void>;
  combatMode: boolean;
}

interface GameSidePanelProps extends MemoryPanelProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

/**
 * MemoryPanel Component
 * Main component for displaying and managing game memories and session notes
 * Provides filtering, sorting, and collapsible functionality
 */
export const GameSidePanel: React.FC<GameSidePanelProps> = ({ 
  sessionData, 
  updateGameSessionState, 
  combatMode,
  isCollapsed,
  onToggle 
}) => {
  // Get contexts
  const { memories = [], isLoading: memoriesLoading } = useMemoryContext();
  const { state: characterState } = useCharacter();
  const { state: combatState } = useCombat();
  const isInCombat = combatMode || combatState.isInCombat;
  
  // Refs for resizable functionality
  const panelRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  // Local state
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'character' | 'memory' | 'combat'>('character');
  const [localSessionNotes, setLocalSessionNotes] = useState('');
  const [panelWidth, setPanelWidth] = useState('340px'); // Default fixed width (within 280-400px)

  // Load state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('gameSidePanelState');
    if (saved) {
      const parsed = JSON.parse(saved);
      setIsExpanded(parsed.isExpanded ?? true);
      setActiveTab(parsed.activeTab as any ?? 'character');
      if (parsed.panelWidth) {
        setPanelWidth(parsed.panelWidth);
        if (panelRef.current) {
          panelRef.current.style.width = parsed.panelWidth;
        }
      }
    }
  }, []);

  // Save state to localStorage on changes
  useEffect(() => {
    const stateToSave = {
      isExpanded,
      activeTab,
      panelWidth,
      timestamp: Date.now()
    };
    localStorage.setItem('gameSidePanelState', JSON.stringify(stateToSave));
  }, [isExpanded, activeTab, panelWidth]);

  // Resizable drag functionality
  const startDrag = useCallback((e: React.MouseEvent) => {
    isDraggingRef.current = true;
    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', stopDrag);
    e.preventDefault();
  }, []);

  const handleDrag = useCallback((e: MouseEvent) => {
    if (!isDraggingRef.current || !panelRef.current) {
      return;
    }

    const rect = panelRef.current.getBoundingClientRect();
    const containerRect = panelRef.current.parentElement?.getBoundingClientRect();
    if (!containerRect) {
      return;
    }

  let newWidth = e.clientX - containerRect.left;
  // Enforce new constraints 280-400px
  newWidth = Math.max(280, Math.min(400, newWidth));

  setPanelWidth(`${newWidth}px`);
  panelRef.current.style.width = `${newWidth}px`;
  }, []);

  const stopDrag = useCallback(() => {
    isDraggingRef.current = false;
    document.removeEventListener('mousemove', handleDrag);
    document.removeEventListener('mouseup', stopDrag);
  }, [handleDrag]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleDrag);
      document.removeEventListener('mouseup', stopDrag);
    };
  }, [handleDrag, stopDrag]);

  // Mobile drawer state
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const isMobile = window.innerWidth < 1024; // lg breakpoint

  // Get filtered and sorted memories using custom hook (must be called unconditionally)
  const sortedMemories = useMemoryFiltering(memories, selectedType);

  // Sync local notes from session state (unconditional hook)
  useEffect(() => {
    setLocalSessionNotes(sessionData?.session_notes || '');
  }, [sessionData?.session_notes]);

  // Toggle mobile drawer
  const toggleMobileDrawer = () => setIsMobileDrawerOpen(!isMobileDrawerOpen);

  // Collapsed state rendering - mobile vs desktop
  if (isCollapsed) {
    if (isMobile) {
      return (
        <div className="fixed bottom-4 right-4 z-30 md:hidden">
          <Sheet open={isMobileDrawerOpen} onOpenChange={setIsMobileDrawerOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleMobileDrawer}
                className={`relative rounded-full p-3 h-auto shadow-xl border-2 transition-all duration-300 hover-glow focus-glow ${
                  isInCombat
                    ? 'bg-gradient-to-r from-red-500/20 to-red-600/20 border-red-400/50 animate-pulse'
                    : 'bg-gradient-to-r from-infinite-purple/20 to-infinite-teal/20 border-infinite-purple/50'
                }`}
              >
                <Menu className="h-5 w-5" />
                {/* Context indicator */}
                {(isInCombat || memories.length > 0) && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-infinite-gold rounded-full border border-background animate-pulse"></div>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[80vw] max-w-sm p-0">
              <GameSidePanelContent 
                sessionData={sessionData}
                updateGameSessionState={updateGameSessionState}
                combatMode={combatMode}
                isExpanded={isExpanded}
                setIsExpanded={setIsExpanded}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                selectedType={selectedType}
                setSelectedType={setSelectedType}
                localSessionNotes={localSessionNotes}
                setLocalSessionNotes={setLocalSessionNotes}
                memoriesLoading={memoriesLoading}
                sortedMemories={sortedMemories}
                characterState={characterState}
                isInCombat={isInCombat}
                panelWidth={panelWidth}
                panelRef={panelRef}
                dragHandleRef={dragHandleRef}
                isDraggingRef={isDraggingRef}
                startDrag={startDrag}
                handleDrag={handleDrag}
                stopDrag={stopDrag}
                isMobileDrawerOpen={true}
              />
              <SheetClose asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute left-4 top-4"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </SheetClose>
            </SheetContent>
          </Sheet>
        </div>
      );
    }

    return (
      <div className="hidden md:block fixed right-4 top-1/2 z-30">
        <Button
          variant="outline"
          size="sm"
          onClick={onToggle}
          className={`relative rounded-full p-3 h-auto shadow-xl border-2 transition-all duration-300 hover-glow focus-glow hover:scale-110 ${
            isInCombat
              ? 'bg-gradient-to-r from-red-500/20 to-red-600/20 border-red-400/50 animate-pulse'
              : 'bg-gradient-to-r from-infinite-purple/20 to-infinite-teal/20 border-infinite-purple/50'
          }`}
        >
          <ChevronDown className="h-4 w-4 rotate-90" />
          {/* Enhanced context indicators */}
          <div className="absolute -top-2 -right-2 flex flex-col gap-1">
            {isInCombat && (
              <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse shadow-lg"></div>
            )}
            {memories.length > 0 && (
              <div className="w-2 h-2 bg-infinite-gold rounded-full animate-pulse shadow-lg"></div>
            )}
            {characterState.character && (
              <div className="w-2 h-2 bg-infinite-teal rounded-full animate-pulse shadow-lg"></div>
            )}
          </div>
        </Button>
      </div>
    );
  }

  const handleSaveNotes = () => {
    if (sessionData) {
      updateGameSessionState({ session_notes: localSessionNotes });
    }
  };


  const handleTabChange = (value: 'character' | 'memory' | 'combat') => {
    setActiveTab(value);
    // Auto-expand when switching tabs
    setIsExpanded(true);
  };

  return (
    <div 
      ref={panelRef} 
      className="h-[80vh] bg-white shadow-sm border-0 flex flex-col resize-x lg:resize-x-none min-w-[280px] max-w-[400px]"
      style={{ width: panelWidth, minWidth: '280px', maxWidth: '400px' }}
    >
      {/* Drag Handle for Desktop */}
      <div
        ref={dragHandleRef}
        className="absolute left-0 top-0 w-1 h-full bg-border hover:bg-primary cursor-col-resize z-10 hidden lg:block"
        onMouseDown={startDrag}
      />
      
      <Card className={`h-full glass-strong shadow-2xl border-2 flex flex-col overflow-hidden transition-all duration-500 hover:shadow-2xl hover-glow ${
        isInCombat
          ? 'border-red-400/50 bg-gradient-to-b from-red-900/10 to-card/90'
          : 'border-infinite-purple/30 bg-gradient-to-b from-infinite-purple/5 to-card/90'
      }`}>
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex gap-1 flex-shrink-0">
              <Button
                variant={activeTab === 'character' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleTabChange('character')}
                className="h-8 px-2"
              >
                <User className="h-4 w-4" />
              </Button>
              <Button
                variant={activeTab === 'memory' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleTabChange('memory')}
                className={`h-8 px-2 transition-all duration-200 ${
                  activeTab === 'memory'
                    ? 'bg-infinite-teal text-white shadow-lg'
                    : 'hover:bg-infinite-teal/20'
                }`}
              >
                <List className="h-4 w-4" />
              </Button>
              {isInCombat && (
                <Button
                  variant={activeTab === 'combat' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleTabChange('combat')}
                  className={`h-8 px-2 transition-all duration-200 ${
                    activeTab === 'combat'
                      ? 'bg-red-500 text-white shadow-lg animate-pulse'
                      : 'hover:bg-red-500/20'
                  }`}
                >
                  <Sword className="h-4 w-4" />
                </Button>
              )}
            </div>
            <h3 className="font-display font-semibold text-card-foreground capitalize truncate text-sm">
              {activeTab === 'character' && '🎭 Character'}
              {activeTab === 'memory' && '📚 Memories'}
              {activeTab === 'combat' && '⚔️ Combat'}
            </h3>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsExpanded(!isExpanded);
                if (isExpanded) onToggle();
              }}
              className="h-8 w-8 p-0 rounded-full hover:bg-muted/20 transition-all duration-200 hover:scale-110"
              title={isExpanded ? 'Minimize' : 'Expand'}
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggle()}
              className="h-8 w-8 p-0 rounded-full hover:bg-red-500/20 transition-all duration-200 hover:scale-110"
              title="Close Panel"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {isExpanded && (
          <div className="flex-grow flex flex-col overflow-hidden">
            <Tabs value={activeTab} onValueChange={(value) => handleTabChange(value as any)} className="flex flex-col h-full">
              <TabsContent value="character" className="flex-1 p-0 mt-0 border-0 bg-background">
                <div style={{ maxHeight: '72vh', overflow: 'auto' }}>
                  <CompactCharacterHeader />
                </div>
              </TabsContent>
              
              <TabsContent value="memory" className="flex-1 mt-0 border-0 flex flex-col overflow-hidden bg-background">
                {/* Compact Session Notes Section */}
                <div className="p-4 border-b border-border">
                  <h4 className="font-display font-semibold mb-2 text-foreground text-sm">📝 Session Notes</h4>
                  <Textarea
                    value={localSessionNotes}
                    onChange={(e) => setLocalSessionNotes(e.target.value)}
                    placeholder="Type your session notes here..."
                    rows={4}
                    className="mb-3 text-sm bg-muted border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent resize-none"
                  />
                  <Button
                    onClick={handleSaveNotes}
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg transition-colors duration-200"
                  >
                    Save Notes
                  </Button>
                </div>

                {/* Memories Section */}
                <div className="p-4 border-b flex-shrink-0">
                  <MemoryFilter 
                    selectedType={selectedType}
                    onTypeSelect={setSelectedType}
                  />
                </div>
                
                <ScrollArea className="flex-1 p-4" style={{ maxHeight: '56vh' }}>
                  {memoriesLoading && <p className="text-xs text-muted-foreground">Loading memories...</p>}
                  {!memoriesLoading && sortedMemories.length === 0 && <p className="text-xs text-muted-foreground">No memories logged yet.</p>}
                  <div className="space-y-2">
                    {sortedMemories.map((memory) => (
                      <MemoryCard key={memory.id} memory={memory} />
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              {isInCombat && (
                <TabsContent value="combat" className="flex-1 mt-0 border-0 bg-background">
                  <div style={{ maxHeight: '72vh', overflow: 'auto' }}>
                    <CombatSummary />
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </div>
        )}
      </Card>
    </div>
  );
};

// Extracted content component for mobile drawer
const GameSidePanelContent: React.FC<{
  sessionData: ExtendedGameSession | null;
  updateGameSessionState: (newState: Partial<ExtendedGameSession>) => Promise<void>;
  combatMode: boolean;
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
  activeTab: 'character' | 'memory' | 'combat';
  setActiveTab: (tab: 'character' | 'memory' | 'combat') => void;
  selectedType: string | null;
  setSelectedType: (type: string | null) => void;
  localSessionNotes: string;
  setLocalSessionNotes: (notes: string) => void;
  memoriesLoading: boolean;
  sortedMemories: any[];
  characterState: any;
  isInCombat: boolean;
  panelWidth: string;
  panelRef: React.RefObject<HTMLDivElement>;
  dragHandleRef: React.RefObject<HTMLDivElement>;
  isDraggingRef: React.RefObject<boolean>;
  startDrag: (e: React.MouseEvent) => void;
  handleDrag: (e: MouseEvent) => void;
  stopDrag: () => void;
  isMobileDrawerOpen: boolean;
}> = ({
  sessionData,
  updateGameSessionState,
  combatMode,
  isExpanded,
  setIsExpanded,
  activeTab,
  setActiveTab,
  selectedType,
  setSelectedType,
  localSessionNotes,
  setLocalSessionNotes,
  memoriesLoading,
  sortedMemories,
  characterState,
  isInCombat,
  panelWidth,
  panelRef,
  dragHandleRef,
  isDraggingRef,
  startDrag,
  handleDrag,
  stopDrag,
  isMobileDrawerOpen
}) => {
  // Mobile content uses the passed-in state and handlers
  const handleSaveNotes = () => {
    if (sessionData) {
      updateGameSessionState({ session_notes: localSessionNotes });
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Mobile Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Game Panel</h3>
        <Button variant="ghost" size="sm">
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Tab Content - Simplified for mobile */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'character' && <CompactCharacterHeader />}
        {activeTab === 'memory' && (
          <div className="flex flex-col h-full">
            <div className="p-4 border-b">
              <Textarea
                value={localSessionNotes}
                onChange={(e) => setLocalSessionNotes(e.target.value)}
                placeholder="Session notes..."
                rows={3}
                className="mb-2"
              />
              <Button onClick={handleSaveNotes} size="sm" className="w-full">
                Save
              </Button>
            </div>
            <ScrollArea className="flex-1 p-4">
              {/* Memories list */}
              <div>No memories for mobile view</div>
            </ScrollArea>
          </div>
        )}
        {isInCombat && activeTab === 'combat' && <CombatSummary />}
      </div>
    </div>
  );
};
