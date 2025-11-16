/**
 * SharedCharactersList Component
 *
 * Displays characters shared with the current user:
 * - List of shared characters with owner info
 * - Permission level badges
 * - Filter by permission level
 * - Remove self button to stop accessing
 * - Navigate to character sheets
 */

import React, { useState, useMemo } from 'react';
import { Users, Eye, Edit, Crown, Filter, X, ArrowRight, UserMinus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useTRPC, useTRPCUtils } from '@/infrastructure/api/trpc-hooks';
import { PermissionLevel } from '@/types/character';

interface SharedCharacter {
  id: string;
  name: string;
  description?: string;
  race?: string;
  class?: string;
  level?: number;
  avatarUrl?: string;
  backgroundImage?: string;
  ownerId: string;
  ownerName?: string;
  ownerEmail?: string;
  permissionLevel: PermissionLevel;
  sharedAt: string;
}

/**
 * Permission level badge with icon
 */
const PermissionBadge: React.FC<{ level: PermissionLevel }> = ({ level }) => {
  const config = {
    viewer: {
      icon: Eye,
      label: 'Viewer',
      variant: 'secondary' as const,
      description: 'Can view only',
    },
    editor: {
      icon: Edit,
      label: 'Editor',
      variant: 'purple' as const,
      description: 'Can edit',
    },
    owner: {
      icon: Crown,
      label: 'Co-Owner',
      variant: 'gold' as const,
      description: 'Full access',
    },
  };

  const { icon: Icon, label, variant } = config[level];

  return (
    <Badge variant={variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
};

/**
 * Individual shared character card
 */
const SharedCharacterCard: React.FC<{
  character: SharedCharacter;
  onRemoveSelf: (characterId: string, characterName: string) => void;
}> = ({ character, onRemoveSelf }) => {
  const navigate = useNavigate();

  return (
    <Card className="group relative border-2 border-border/30 shadow-md transition-all duration-300 hover:shadow-xl hover:border-infinite-purple/50">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-10 rounded-lg"
        style={
          character.backgroundImage
            ? { backgroundImage: `url(${character.backgroundImage})` }
            : undefined
        }
      />

      <div className="relative p-4 space-y-3">
        {/* Header with Avatar */}
        <div className="flex items-start gap-3">
          {character.avatarUrl && (
            <img
              src={character.avatarUrl}
              alt={character.name}
              className="w-12 h-12 rounded-full object-cover border-2 border-infinite-gold/50"
            />
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate">{character.name}</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {character.race && <span>{character.race}</span>}
              {character.class && (
                <>
                  <span>•</span>
                  <span>{character.class}</span>
                </>
              )}
              {character.level && (
                <>
                  <span>•</span>
                  <span>Level {character.level}</span>
                </>
              )}
            </div>
          </div>
          <PermissionBadge level={character.permissionLevel} />
        </div>

        {/* Description */}
        {character.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {character.description}
          </p>
        )}

        {/* Owner Info */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>
            Shared by{' '}
            <span className="font-medium text-foreground">
              {character.ownerName || character.ownerEmail || 'Unknown'}
            </span>
          </span>
        </div>

        {/* Shared Date */}
        <div className="text-xs text-muted-foreground">
          Shared {new Date(character.sharedAt).toLocaleDateString()}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          <Button
            size="sm"
            onClick={() => navigate(`/app/character/${character.id}`)}
            className="flex-1"
          >
            View Character
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemoveSelf(character.id, character.name)}
            className="text-muted-foreground hover:text-destructive"
          >
            <UserMinus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

/**
 * Main SharedCharactersList component
 */
export const SharedCharactersList: React.FC = () => {
  const { toast } = useToast();
  const trpc = useTRPC();
  const utils = useTRPCUtils();

  const [filterPermission, setFilterPermission] = useState<string>('all');
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Fetch shared characters
  const {
    data: sharedCharacters,
    isLoading,
    error,
  } = trpc.characters.listShared.useQuery();

  // Remove self mutation
  const removeSelfMutation = trpc.characters.revokePermission.useMutation({
    onSuccess: () => {
      toast({
        title: 'Access Removed',
        description: 'You no longer have access to this character.',
      });
      utils.characters.listShared.invalidate();
      setRemoveDialogOpen(false);
      setSelectedCharacter(null);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove access. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Filter characters by permission level
  const filteredCharacters = useMemo(() => {
    if (!sharedCharacters) return [];
    if (filterPermission === 'all') return sharedCharacters;
    return sharedCharacters.filter((char: any) => char.permissionLevel === filterPermission);
  }, [sharedCharacters, filterPermission]);

  const handleRemoveSelf = (characterId: string, characterName: string) => {
    setSelectedCharacter({ id: characterId, name: characterName });
    setRemoveDialogOpen(true);
  };

  const confirmRemoveSelf = () => {
    if (!selectedCharacter) return;

    // In a real implementation, this would call the revoke endpoint with the current user's ID
    // For now, we'll show a toast indicating the action
    toast({
      title: 'Feature Coming Soon',
      description: 'Self-removal from shared characters will be available soon.',
    });
    setRemoveDialogOpen(false);
    setSelectedCharacter(null);
  };

  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="text-destructive mb-2">Failed to load shared characters</div>
        <div className="text-sm text-muted-foreground">
          {error.message || 'Please try again later.'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-infinite-purple" />
            Shared With Me
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Characters that other users have shared with you
          </p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterPermission} onValueChange={setFilterPermission}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Permissions</SelectItem>
              <SelectItem value={PermissionLevel.VIEWER}>Viewers</SelectItem>
              <SelectItem value={PermissionLevel.EDITOR}>Editors</SelectItem>
              <SelectItem value={PermissionLevel.OWNER}>Co-Owners</SelectItem>
            </SelectContent>
          </Select>
          {filterPermission !== 'all' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setFilterPermission('all')}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Character List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-48 animate-pulse bg-accent/50" />
          ))}
        </div>
      ) : filteredCharacters.length === 0 ? (
        <Card className="p-12 text-center border-2 border-dashed">
          <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="font-semibold text-lg mb-2">No Shared Characters</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {filterPermission === 'all'
              ? "You don't have any shared characters yet. When others share characters with you, they'll appear here."
              : `No characters shared with ${filterPermission} permission.`}
          </p>
          {filterPermission !== 'all' && (
            <Button
              variant="outline"
              onClick={() => setFilterPermission('all')}
              className="mt-4"
            >
              Clear Filter
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCharacters.map((character: any) => (
            <SharedCharacterCard
              key={character.id}
              character={character}
              onRemoveSelf={handleRemoveSelf}
            />
          ))}
        </div>
      )}

      {/* Remove Self Confirmation Dialog */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Access</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove your access to "
              {selectedCharacter?.name}"? You won't be able to view or edit this
              character unless the owner shares it with you again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemoveSelf}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeSelfMutation.isPending ? 'Removing...' : 'Remove Access'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SharedCharactersList;
