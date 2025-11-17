/**
 * Battle Map Page
 *
 * Main page for viewing and interacting with battle maps.
 * Provides a full-screen canvas with toolbar, layers panel, and tool options.
 *
 * Features:
 * - Full-screen battle canvas
 * - Vertical toolbar with tool selection
 * - Collapsible layers panel
 * - Tool options panel
 * - Breadcrumb navigation
 * - Settings and performance monitor
 * - Keyboard shortcuts
 * - Responsive design (mobile/desktop)
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Settings as SettingsIcon, ChevronLeft, ChevronRight, Menu } from 'lucide-react';

import { BattleCanvas } from '@/components/battle-map/BattleCanvas';
import { Toolbar } from '@/components/battle-map/Toolbar';
import { LayersPanel } from '@/components/battle-map/LayersPanel';
import { ToolOptionsPanel } from '@/components/battle-map/ToolOptionsPanel';
import { PerformanceMonitor } from '@/components/battle-map/PerformanceMonitor';
import { HotkeyGuide } from '@/components/battle-map/HotkeyGuide';
import { QuickActionMenu } from '@/components/battle-map/QuickActionMenu';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { trpc } from '@/infrastructure/api/trpc-client';
import { useBattleMapStore } from '@/stores/useBattleMapStore';
import { useHotkeys, BATTLE_MAP_HOTKEYS, createHotkeyFromPreset } from '@/hooks/use-hotkeys';
import { cn } from '@/lib/utils';
import logger from '@/lib/logger';

/**
 * Battle Map Page Component
 */
