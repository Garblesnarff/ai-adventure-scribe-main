/**
 * BFF Character Dashboard Hook
 * 
 * React Query hook optimized for BFF character dashboard endpoints.
 * Provides comprehensive character data with optimistic updates.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  BFFCharacterDashboard, 
  BFFCharacterDashboardRequest,
  BFFCharacterDashboardResponse 
} from '../../../server/src/bff/types';

const BFF_BASE_URL = import.meta.env.VITE_BFF_API_URL || 'http://localhost:4000/bff';

/**
 * Hook for BFF character dashboard data
 */
export function useBFFCharacterDashboard(
  characterId: string | null,
  options: {
    campaignId?: string;
    includeDetailedStats?: boolean;
    suspense?: boolean;
  } = {}
) {
  const { campaignId, includeDetailedStats = true, suspense = false } = options;

  return useQuery({
    queryKey: ['bff-character-dashboard', characterId, { campaignId, includeDetailedStats }],
    queryFn: async (): Promise<BFFCharacterDashboard> => {
      if (!characterId) {
        throw new Error('Character ID is required');
      }

      const params = new URLSearchParams();
      if (campaignId) params.append('campaignId', campaignId);
      if (includeDetailedStats) params.append('includeDetailedStats', 'true');

      const response = await fetch(`${BFF_BASE_URL}/character-dashboard/${characterId}?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch character dashboard: ${response.statusText}`);
      }

      const result: BFFCharacterDashboardResponse = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to load character dashboard');
      }

      return result.data;
    },
    enabled: !!characterId,
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: false,
    suspense
  });
}

/**
 * Hook for quick character stats (for React Suspense)
 */
export function useBFFCharacterQuickStats(characterId: string | null) {
  return useQuery({
    queryKey: ['bff-character-quick-stats', characterId],
    queryFn: async () => {
      if (!characterId) {
        throw new Error('Character ID is required');
      }

      const response = await fetch(`${BFF_BASE_URL}/character-dashboard/${characterId}/quick-stats`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch quick stats: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to load quick stats');
      }

      return result.data;
    },
    enabled: !!characterId,
    staleTime: 30000, // 30 seconds
    suspense: true // Always use suspense for quick stats
  });
}

/**
 * Hook for updating character data
 */
export function useBFFUpdateCharacter(characterId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: {
      hitPoints?: { current: number };
      experience?: number;
      level?: number;
    }): Promise<void> => {
      const response = await fetch(`${BFF_BASE_URL}/character-dashboard/${characterId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`Failed to update character: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update character');
      }
    },
    onMutate: async (updates) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['bff-character-dashboard', characterId] });

      // Snapshot previous value
      const previousDashboard = queryClient.getQueryData<BFFCharacterDashboard>(
        ['bff-character-dashboard', characterId]
      );

      // Optimistically update
      if (previousDashboard) {
        const updated: BFFCharacterDashboard = { ...previousDashboard };

        if (updates.hitPoints) {
          updated.character.hitPoints.current = updates.hitPoints.current;
          updated.combatReadiness.hitPoints.current = updates.hitPoints.current;
        }

        if (updates.experience !== undefined) {
          updated.progressMetrics.experience.current = updates.experience;
        }

        if (updates.level !== undefined) {
          updated.character.level = updates.level;
        }

        queryClient.setQueryData(['bff-character-dashboard', characterId], updated);
      }

      return { previousDashboard };
    },
    onError: (error, updates, context) => {
      // Rollback on error
      if (context?.previousDashboard) {
        queryClient.setQueryData(['bff-character-dashboard', characterId], context.previousDashboard);
      }
      console.error('❌ BFF: Failed to update character:', error);
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ 
        queryKey: ['bff-character-dashboard', characterId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['bff-character-quick-stats', characterId] 
      });
    }
  });
}

/**
 * Hook for character hit points management
 */
export function useBFFCharacterHitPoints(characterId: string) {
  const updateCharacter = useBFFUpdateCharacter(characterId);
  const queryClient = useQueryClient();

  const takeDamage = (damage: number) => {
    const dashboard = queryClient.getQueryData<BFFCharacterDashboard>(
      ['bff-character-dashboard', characterId]
    );
    
    if (dashboard) {
      const currentHP = dashboard.character.hitPoints.current;
      const newHP = Math.max(0, currentHP - damage);
      
      updateCharacter.mutate({ hitPoints: { current: newHP } });
    }
  };

  const heal = (healing: number) => {
    const dashboard = queryClient.getQueryData<BFFCharacterDashboard>(
      ['bff-character-dashboard', characterId]
    );
    
    if (dashboard) {
      const currentHP = dashboard.character.hitPoints.current;
      const maxHP = dashboard.character.hitPoints.maximum;
      const newHP = Math.min(maxHP, currentHP + healing);
      
      updateCharacter.mutate({ hitPoints: { current: newHP } });
    }
  };

  const setHitPoints = (hitPoints: number) => {
    const dashboard = queryClient.getQueryData<BFFCharacterDashboard>(
      ['bff-character-dashboard', characterId]
    );
    
    if (dashboard) {
      const maxHP = dashboard.character.hitPoints.maximum;
      const newHP = Math.max(0, Math.min(maxHP, hitPoints));
      
      updateCharacter.mutate({ hitPoints: { current: newHP } });
    }
  };

  return {
    takeDamage,
    heal,
    setHitPoints,
    isUpdating: updateCharacter.isPending,
    error: updateCharacter.error
  };
}

/**
 * Hook for character experience and leveling
 */
export function useBFFCharacterProgression(characterId: string) {
  const updateCharacter = useBFFUpdateCharacter(characterId);
  const queryClient = useQueryClient();

  const addExperience = (experience: number) => {
    const dashboard = queryClient.getQueryData<BFFCharacterDashboard>(
      ['bff-character-dashboard', characterId]
    );
    
    if (dashboard) {
      const currentExp = dashboard.progressMetrics.experience.current;
      const newExp = currentExp + experience;
      
      updateCharacter.mutate({ experience: newExp });
    }
  };

  const levelUp = () => {
    const dashboard = queryClient.getQueryData<BFFCharacterDashboard>(
      ['bff-character-dashboard', characterId]
    );
    
    if (dashboard) {
      const currentLevel = dashboard.character.level;
      const newLevel = currentLevel + 1;
      const newExp = dashboard.progressMetrics.experience.nextLevel;
      
      updateCharacter.mutate({ 
        level: newLevel,
        experience: newExp 
      });
    }
  };

  return {
    addExperience,
    levelUp,
    isUpdating: updateCharacter.isPending,
    error: updateCharacter.error
  };
}

/**
 * Prefetch character dashboard data
 */
export function useBFFPrefetchCharacterDashboard() {
  const queryClient = useQueryClient();

  return (characterId: string, options: { campaignId?: string } = {}) => {
    queryClient.prefetchQuery({
      queryKey: ['bff-character-dashboard', characterId, options],
      queryFn: async (): Promise<BFFCharacterDashboard> => {
        const params = new URLSearchParams();
        if (options.campaignId) params.append('campaignId', options.campaignId);
        params.append('includeDetailedStats', 'true');

        const response = await fetch(`${BFF_BASE_URL}/character-dashboard/${characterId}?${params}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to prefetch character dashboard: ${response.statusText}`);
        }

        const result: BFFCharacterDashboardResponse = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to prefetch character dashboard');
        }

        return result.data;
      },
      staleTime: 60000 // 1 minute
    });
  };
}