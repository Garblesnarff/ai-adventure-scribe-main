import {
  BookOpen,
  Grid,
  List,
  Eye,
  Check,
  Sparkles,
  Star,
  Info,
  X,
  ArrowRightLeft,
} from 'lucide-react';
import React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { useCampaign } from '@/contexts/CampaignContext';
import { getSystemConfigs } from '@/data/game-systems';
import { useAutoScroll } from '@/hooks/use-auto-scroll';

import type { GameSystemConfig } from '@/types/game-systems';

/**
 * Renders a complexity rating as star icons
 */
const ComplexityRating: React.FC<{ complexity: number; className?: string }> = ({
  complexity,
  className = '',
}) => {
  return (
    <div className={`flex items-center gap-0.5 ${className}`} aria-label={`Complexity: ${complexity} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-3 h-3 ${i < complexity ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
        />
      ))}
    </div>
  );
};

/**
 * Game System Selection Component
 *
 * Allows users to select a game system (D&D 5E, OSR, etc.) for their campaign.
 * Features:
 * - Search filtering by name, description, and tags
 * - Multiple view modes (grid, list, compact)
 * - System comparison functionality
 * - Detailed info modal for each system
 * - Complexity ratings and license information
 * - Responsive design with accessibility support
 */
const GameSystemSelection: React.FC<{ isLoading?: boolean }> = ({ isLoading = false }) => {
  const { state, dispatch } = useCampaign();
  const { toast } = useToast();
  const { scrollToNavigation } = useAutoScroll();

  const [searchQuery, setSearchQuery] = React.useState('');
  const [viewMode, setViewMode] = React.useState<'grid' | 'list' | 'compact'>('compact');
  const [hovered, setHovered] = React.useState<string | null>(null);
  const [selectedForComparison, setSelectedForComparison] = React.useState<string[]>([]);
  const [showComparison, setShowComparison] = React.useState(false);
  const [infoModalSystem, setInfoModalSystem] = React.useState<GameSystemConfig | null>(null);

  // Get all available game systems
  const allSystems = React.useMemo(() => getSystemConfigs(), []);

  // Filter systems based on search query
  const filteredSystems = React.useMemo(() => {
    if (!searchQuery.trim()) return allSystems;
    const q = searchQuery.toLowerCase();
    return allSystems.filter(
      (system) =>
        system.name.toLowerCase().includes(q) ||
        system.description.toLowerCase().includes(q) ||
        system.tags.some((tag) => tag.toLowerCase().includes(q)) ||
        system.license.toLowerCase().includes(q),
    );
  }, [searchQuery, allSystems]);

  // Handle system selection
  const handleSystemChange = (systemId: string) => {
    dispatch({
      type: 'UPDATE_CAMPAIGN',
      payload: { gameSystem: systemId },
    });
    const selected = allSystems.find((s) => s.id === systemId);
    toast({
      title: 'Game System Selected',
      description: selected ? `You chose ${selected.name}.` : 'Selection updated.',
      duration: 1200,
    });
    scrollToNavigation();
  };

  // Toggle system for comparison
  const toggleComparison = (systemId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedForComparison((prev) =>
      prev.includes(systemId) ? prev.filter((id) => id !== systemId) : [...prev, systemId],
    );
  };

  // Show info modal
  const showInfoModal = (system: GameSystemConfig, event: React.MouseEvent) => {
    event.stopPropagation();
    setInfoModalSystem(system);
  };

  // Get comparison data
  const comparisonSystems = React.useMemo(
    () => allSystems.filter((s) => selectedForComparison.includes(s.id)),
    [selectedForComparison, allSystems],
  );

  if (isLoading) {
    return (
      <div className="space-y-8 parchment animate-fade-in-up">
        <div className="text-center mb-6">
          <Skeleton className="h-8 w-48 mx-auto mb-2" />
          <Skeleton className="h-4 w-64 mx-auto" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="choice-btn p-4">
              <Skeleton className="h-12 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 parchment animate-fade-in-up">
      <div className="text-center mb-6">
        <Label className="text-xl font-serif font-semibold flex items-center justify-center">
          <BookOpen className="h-5 w-5 mr-2 text-blue-600" />
          Choose Your Game System
        </Label>
        <p className="text-sm text-muted-foreground mt-2">
          Select the rules system that will power your campaign
        </p>
      </div>

      {/* Controls: search + view toggles + comparison */}
      <div className="space-y-4">
        <div className="relative">
          <Input
            placeholder="Search systems, tags, or license types..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            aria-label="Search game systems"
          />
          <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">View:</span>
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-r-none"
              aria-label="Grid view"
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-none border-x"
              aria-label="List view"
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'compact' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('compact')}
              className="rounded-l-none"
              aria-label="Compact view"
            >
              <Eye className="w-4 h-4" />
            </Button>
          </div>

          {selectedForComparison.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowComparison(true)}
              className="ml-auto"
            >
              <ArrowRightLeft className="w-4 h-4 mr-1" />
              Compare ({selectedForComparison.length})
            </Button>
          )}

          <div className="text-sm text-muted-foreground ml-auto">
            Showing {filteredSystems.length} of {allSystems.length}
          </div>
        </div>
      </div>

      {/* No results message */}
      {filteredSystems.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No game systems found matching your search.</p>
        </div>
      )}

      {/* System selection */}
      <RadioGroup
        value={(state.campaign?.gameSystem as string) || ''}
        onValueChange={handleSystemChange}
        className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
            : viewMode === 'list'
              ? 'space-y-4'
              : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
        }
      >
        {filteredSystems.map((system) => {
          const isSelected = state.campaign?.gameSystem === system.id;
          const isInComparison = selectedForComparison.includes(system.id);

          if (viewMode === 'list') {
            return (
              <Card
                key={system.id}
                className={`cursor-pointer transition-all hover:shadow-lg border-2 relative overflow-hidden ${
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-lg'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => handleSystemChange(system.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSystemChange(system.id);
                  }
                }}
                style={
                  system.backgroundImage
                    ? {
                        backgroundImage: `url(${system.backgroundImage})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }
                    : { borderLeft: `4px solid ${system.color}` }
                }
              >
                {system.backgroundImage && <div className="absolute inset-0 bg-black/70 z-0" />}
                <div className={`p-4 relative z-10 ${system.backgroundImage ? 'text-white' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <RadioGroupItem
                        value={system.id}
                        id={system.id}
                        className="mt-1"
                        aria-label={`Select ${system.name}`}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-2xl" aria-hidden="true">
                            {system.icon}
                          </span>
                          <Label
                            htmlFor={system.id}
                            className="font-medium cursor-pointer leading-tight"
                          >
                            {system.name}
                          </Label>
                          <Badge
                            variant="secondary"
                            className={`text-xs ${system.backgroundImage ? 'bg-black/60 text-white border-white/20 backdrop-blur-sm' : ''}`}
                          >
                            {system.license}
                          </Badge>
                        </div>
                        <ComplexityRating complexity={system.complexity} className="mb-2" />
                        <p
                          className={`text-sm line-clamp-2 ${system.backgroundImage ? 'text-gray-200' : 'text-muted-foreground'}`}
                        >
                          {system.description}
                        </p>
                        <div
                          className={`flex flex-wrap gap-1 mt-2 ${system.backgroundImage ? 'text-gray-300' : ''}`}
                        >
                          {system.tags.slice(0, 4).map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className={`text-xs ${system.backgroundImage ? 'bg-black/60 text-white border-white/20 backdrop-blur-sm' : ''}`}
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => showInfoModal(system, e)}
                        className="h-8 w-8 p-0"
                        aria-label={`More info about ${system.name}`}
                      >
                        <Info className="w-4 h-4" />
                      </Button>
                      <Button
                        variant={isInComparison ? 'default' : 'ghost'}
                        size="sm"
                        onClick={(e) => toggleComparison(system.id, e)}
                        className="h-8 w-8 p-0"
                        aria-label={`${isInComparison ? 'Remove from' : 'Add to'} comparison`}
                      >
                        <ArrowRightLeft className="w-4 h-4" />
                      </Button>
                      {isSelected && (
                        <div className="bg-primary text-primary-foreground rounded-full p-1">
                          <Check className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          }

          if (viewMode === 'compact') {
            return (
              <Card
                key={system.id}
                className={`cursor-pointer transition-all hover:shadow-lg border-2 relative p-4 overflow-hidden ${
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-lg'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => handleSystemChange(system.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSystemChange(system.id);
                  }
                }}
                style={
                  system.backgroundImage
                    ? {
                        backgroundImage: `url(${system.backgroundImage})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }
                    : { borderLeft: `4px solid ${system.color}` }
                }
              >
                {system.backgroundImage && <div className="absolute inset-0 bg-black/70 z-0" />}
                <div
                  className={`flex items-start justify-between mb-2 relative z-10 ${system.backgroundImage ? 'text-white' : ''}`}
                >
                  <div className="flex items-start gap-2 flex-1">
                    <RadioGroupItem
                      value={system.id}
                      id={system.id}
                      className="mt-0.5"
                      aria-label={`Select ${system.name}`}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg" aria-hidden="true">
                          {system.icon}
                        </span>
                        <Label
                          htmlFor={system.id}
                          className="font-medium cursor-pointer leading-tight"
                        >
                          {system.name}
                        </Label>
                      </div>
                      <ComplexityRating complexity={system.complexity} className="mt-1" />
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => showInfoModal(system, e)}
                      className="h-6 w-6 p-0"
                      aria-label={`More info about ${system.name}`}
                    >
                      <Info className="w-3 h-3" />
                    </Button>
                    {isSelected && (
                      <div className="bg-primary text-primary-foreground rounded-full p-0.5">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mb-1 relative z-10">
                  <Badge
                    variant="secondary"
                    className={`text-xs ${system.backgroundImage ? 'bg-black/60 text-white border-white/20 backdrop-blur-sm' : ''}`}
                  >
                    {system.license}
                  </Badge>
                  {system.tags.slice(0, 2).map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className={`text-xs ${system.backgroundImage ? 'bg-black/60 text-white border-white/20 backdrop-blur-sm' : ''}`}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
                <p
                  className={`text-xs line-clamp-2 relative z-10 ${system.backgroundImage ? 'text-gray-200' : 'text-muted-foreground'}`}
                >
                  {system.description}
                </p>
              </Card>
            );
          }

          // Grid view
          return (
            <Card
              key={system.id}
              className={`group cursor-pointer transition-all hover:shadow-xl border-2 relative overflow-hidden aspect-square ${
                isSelected
                  ? 'border-primary shadow-lg'
                  : 'border-border/30 hover:border-primary/50'
              }`}
              style={{
                padding: 0,
                ...(system.backgroundImage
                  ? {
                      backgroundImage: `url(${system.backgroundImage})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }
                  : { backgroundColor: `${system.color}20` }),
              }}
              onClick={() => handleSystemChange(system.id)}
              onMouseEnter={() => setHovered(system.id)}
              onMouseLeave={() => setHovered(null)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSystemChange(system.id);
                }
              }}
            >
              <div
                className="absolute inset-0"
                style={{
                  boxShadow: system.backgroundImage
                    ? 'inset 0 0 60px 20px rgba(0, 0, 0, 0.3)'
                    : 'none',
                }}
              />

              {isSelected && (
                <div className="absolute top-3 right-3 z-20 bg-primary text-primary-foreground rounded-full p-1">
                  <Check className="w-4 h-4" />
                </div>
              )}

              <div
                className={`absolute bottom-3 left-3 z-10 ${system.backgroundImage ? 'text-white' : 'text-foreground'}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-3xl" aria-hidden="true">
                    {system.icon}
                  </span>
                  <span className="font-bold text-lg drop-shadow">{system.name}</span>
                </div>
                <ComplexityRating complexity={system.complexity} />
              </div>

              {/* Hover popup */}
              <div
                className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${hovered === system.id ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'} z-20`}
              >
                <div className="bg-white/95 backdrop-blur-sm p-4 rounded-lg shadow-xl border border-border w-80 max-w-[90vw] max-h-[70vh] overflow-y-auto">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl" aria-hidden="true">
                      {system.icon}
                    </span>
                    <h3 className="text-lg font-bold text-foreground">{system.name}</h3>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <ComplexityRating complexity={system.complexity} />
                    <Badge variant="secondary" className="text-xs">
                      {system.license}
                    </Badge>
                  </div>
                  <p className="text-xs text-foreground mb-2 leading-snug">{system.description}</p>
                  <div className="mb-2">
                    <h4 className="font-semibold text-foreground text-xs mb-1">Tags</h4>
                    <div className="flex flex-wrap gap-1">
                      {system.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs py-0 px-1.5">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="font-semibold">Levels:</span> {system.levelRange.min}-
                      {system.levelRange.max}
                    </div>
                    <div>
                      <span className="font-semibold">Classes:</span>{' '}
                      {system.hasClasses ? 'Yes' : 'No'}
                    </div>
                    <div>
                      <span className="font-semibold">Races:</span> {system.hasRaces ? 'Yes' : 'No'}
                    </div>
                    <div>
                      <span className="font-semibold">Spells:</span>{' '}
                      {system.hasSpells ? 'Yes' : 'No'}
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => showInfoModal(system, e)}
                      className="flex-1"
                    >
                      <Info className="w-3 h-3 mr-1" />
                      Details
                    </Button>
                    <Button
                      variant={isInComparison ? 'default' : 'outline'}
                      size="sm"
                      onClick={(e) => toggleComparison(system.id, e)}
                      className="flex-1"
                    >
                      <ArrowRightLeft className="w-3 h-3 mr-1" />
                      {isInComparison ? 'Remove' : 'Compare'}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </RadioGroup>

      {/* Info Modal */}
      <Dialog open={!!infoModalSystem} onOpenChange={() => setInfoModalSystem(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {infoModalSystem && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="text-3xl" aria-hidden="true">
                    {infoModalSystem.icon}
                  </span>
                  {infoModalSystem.name}
                </DialogTitle>
                <DialogDescription>{infoModalSystem.description}</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                {/* Overview */}
                <div>
                  <h3 className="font-semibold mb-2">Overview</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Complexity:</span>
                      <div className="mt-1">
                        <ComplexityRating complexity={infoModalSystem.complexity} />
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">License:</span>
                      <div className="mt-1">
                        <Badge variant="secondary">{infoModalSystem.license}</Badge>
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Level Range:</span>
                      <p className="font-medium">
                        {infoModalSystem.levelRange.min} - {infoModalSystem.levelRange.max}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Ability Scores:</span>
                      <p className="font-medium">{infoModalSystem.abilityScores.scores.length}</p>
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div>
                  <h3 className="font-semibold mb-2">System Features</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      {infoModalSystem.hasClasses ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <X className="w-4 h-4 text-gray-400" />
                      )}
                      <span>Character Classes</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {infoModalSystem.hasRaces ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <X className="w-4 h-4 text-gray-400" />
                      )}
                      <span>Races/Ancestries</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {infoModalSystem.hasBackgrounds ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <X className="w-4 h-4 text-gray-400" />
                      )}
                      <span>Backgrounds</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {infoModalSystem.hasSpells ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <X className="w-4 h-4 text-gray-400" />
                      )}
                      <span>Spellcasting</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {infoModalSystem.hasFeats ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <X className="w-4 h-4 text-gray-400" />
                      )}
                      <span>Feats/Abilities</span>
                    </div>
                  </div>
                </div>

                {/* Ability Scores */}
                <div>
                  <h3 className="font-semibold mb-2">Ability Scores</h3>
                  <div className="flex flex-wrap gap-2">
                    {infoModalSystem.abilityScores.scores.map((score) => (
                      <div
                        key={score.id}
                        className="bg-secondary/50 rounded px-3 py-2 text-sm"
                        title={score.description}
                      >
                        <div className="font-semibold">{score.abbreviation}</div>
                        <div className="text-xs text-muted-foreground">{score.name}</div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Score range: {infoModalSystem.abilityScores.scoreRange.min} -{' '}
                    {infoModalSystem.abilityScores.scoreRange.max} (avg:{' '}
                    {infoModalSystem.abilityScores.averageScore})
                  </p>
                </div>

                {/* Tags */}
                <div>
                  <h3 className="font-semibold mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-1">
                    {infoModalSystem.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Compatible Genres */}
                <div>
                  <h3 className="font-semibold mb-2">Compatible Genres</h3>
                  <div className="flex flex-wrap gap-1">
                    {infoModalSystem.compatibleGenres.map((genre) => (
                      <Badge key={genre} variant="outline">
                        {genre}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* License Link */}
                <div>
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={infoModalSystem.licenseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View {infoModalSystem.license} License
                    </a>
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Comparison Modal */}
      <Dialog open={showComparison} onOpenChange={setShowComparison}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Compare Game Systems</DialogTitle>
            <DialogDescription>
              Side-by-side comparison of selected game systems
            </DialogDescription>
          </DialogHeader>

          {comparisonSystems.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Select systems to compare using the comparison button on each system card.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-semibold">Feature</th>
                    {comparisonSystems.map((system) => (
                      <th key={system.id} className="text-left p-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl" aria-hidden="true">
                            {system.icon}
                          </span>
                          <span className="font-semibold">{system.name}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="p-2 text-muted-foreground">Complexity</td>
                    {comparisonSystems.map((system) => (
                      <td key={system.id} className="p-2">
                        <ComplexityRating complexity={system.complexity} />
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="p-2 text-muted-foreground">License</td>
                    {comparisonSystems.map((system) => (
                      <td key={system.id} className="p-2">
                        <Badge variant="secondary" className="text-xs">
                          {system.license}
                        </Badge>
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="p-2 text-muted-foreground">Level Range</td>
                    {comparisonSystems.map((system) => (
                      <td key={system.id} className="p-2">
                        {system.levelRange.min} - {system.levelRange.max}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="p-2 text-muted-foreground">Ability Scores</td>
                    {comparisonSystems.map((system) => (
                      <td key={system.id} className="p-2">
                        {system.abilityScores.scores.length}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="p-2 text-muted-foreground">Classes</td>
                    {comparisonSystems.map((system) => (
                      <td key={system.id} className="p-2">
                        {system.hasClasses ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <X className="w-4 h-4 text-gray-400" />
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="p-2 text-muted-foreground">Races</td>
                    {comparisonSystems.map((system) => (
                      <td key={system.id} className="p-2">
                        {system.hasRaces ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <X className="w-4 h-4 text-gray-400" />
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="p-2 text-muted-foreground">Backgrounds</td>
                    {comparisonSystems.map((system) => (
                      <td key={system.id} className="p-2">
                        {system.hasBackgrounds ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <X className="w-4 h-4 text-gray-400" />
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="p-2 text-muted-foreground">Spells</td>
                    {comparisonSystems.map((system) => (
                      <td key={system.id} className="p-2">
                        {system.hasSpells ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <X className="w-4 h-4 text-gray-400" />
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="p-2 text-muted-foreground">Feats</td>
                    {comparisonSystems.map((system) => (
                      <td key={system.id} className="p-2">
                        {system.hasFeats ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <X className="w-4 h-4 text-gray-400" />
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="p-2 text-muted-foreground align-top">Tags</td>
                    {comparisonSystems.map((system) => (
                      <td key={system.id} className="p-2">
                        <div className="flex flex-wrap gap-1">
                          {system.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GameSystemSelection;