export const BattleMapPage: React.FC = () => {
  const { sceneId, campaignId } = useParams<{ sceneId: string; campaignId: string }>();
  const navigate = useNavigate();

  // State
  const [showLayersPanel, setShowLayersPanel] = useState(true);
  const [showPerformanceMonitor, setShowPerformanceMonitor] = useState(false);
  const [showHotkeyGuide, setShowHotkeyGuide] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Battle map store
  const setActiveSceneId = useBattleMapStore((state) => state.setActiveSceneId);
  const clearSelection = useBattleMapStore((state) => state.clearSelection);
  const selectedTool = useBattleMapStore((state) => state.selectedTool);

  // Fetch scene data
  const {
    data: scene,
    isLoading: isLoadingScene,
    error: sceneError,
  } = trpc.scenes.getById.useQuery(
    { sceneId: sceneId! },
    {
      enabled: !!sceneId,
      retry: 1,
      onSuccess: (data) => {
        logger.info('Scene loaded successfully', { sceneId: data.id, name: data.name });
      },
      onError: (error) => {
        logger.error('Failed to load scene', { sceneId, error });
      },
    }
  );

  // Fetch campaign data for breadcrumbs
  const { data: campaign } = trpc.campaigns.getById.useQuery(
    { campaignId: campaignId! },
    { enabled: !!campaignId }
  );

  // ===========================
  // Effects
  // ===========================

  // Set active scene in store
  useEffect(() => {
    if (sceneId) {
      setActiveSceneId(sceneId);
    }
    return () => {
      setActiveSceneId(null);
    };
  }, [sceneId, setActiveSceneId]);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Hide panels on mobile by default
  useEffect(() => {
    if (isMobile) {
      setShowLayersPanel(false);
    } else {
      setShowLayersPanel(true);
    }
  }, [isMobile]);

  // ===========================
  // Keyboard Shortcuts
  // ===========================

  useHotkeys({
    hotkeys: [
      createHotkeyFromPreset(BATTLE_MAP_HOTKEYS.CANCEL, () => {
        clearSelection();
      }),
      createHotkeyFromPreset(BATTLE_MAP_HOTKEYS.HELP, () => {
        setShowHotkeyGuide(true);
      }),
      createHotkeyFromPreset(BATTLE_MAP_HOTKEYS.TOGGLE_GRID, () => {
        // Grid toggle handled by layers panel
      }),
    ],
    enabled: true,
  });

  // ===========================
  // Handlers
  // ===========================

  const handleBackToScenes = () => {
    navigate(`/app/campaigns/${campaignId}/scenes`);
  };

  const handleBackToCampaign = () => {
    navigate(`/app/campaigns/${campaignId}`);
  };

  const handleHelpClick = () => {
    setShowHotkeyGuide(true);
  };

  const handleSettingsClick = () => {
    // Settings logic could be expanded here
    setShowPerformanceMonitor(!showPerformanceMonitor);
  };

  const toggleLayersPanel = () => {
    setShowLayersPanel(!showLayersPanel);
  };

  // ===========================
  // Validation
  // ===========================

  if (!sceneId || !campaignId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Invalid Route</CardTitle>
            <CardDescription>Scene ID or Campaign ID is missing.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/app')} className="w-full">
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ===========================
  // Loading State
  // ===========================

  if (isLoadingScene) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        {/* Header Skeleton */}
        <div className="h-14 border-b flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-8 w-24" />
        </div>

        {/* Canvas Skeleton */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Skeleton className="h-12 w-12 rounded-full mx-auto" />
            <Skeleton className="h-4 w-48 mx-auto" />
            <Skeleton className="h-4 w-32 mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  // ===========================
  // Error State
  // ===========================

  if (sceneError || !scene) {
    const errorMessage = sceneError?.message || 'Scene not found';
    const isPermissionError = errorMessage.toLowerCase().includes('permission') ||
                              errorMessage.toLowerCase().includes('forbidden') ||
                              errorMessage.toLowerCase().includes('access');

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-lg w-full">
          <CardHeader>
            <CardTitle className="text-destructive">
              {isPermissionError ? 'Access Denied' : 'Scene Not Found'}
            </CardTitle>
            <CardDescription>
              {isPermissionError
                ? "You don't have permission to view this scene."
                : 'The scene you are looking for does not exist or has been deleted.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{errorMessage}</p>
            <div className="flex gap-2">
              <Button onClick={handleBackToScenes} variant="outline" className="flex-1">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Scenes
              </Button>
              <Button onClick={handleBackToCampaign} className="flex-1">
                Back to Campaign
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ===========================
  // Main Render
  // ===========================

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background">
      {/* Top Navigation Bar */}
      <div className="absolute top-0 left-0 right-0 h-14 bg-background/95 backdrop-blur-sm border-b z-40 flex items-center justify-between px-4">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <button
            onClick={() => navigate('/app/campaigns')}
            className="hover:text-foreground transition-colors"
          >
            Campaigns
          </button>
          <span>/</span>
          <button
            onClick={handleBackToCampaign}
            className="hover:text-foreground transition-colors max-w-[150px] truncate"
          >
            {campaign?.name || 'Campaign'}
          </button>
          <span>/</span>
          <button
            onClick={handleBackToScenes}
            className="hover:text-foreground transition-colors"
          >
            Scenes
          </button>
          <span>/</span>
          <span className="text-foreground font-medium max-w-[200px] truncate">
            {scene.name}
          </span>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Mobile: Layers Panel Toggle */}
          {isMobile && (
            <Button variant="ghost" size="icon" onClick={toggleLayersPanel}>
              <Menu className="h-4 w-4" />
            </Button>
          )}

          {/* Settings Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <SettingsIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>View Settings</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowPerformanceMonitor(!showPerformanceMonitor)}>
                {showPerformanceMonitor ? 'Hide' : 'Show'} Performance Monitor
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowHotkeyGuide(true)}>
                Keyboard Shortcuts
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={toggleLayersPanel}>
                {showLayersPanel ? 'Hide' : 'Show'} Layers Panel
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleBackToScenes}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Scenes
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="absolute top-14 left-0 right-0 bottom-0 flex">
        {/* Battle Canvas - Full screen background */}
        <div className="flex-1 relative">
          <BattleCanvas
            sceneId={sceneId}
            backgroundColor="#1a1a2e"
            enablePan={selectedTool === 'pan'}
            enableZoom={true}
            minZoom={0.25}
            maxZoom={8}
            className="w-full h-full"
          />

          {/* Toolbar - Positioned on left side */}
          <div className="absolute left-4 top-1/2 -translate-y-1/2 z-30">
            <Toolbar
              sceneId={sceneId}
              isGM={true} // TODO: Get from user/campaign context
              orientation="vertical"
              position="left"
              showHelp={true}
              onHelpClick={handleHelpClick}
              onSettingsClick={handleSettingsClick}
            />
          </div>

          {/* Tool Options Panel - Positioned below toolbar when active */}
          {(selectedTool === 'wall' || selectedTool === 'fog-brush' || selectedTool === 'draw') && (
            <div className="absolute left-4 bottom-4 z-30">
              <ToolOptionsPanel sceneId={sceneId} />
            </div>
          )}

          {/* Performance Monitor - Top left corner */}
          {showPerformanceMonitor && (
            <div className="absolute top-4 left-20 z-30">
              <PerformanceMonitor />
            </div>
          )}

          {/* Layers Panel Toggle (Desktop) */}
          {!isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleLayersPanel}
              className={cn(
                'absolute top-4 z-30 transition-all',
                showLayersPanel ? 'right-80' : 'right-4'
              )}
            >
              {showLayersPanel ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        {/* Layers Panel - Right side (Desktop) or Sheet (Mobile) */}
        {isMobile ? (
          <Sheet open={showLayersPanel} onOpenChange={setShowLayersPanel}>
            <SheetContent side="right" className="w-80 p-0">
              <SheetHeader className="p-4 border-b">
                <SheetTitle>Layers</SheetTitle>
              </SheetHeader>
              <div className="overflow-y-auto h-[calc(100vh-5rem)]">
                <LayersPanel sceneId={sceneId} side="right" />
              </div>
            </SheetContent>
          </Sheet>
        ) : (
          showLayersPanel && (
            <div className="w-80 border-l bg-background/95 backdrop-blur-sm overflow-y-auto">
              <LayersPanel sceneId={sceneId} side="right" />
            </div>
          )
        )}
      </div>

      {/* Quick Action Menu - Activated by 'Q' key */}
      <QuickActionMenu sceneId={sceneId} />

      {/* Hotkey Guide Modal */}
      {showHotkeyGuide && (
        <HotkeyGuide
          open={showHotkeyGuide}
          onOpenChange={setShowHotkeyGuide}
        />
      )}
    </div>
  );
};

export default BattleMapPage;
