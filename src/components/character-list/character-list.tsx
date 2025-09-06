import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Character } from '@/types/character';
import { races } from '@/data/raceOptions';
import { classes } from '@/data/classOptions';
import { MemoizedCharacterCard } from './character-card';
import EmptyState from './empty-state';

/**
 * CharacterList component displays all characters for the current user
 * Provides options to view existing characters or create new ones
 */
const CharacterList: React.FC = () => {
  const [characters, setCharacters] = React.useState<Partial<Character>[]>([]);
  const [filteredCharacters, setFilteredCharacters] = React.useState<Partial<Character>[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  /**
   * Transforms raw database character data into Character type
   * @param rawData - Raw character data from database
   * @returns Transformed character data
   */
  const transformCharacterData = (rawData: any[]): Partial<Character>[] => {
    return rawData.map(char => ({
      ...char,
      race: races.find(r => r.name === char.race) || { name: char.race },
      class: classes.find(c => c.name === char.class) || { name: char.class }
    }));
  };

  /**
   * Fetches all characters for the current user from Supabase
   */
  const fetchCharacters = React.useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('characters')
        .select('id, name, description, race, class, level')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const transformedData = transformCharacterData(data || []);
      setCharacters(transformedData);
    } catch (error) {
      console.error('Error fetching characters:', error);
      toast({
        title: "Error",
        description: "Failed to load characters",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchCharacters();
  }, [fetchCharacters]);

  // Filter characters based on search term
  React.useEffect(() => {
    if (searchTerm === '') {
      setFilteredCharacters(characters);
    } else {
      const filtered = characters.filter(character =>
        character.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (typeof character.race !== 'string' ? character.race?.name : character.race)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (typeof character.class !== 'string' ? character.class?.name : character.class)?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCharacters(filtered);
    }
  }, [characters, searchTerm]);

  /**
   * Navigates to character creation page
   */
  const handleCreateNew = () => {
    navigate('/characters/create');
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading characters...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Hero Header */}
      <div className="relative bg-cover bg-center py-20 px-4" style={{ backgroundImage: "url('/parchment-bg.png')" }}>
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative max-w-7xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-white mb-4 drop-shadow-lg">Your Heroes Await</h1>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto drop-shadow-md">Select a character to embark on epic adventures or forge a new legend</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 -mt-10 relative z-10">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-infinite-purple" />
            <h1 className="text-3xl font-bold text-foreground">Character Roster</h1>
          </div>
          <Button onClick={handleCreateNew} variant="fantasy" className="flex items-center gap-2 shadow-lg">
            <Plus className="w-4 h-4" />
            Forge New Hero
          </Button>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-md">
            <input
              type="text"
              placeholder="Search characters by name, race, or class..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 pl-10 pr-4 rounded-xl border-2 border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-infinite-purple focus:border-transparent transition-all duration-200"
            />
            <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
          </div>
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
  );
};

export default CharacterList;
