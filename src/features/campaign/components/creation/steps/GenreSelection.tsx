import {
  BookOpen,
  Sword,
  Skull,
  Zap,
  Gavel,
  Anchor,
  Grid,
  List,
  Eye,
  Check,
  Sparkles,
} from 'lucide-react';
import React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { useCampaign } from '@/contexts/CampaignContext';
import { useAutoScroll } from '@/hooks/use-auto-scroll';

type GenreMeta = {
  value: string;
  label: string;
  description: string;
  themes: string[];
  icon: React.ReactNode;
  colorClass: string;
  backgroundImage?: string;
};

const GENRES: GenreMeta[] = [
  {
    value: 'traditional-fantasy',
    label: 'Traditional Fantasy',
    description: 'Classic swords-and-sorcery with familiar races, kingdoms, and epic quests.',
    themes: ['Heroic', 'Exploration', 'Magic'],
    icon: <Sword className="h-5 w-5" />,
    colorClass: 'text-infinite-gold',
    backgroundImage:
      '/images/campaign-styles/traditional-fantasy-campaign-style-card-background.png',
  },
  {
    value: 'dark-fantasy',
    label: 'Dark Fantasy',
    description: 'Gritty worlds where power has a cost and hope is hard-won.',
    themes: ['Gritty', 'Horror', 'Moral Dilemmas'],
    icon: <Skull className="h-5 w-5" />,
    colorClass: 'text-destructive',
    backgroundImage: '/images/campaign-styles/dark-fantasy-campaign-style-card-background.png',
  },
  {
    value: 'high-fantasy',
    label: 'High Fantasy',
    description: 'Mythic stakes, ancient magic, and legendary heroes in sweeping sagas.',
    themes: ['Epic', 'Magic', 'Mythic'],
    icon: <Zap className="h-5 w-5" />,
    colorClass: 'text-infinite-purple',
    backgroundImage: '/images/campaign-styles/high-fantasy-campaign-style-card-background.png',
  },
  {
    value: 'science-fantasy',
    label: 'Science Fantasy',
    description: 'Where arcane forces meet advanced technology across strange worlds.',
    themes: ['Tech + Magic', 'Exploration', 'Weird'],
    icon: <Gavel className="h-5 w-5" />,
    colorClass: 'text-infinite-teal',
    backgroundImage: '/images/campaign-styles/science-fantasy-campaign-style-card-background.png',
  },
  {
    value: 'steampunk',
    label: 'Steampunk',
    description: 'Industrial wonders, airships, and intrigue powered by gears and steam.',
    themes: ['Invention', 'Intrigue', 'Airships'],
    icon: <Anchor className="h-5 w-5" />,
    colorClass: 'text-amber-600',
    backgroundImage: '/images/campaign-styles/steampunk-campaign-style-card-background.png',
  },
  {
    value: 'horror',
    label: 'Horror',
    description: 'Whispers in the dark, creeping dread, and the unknown beyond the veil.',
    themes: ['Supernatural', 'Mystery', 'Survival'],
    icon: <BookOpen className="h-5 w-5" />,
    colorClass: 'text-gray-600',
    backgroundImage: '/images/campaign-styles/horror-campaign-style-card-background.png',
  },
];

