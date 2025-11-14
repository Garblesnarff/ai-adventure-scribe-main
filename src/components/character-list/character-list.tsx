import { Users, Plus } from 'lucide-react';
import React from 'react';
import { useNavigate } from 'react-router-dom';

import { MemoizedCharacterCard } from './character-card';
import EmptyState from './empty-state';

import type { Character } from '@/types/character';

import { CharacterListSkeleton } from '@/components/skeletons/CharacterListSkeleton';
import { Button } from '@/components/ui/button';
import { classes } from '@/data/classOptions';
import { baseRaces } from '@/data/raceOptions';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import logger from '@/lib/logger';
import { subscriptionManager } from '@/services/supabase-subscription-manager';
import { addNetworkListener, isOffline } from '@/utils/network';

/**
 * CharacterList component displays all characters for the current user
 * Provides options to view existing characters or create new ones
 */
const CharacterList: React.FC = () => {
  const [cachedCharacters, setCachedCharacters] = useLocalStorage<Partial<Character>[]>(
    'aas_cached_characters',
    [],
  );
  const [characters, setCharacters] = React.useState<Partial<Character>[]>([]);
  const [filteredCharacters, setFilteredCharacters] = React.useState<Partial<Character>[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [offlineMode, setOfflineMode] = React.useState(isOffline());
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);
  const cachedCharactersRef = React.useRef<Partial<Character>[]>(cachedCharacters);
  const navigate = useNavigate();
  const { toast } = useToast();
  const offlineNoticeShown = React.useRef(false);

  React.useEffect(() => {
    cachedCharactersRef.current = cachedCharacters;
  }, [cachedCharacters]);

  /**
   * Transforms raw database character data into Character type
   * @param rawData - Raw character data from database
   * @returns Transformed character data
   */
  const transformCharacterData = (rawData: any[]): Partial<Character>[] => {
    return rawData.map((char) => {
      const baseRace = baseRaces.find((r) => r.name === char.race);
      const subrace = baseRace?.subraces?.find((s) => s.name === char.subrace);
      return {
        ...char,
        race: baseRace || { name: char.race, subraces: [] },
        subrace: subrace || null,
        class: classes.find((c) => c.name === char.class) || { name: char.class },
      };
    });
  };

  /**
   * Fetches all characters for the current user from Supabase
   */
  const fetchCharacters = React.useCallback(
    async ({ suppressLoader = false }: { suppressLoader?: boolean } = {}) => {
      try {
        if (!suppressLoader) {
          setLoading(true);
        }

        if (isOffline()) {
          setOfflineMode(true);
          if (!offlineNoticeShown.current) {
            toast({
              title: 'Offline mode',
              description:
                cachedCharactersRef.current.length > 0
                  ? 'You are viewing cached characters. Changes will sync when you reconnect.'
                  : 'You appear to be offline. Reconnect to load your characters.',
            });
            offlineNoticeShown.current = true;
          }
          setCharacters(cachedCharactersRef.current);
          return;
        }

        setOfflineMode(false);
        offlineNoticeShown.current = false;

        // Get the current user session for ownership filtering
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          toast({
            title: 'Not Authenticated',
            description: 'Please log in to view your characters.',
            variant: 'destructive',
          });
          navigate('/login');
          return;
        }

        setCurrentUserId(session.user.id);

        const { data, error } = await supabase
          .from('characters')
          .select(
            `
          id, name, race, class, level,
          image_url, avatar_url, background_image,
          campaign_id,
          created_at, updated_at,
          character_stats!left (
            strength, dexterity, constitution, intelligence, wisdom, charisma,
            max_hit_points, current_hit_points, armor_class
          )
        `,
          )
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        const transformedData = transformCharacterData(data || []);
        setCharacters(transformedData);
        setCachedCharacters(transformedData);
      } catch (error) {
        logger.error('Error fetching characters:', error);
        toast({
          title: 'Error',
          description: 'Failed to load characters',
          variant: 'destructive',
        });
      } finally {
        if (!suppressLoader) {
          setLoading(false);
        }
      }
    },
    [toast, navigate, setCachedCharacters],
  );

  React.useEffect(() => {
    fetchCharacters();
  }, [fetchCharacters]);

  React.useEffect(() => {
    const disposers: Array<() => void> = [];
    disposers.push(
      addNetworkListener('online', () => {
        setOfflineMode(false);
        fetchCharacters();
      }),
    );
    disposers.push(
      addNetworkListener('offline', () => {
        setOfflineMode(true);
        setCharacters(cachedCharactersRef.current);
      }),
    );

    return () => {
      disposers.forEach((dispose) => dispose());
    };
  }, [fetchCharacters]);

  React.useEffect(() => {
    if (!currentUserId) return;

    const callbackId = subscriptionManager.subscribeToEvents('characters', {
      events: ['INSERT', 'UPDATE', 'DELETE'],
      filter: (payload) => {
        const payloadUserId =
          (payload.new as { user_id?: string } | null | undefined)?.user_id ??
          (payload.old as { user_id?: string } | null | undefined)?.user_id;
        return payloadUserId === currentUserId;
      },
      callback: () => {
        fetchCharacters({ suppressLoader: true }).catch((error) => {
          logger.error('Failed to refresh characters after realtime update:', error);
        });
      },
    });

    return () => {
      subscriptionManager.unsubscribeFromEvents('characters', callbackId);
    };
  }, [currentUserId, fetchCharacters]);

  // Filter characters based on search term
  React.useEffect(() => {
    if (searchTerm === '') {
      setFilteredCharacters(characters);
    } else {
      const filtered = characters.filter(
        (character: Partial<Character>) =>
          character.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (typeof character.race !== 'string' ? character.race?.name : character.race)
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          (typeof character.class !== 'string' ? character.class?.name : character.class)
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()),
      );
      setFilteredCharacters(filtered);
    }
  }, [characters, searchTerm]);

  /**
   * Navigates to character creation page
   */
  const handleCreateNew = () => {
    navigate('/app/characters/create');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        {/* Hero Header - show during loading for consistency */}
        <div
          className="relative bg-cover bg-no-repeat py-24 px-4"
          style={{
            backgroundImage: "url('/character_page_hero_header.png')",
            backgroundPosition: '50% 36%',
          }}
        >
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="relative max-w-7xl mx-auto text-center">
            <div className="mb-10 md:mb-14 h-24 md:h-28"></div>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto drop-shadow-md">
              Select a character to embark on epic adventures or forge a new legend
            </p>
            <div className="flex justify-center">
              <Button
                onClick={handleCreateNew}
                variant="fantasy"
                className="flex items-center gap-2 shadow-lg"
                disabled
              >
                <Plus className="w-4 h-4" />
                Forge New Hero
              </Button>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8 -mt-10 relative z-10">
          <div className="flex justify-center items-center mb-6">
            <div className="flex items-center gap-2">
              <Users className="w-6 h-6 text-infinite-purple animate-pulse" />
              <h1 className="text-3xl font-bold text-foreground animate-pulse">Character Roster</h1>
            </div>
          </div>

          {/* Search Bar - disabled during loading */}
          <div className="mb-8">
            <div className="relative max-w-md">
              <input
                type="text"
                placeholder="Search characters by name, race, or class..."
                value=""
                disabled
                className="w-full px-4 py-3 pl-10 pr-4 rounded-xl border-2 border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-infinite-purple focus:border-transparent transition-all duration-200 opacity-50"
              />
              <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            </div>
          </div>

          {/* Skeleton Grid */}
          <CharacterListSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {offlineMode && (
        <div className="bg-yellow-100 border-b border-yellow-300 text-yellow-900 text-center py-2 text-sm">
          You are currently offline. Showing the most recently cached characters.
        </div>
      )}
      {/* Hero Header */}
      <div
        className="relative bg-cover bg-no-repeat py-24 px-4"
        style={{
          backgroundImage: "url('/character_page_hero_header.png')",
          backgroundPosition: '50% 36%',
        }}
      >
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative max-w-7xl mx-auto text-center">
          <div className="mb-10 md:mb-14 h-24 md:h-28"></div>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto drop-shadow-md">
            Select a character to embark on epic adventures or forge a new legend
          </p>
          <div className="flex justify-center">
            <Button
              onClick={handleCreateNew}
              variant="fantasy"
              className="flex items-center gap-2 shadow-lg"
            >
              <Plus className="w-4 h-4" />
              Forge New Hero
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 -mt-10 relative z-10">
        <div className="flex justify-center items-center mb-6">
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-infinite-purple" />
            <h1 className="text-3xl font-bold text-foreground">Character Roster</h1>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-md">
            <label htmlFor="character-search" className="sr-only">
              Search characters
            </label>
            <input
              type="text"
              placeholder="Search characters by name, race, or class..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              id="character-search"
              aria-label="Search characters"
              className="w-full px-4 py-3 pl-10 pr-4 rounded-xl border-2 border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-infinite-purple focus:border-transparent transition-all duration-200"
            />
            <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCharacters.map((character) => {
            // Type guard to ensure character has required id and name properties
            if (!character.id || !character.name) return null;

            // Now TypeScript knows these properties exist
            return (
              <MemoizedCharacterCard
                key={character.id}
                character={character as Partial<Character> & { id: string; name: string }}
                onDelete={fetchCharacters}
              />
            );
          })}
        </div>

        {filteredCharacters.length === 0 && characters.length > 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg mb-4">No characters match your search.</p>
            <Button variant="outline" onClick={() => setSearchTerm('')} className="mr-2">
              Clear Search
            </Button>
          </div>
        )}

        {characters.length === 0 && <EmptyState onCreateNew={handleCreateNew} />}
      </div>
    </div>
  );
};

export default CharacterList;
