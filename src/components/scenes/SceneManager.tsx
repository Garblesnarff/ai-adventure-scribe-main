/**
 * Scene Manager Component
 *
 * Grid/list view for managing scenes in a campaign.
 * Features:
 * - Grid or list view toggle
 * - Scene thumbnails
 * - Active scene indicator
 * - Create, duplicate, delete, and set active actions
 */

import React, { useState } from 'react';
import { Grid, List, Plus, Copy, Trash2, Eye, MoreVertical } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { trpc } from '@/infrastructure/api/trpc-client';
import { cn } from '@/lib/utils';

interface SceneManagerProps {
  campaignId: string;
  onCreateScene?: () => void;
  onEditScene?: (sceneId: string) => void;
  onViewScene?: (sceneId: string) => void;
}

type ViewMode = 'grid' | 'list';

export const SceneManager: React.FC<SceneManagerProps> = ({
  campaignId,
  onCreateScene,
  onEditScene,
  onViewScene,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sceneToDelete, setSceneToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch scenes
  const { data: scenes, isLoading, refetch } = trpc.scenes.list.useQuery({ campaignId });

  // Mutations
  const deleteMutation = trpc.scenes.delete.useMutation({
    onSuccess: () => {
      toast({
        title: 'Scene Deleted',
        description: 'The scene has been successfully deleted.',
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete scene.',
        variant: 'destructive',
      });
    },
  });

  const setActiveMutation = trpc.scenes.setActive.useMutation({
    onSuccess: () => {
      toast({
        title: 'Active Scene Updated',
        description: 'The scene is now the active scene.',
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to set active scene.',
        variant: 'destructive',
      });
    },
  });

  const duplicateMutation = trpc.scenes.create.useMutation({
    onSuccess: () => {
      toast({
        title: 'Scene Duplicated',
        description: 'The scene has been successfully duplicated.',
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to duplicate scene.',
        variant: 'destructive',
      });
    },
  });

  const handleDelete = (sceneId: string) => {
    deleteMutation.mutate({ sceneId });
    setSceneToDelete(null);
  };

  const handleSetActive = (sceneId: string) => {
    setActiveMutation.mutate({ sceneId, campaignId });
  };

  const handleDuplicate = (scene: any) => {
    duplicateMutation.mutate({
      name: `${scene.name} (Copy)`,
      description: scene.description,
      campaignId,
      width: scene.width,
      height: scene.height,
      gridSize: scene.gridSize,
      gridType: scene.gridType as any,
      gridColor: scene.gridColor,
      backgroundImageUrl: scene.backgroundImageUrl || '',
      thumbnailUrl: scene.thumbnailUrl || '',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-muted-foreground">Loading scenes...</div>
      </div>
    );
  }

  const sceneList = scenes || [];

  return (
    <div className="space-y-6">
      {/* Header with view toggle and create button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground ml-2">
            {sceneList.length} {sceneList.length === 1 ? 'scene' : 'scenes'}
          </span>
        </div>
        <Button onClick={onCreateScene} variant="cosmic">
          <Plus className="mr-2 h-4 w-4" />
          Create New Scene
        </Button>
      </div>

      {/* Empty state */}
      {sceneList.length === 0 && (
        <Card variant="parchment" className="p-12 text-center">
          <CardContent>
            <div className="mb-4 text-6xl">🗺️</div>
            <CardTitle className="mb-2">No Scenes Yet</CardTitle>
            <CardDescription className="mb-6">
              Create your first scene to bring your campaign to life with interactive battle maps.
            </CardDescription>
            <Button onClick={onCreateScene} variant="cosmic">
              <Plus className="mr-2 h-4 w-4" />
              Create First Scene
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && sceneList.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sceneList.map((scene: any) => (
            <Card
              key={scene.id}
              variant="parchment"
              className={cn(
                'overflow-hidden transition-all cursor-pointer',
                scene.isActive && 'ring-4 ring-electricCyan shadow-lg shadow-electricCyan/50',
              )}
              onClick={() => onViewScene?.(scene.id)}
            >
              {/* Thumbnail */}
              <div className="relative h-48 bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden">
                {scene.thumbnailUrl || scene.backgroundImageUrl ? (
                  <img
                    src={scene.thumbnailUrl || scene.backgroundImageUrl}
                    alt={scene.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-6xl text-slate-400">
                    🗺️
                  </div>
                )}
                {scene.isActive && (
                  <Badge className="absolute top-2 left-2 bg-electricCyan text-white">
                    <Eye className="mr-1 h-3 w-3" />
                    Active
                  </Badge>
                )}
              </div>

              {/* Content */}
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{scene.name}</CardTitle>
                    <CardDescription className="text-xs mt-1">
                      {scene.width} × {scene.height} squares
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        onViewScene?.(scene.id);
                      }}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Scene
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        onEditScene?.(scene.id);
                      }}>
                        Edit
                      </DropdownMenuItem>
                      {!scene.isActive && (
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          handleSetActive(scene.id);
                        }}>
                          Set as Active
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicate(scene);
                      }}>
                        <Copy className="mr-2 h-4 w-4" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSceneToDelete(scene.id);
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              {scene.description && (
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {scene.description}
                  </p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && sceneList.length > 0 && (
        <div className="space-y-3">
          {sceneList.map((scene: any) => (
            <Card
              key={scene.id}
              variant="parchment"
              className={cn(
                'overflow-hidden transition-all cursor-pointer',
                scene.isActive && 'ring-2 ring-electricCyan',
              )}
              onClick={() => onViewScene?.(scene.id)}
            >
              <div className="flex items-center gap-4 p-4">
                {/* Thumbnail */}
                <div className="relative w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-200 rounded overflow-hidden flex-shrink-0">
                  {scene.thumbnailUrl || scene.backgroundImageUrl ? (
                    <img
                      src={scene.thumbnailUrl || scene.backgroundImageUrl}
                      alt={scene.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-4xl text-slate-400">
                      🗺️
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold truncate">{scene.name}</h3>
                    {scene.isActive && (
                      <Badge className="bg-electricCyan text-white">
                        <Eye className="mr-1 h-3 w-3" />
                        Active
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {scene.width} × {scene.height} squares • {scene.gridType}
                  </p>
                  {scene.description && (
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {scene.description}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      onViewScene?.(scene.id);
                    }}>
                      <Eye className="mr-2 h-4 w-4" />
                      View Scene
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      onEditScene?.(scene.id);
                    }}>
                      Edit
                    </DropdownMenuItem>
                    {!scene.isActive && (
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        handleSetActive(scene.id);
                      }}>
                        Set as Active
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicate(scene);
                    }}>
                      <Copy className="mr-2 h-4 w-4" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSceneToDelete(scene.id);
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!sceneToDelete} onOpenChange={() => setSceneToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Scene?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the scene and all associated data including tokens,
              lighting, and fog of war. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => sceneToDelete && handleDelete(sceneToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Scene
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