const GenreSelection: React.FC<{ isLoading?: boolean }> = ({ isLoading = false }) => {
  const { state, dispatch } = useCampaign();
  const { toast } = useToast();
  const { scrollToNavigation } = useAutoScroll();

  const [searchQuery, setSearchQuery] = React.useState('');
  const [viewMode, setViewMode] = React.useState<'grid' | 'list' | 'compact'>('compact');
  const [hovered, setHovered] = React.useState<string | null>(null);

  const filteredGenres = React.useMemo(() => {
    if (!searchQuery.trim()) return GENRES;
    const q = searchQuery.toLowerCase();
    return GENRES.filter(
      (g) =>
        g.label.toLowerCase().includes(q) ||
        g.description.toLowerCase().includes(q) ||
        g.themes.some((t) => t.toLowerCase().includes(q)),
    );
  }, [searchQuery]);

  const handleGenreChange = (value: string) => {
    dispatch({
      type: 'UPDATE_CAMPAIGN',
      payload: { genre: value },
    });
    const selected = GENRES.find((g) => g.value === value);
    toast({
      title: 'Genre Selected',
      description: selected ? `You chose ${selected.label}.` : 'Selection updated.',
      duration: 1200,
    });
    scrollToNavigation();
  };

  if (isLoading) {
    return (
      <div className="space-y-8 parchment animate-fade-in-up">
        <div className="text-center mb-6">
          <Skeleton className="h-8 w-48 mx-auto mb-2" />
          <Skeleton className="h-4 w-64 mx-auto" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
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
          Choose Your Campaign Genre
        </Label>
        <p className="text-sm text-muted-foreground mt-2">
          Select the world and tone for your epic adventure
        </p>
      </div>

      {/* Controls: search + view toggles */}
      <div className="space-y-4">
        <div className="relative">
          <Input
            placeholder="Search genres, themes, or descriptions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">View:</span>
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-r-none"
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-none border-x"
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'compact' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('compact')}
              className="rounded-l-none"
            >
              <Eye className="w-4 h-4" />
            </Button>
          </div>
          <div className="text-sm text-muted-foreground ml-auto">
            Showing {filteredGenres.length} of {GENRES.length}
          </div>
        </div>
      </div>

      <RadioGroup
        value={state.campaign?.genre || ''}
        onValueChange={handleGenreChange}
        className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
            : viewMode === 'list'
              ? 'space-y-4'
              : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
        }
      >
        {filteredGenres.map((genre) => {
          const isSelected = state.campaign?.genre === genre.value;

          if (viewMode === 'list') {
            return (
              <Card
                key={genre.value}
                className={`cursor-pointer transition-all hover:shadow-lg border-2 relative overflow-hidden ${
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-lg'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => handleGenreChange(genre.value)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') handleGenreChange(genre.value);
                }}
                style={
                  genre.backgroundImage
                    ? {
                        backgroundImage: `url(${genre.backgroundImage}), url('/campaign-background-placeholder.png')`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }
                    : undefined
                }
              >
                {genre.backgroundImage && <div className="absolute inset-0 bg-black/70 z-0" />}
                <div className={`p-4 relative z-10 ${genre.backgroundImage ? 'text-white' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <RadioGroupItem
                        value={genre.value}
                        id={genre.value}
                        className="text-blue-600"
                      />
                      <div className={`flex items-center ${genre.colorClass}`}>
                        {genre.icon}
                        <Label
                          htmlFor={genre.value}
                          className="font-medium cursor-pointer leading-tight ml-2"
                        >
                          {genre.label}
                        </Label>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="bg-primary text-primary-foreground rounded-full p-1">
                        <Check className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                  <p
                    className={`text-sm mt-2 line-clamp-2 ${genre.backgroundImage ? 'text-gray-200' : 'text-muted-foreground'}`}
                  >
                    {genre.description}
                  </p>
                  <div
                    className={`flex flex-wrap gap-1 mt-2 ${genre.backgroundImage ? 'text-gray-300' : ''}`}
                  >
                    {genre.themes.map((t) => (
                      <Badge
                        key={t}
                        variant="secondary"
                        className={`text-xs ${genre.backgroundImage ? 'bg-black/60 text-white border-white/20 backdrop-blur-sm' : ''}`}
                      >
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
              </Card>
            );
          }

          if (viewMode === 'compact') {
            return (
              <Card
                key={genre.value}
                className={`cursor-pointer transition-all hover:shadow-lg border-2 relative p-4 overflow-hidden ${
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-lg'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => handleGenreChange(genre.value)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') handleGenreChange(genre.value);
                }}
                style={
                  genre.backgroundImage
                    ? {
                        backgroundImage: `url(${genre.backgroundImage}), url('/campaign-background-placeholder.png')`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }
                    : undefined
                }
              >
                {genre.backgroundImage && <div className="absolute inset-0 bg-black/70 z-0" />}
                <div
                  className={`flex items-center justify-between mb-2 relative z-10 ${genre.backgroundImage ? 'text-white' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem
                      value={genre.value}
                      id={genre.value}
                      className="text-blue-600"
                    />
                    <div className={`flex items-center ${genre.colorClass}`}>
                      {genre.icon}
                      <Label
                        htmlFor={genre.value}
                        className="font-medium cursor-pointer leading-tight ml-2"
                      >
                        {genre.label}
                      </Label>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="bg-primary text-primary-foreground rounded-full p-1">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-1 mb-1 relative z-10">
                  {genre.themes.map((t) => (
                    <Badge
                      key={t}
                      variant="secondary"
                      className={`text-xs ${genre.backgroundImage ? 'bg-black/60 text-white border-white/20 backdrop-blur-sm' : ''}`}
                    >
                      {t}
                    </Badge>
                  ))}
                </div>
                <p
                  className={`text-xs line-clamp-2 relative z-10 ${genre.backgroundImage ? 'text-gray-200' : 'text-muted-foreground'}`}
                >
                  {genre.description}
                </p>
              </Card>
            );
          }

          // grid view with hover popup
          return (
            <Card
              key={genre.value}
              className={`group cursor-pointer transition-all hover:shadow-xl border-2 relative overflow-hidden aspect-square ${
                isSelected
                  ? 'border-primary shadow-lg'
                  : 'border-border/30 hover:border-infinite-purple/50'
              }`}
              style={{
                padding: 0,
                ...(genre.backgroundImage
                  ? {
                      backgroundImage: `url(${genre.backgroundImage}), url('/campaign-background-placeholder.png')`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }
                  : {}),
              }}
              onClick={() => handleGenreChange(genre.value)}
              onMouseEnter={() => setHovered(genre.value)}
              onMouseLeave={() => setHovered(null)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') handleGenreChange(genre.value);
              }}
            >
              <div
                className="absolute inset-0"
                style={{ boxShadow: 'inset 0 0 60px 20px rgba(0, 0, 0, 0.3)' }}
              />

              {isSelected && (
                <div className="absolute top-3 right-3 z-20 bg-primary text-primary-foreground rounded-full p-1">
                  <Check className="w-4 h-4" />
                </div>
              )}

              <div
                className={`absolute bottom-3 left-3 z-10 flex items-center gap-2 ${isSelected ? 'text-white' : 'text-white'}`}
              >
                {genre.icon}
                <span className="font-bold text-lg drop-shadow">{genre.label}</span>
              </div>

              <div
                className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${hovered === genre.value ? 'opacity-100 scale-100' : 'opacity-0 scale-95'} z-20`}
              >
                <div className="bg-white/95 backdrop-blur-sm p-3 rounded-lg shadow-xl border border-border w-80 max-w-[90vw] max-h-[70vh] overflow-y-auto">
                  <div className="flex items-center gap-2 mb-2">
                    {genre.icon}
                    <h3 className="text-lg font-bold text-foreground">{genre.label}</h3>
                  </div>
                  <p className="text-xs text-foreground mb-2 leading-snug">{genre.description}</p>
                  <div className="mb-2">
                    <h4 className="font-semibold text-foreground text-xs mb-1">Themes</h4>
                    <div className="flex flex-wrap gap-1">
                      {genre.themes.map((t) => (
                        <Badge key={t} variant="secondary" className="text-xs py-0 px-1.5">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </RadioGroup>
    </div>
  );
};

export default GenreSelection;
