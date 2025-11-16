/**
 * Scene Management Page
 *
 * Main page for managing scenes in a campaign.
 * Features:
 * - Scene list/grid view
 * - Create new scene wizard
 * - Edit existing scenes
 * - Navigate to battle map view
 * - Breadcrumbs navigation
 */

import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Map, Plus, Settings } from 'lucide-react';

import { SceneManager } from '@/components/scenes/SceneManager';
import { SceneCreationWizard } from '@/components/scenes/SceneCreationWizard';
import { SceneTemplateLibrary, BUILT_IN_TEMPLATES, SceneTemplate } from '@/components/scenes/SceneTemplateLibrary';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { trpc } from '@/infrastructure/api/trpc-client';

type ViewMode = 'list' | 'create' | 'create-from-template';

export const SceneManagementPage: React.FC = () => {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedTemplate, setSelectedTemplate] = useState<SceneTemplate | null>(null);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);

  // Fetch campaign details
  const { data: campaign } = trpc.campaigns.getById.useQuery(
    { campaignId: campaignId! },
    { enabled: !!campaignId }
  );

  const createSceneFromTemplateMutation = trpc.scenes.create.useMutation({
    onSuccess: (scene) => {
      toast({
        title: 'Scene Created',
        description: 'Your new scene from template has been created.',
      });
      setShowTemplateDialog(false);
      setSelectedTemplate(null);
      navigate(`/app/campaigns/${campaignId}/scenes/${scene.id}`);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create scene from template.',
        variant: 'destructive',
      });
    },
  });

  if (!campaignId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card variant="parchment" className="p-12 text-center">
          <CardTitle className="text-2xl mb-2">Invalid Campaign</CardTitle>
          <CardDescription>Please select a valid campaign.</CardDescription>
          <Button onClick={() => navigate('/app/campaigns')} className="mt-6">
            Return to Campaigns
          </Button>
        </Card>
      </div>
    );
  }

  const handleCreateScene = () => {
    setShowTemplateDialog(true);
  };

  const handleStartWithTemplate = (template: SceneTemplate) => {
    setSelectedTemplate(template);
    setShowTemplateDialog(false);
    setViewMode('create-from-template');
  };

  const handleStartBlank = () => {
    setShowTemplateDialog(false);
    setViewMode('create');
  };

  const handleViewScene = (sceneId: string) => {
    navigate(`/app/campaigns/${campaignId}/scenes/${sceneId}/battle-map`);
  };

  const handleEditScene = (sceneId: string) => {
    navigate(`/app/campaigns/${campaignId}/scenes/${sceneId}/edit`);
  };

  const handleWizardComplete = (sceneId: string) => {
    setViewMode('list');
    navigate(`/app/campaigns/${campaignId}/scenes/${sceneId}/battle-map`);
  };

  const handleCancelCreate = () => {
    setViewMode('list');
    setSelectedTemplate(null);
  };

  const handleCreateFromTemplate = () => {
    if (!selectedTemplate) return;

    createSceneFromTemplateMutation.mutate({
      name: selectedTemplate.name,
      description: selectedTemplate.description,
      campaignId,
      width: selectedTemplate.width,
      height: selectedTemplate.height,
      gridSize: selectedTemplate.gridSize,
      gridType: selectedTemplate.gridType,
      gridColor: '#000000',
      backgroundImageUrl: '',
      thumbnailUrl: '',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/30 to-slate-50">
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumbs */}
        <div className="mb-6">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <button
              onClick={() => navigate('/app/campaigns')}
              className="hover:text-foreground transition-colors"
            >
              Campaigns
            </button>
            <span>/</span>
            <button
              onClick={() => navigate(`/app/campaigns/${campaignId}`)}
              className="hover:text-foreground transition-colors"
            >
              {campaign?.name || 'Campaign'}
            </button>
            <span>/</span>
            <span className="text-foreground font-medium">Scenes</span>
          </nav>

          {viewMode === 'list' && (
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-infinite-purple to-electricCyan mb-2">
                  Scene Management
                </h1>
                <p className="text-muted-foreground">
                  Create and manage battle maps and exploration scenes for your campaign
                </p>
              </div>
              <Button onClick={() => navigate(`/app/campaigns/${campaignId}`)} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Campaign
              </Button>
            </div>
          )}
        </div>

        {/* List View */}
        {viewMode === 'list' && (
          <SceneManager
            campaignId={campaignId}
            onCreateScene={handleCreateScene}
            onEditScene={handleEditScene}
            onViewScene={handleViewScene}
          />
        )}

        {/* Create View */}
        {viewMode === 'create' && (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Create New Scene</h2>
              <Button onClick={handleCancelCreate} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to List
              </Button>
            </div>
            <SceneCreationWizard
              campaignId={campaignId}
              onComplete={handleWizardComplete}
              onCancel={handleCancelCreate}
            />
          </div>
        )}

        {/* Create from Template View */}
        {viewMode === 'create-from-template' && selectedTemplate && (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Create from Template</h2>
                <p className="text-muted-foreground">
                  Creating scene based on: <strong>{selectedTemplate.name}</strong>
                </p>
              </div>
              <Button onClick={handleCancelCreate} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to List
              </Button>
            </div>

            <Card variant="parchment" className="max-w-2xl mx-auto">
              <CardHeader>
                <div className="text-6xl mb-4 text-center">{selectedTemplate.thumbnailEmoji}</div>
                <CardTitle className="text-center">{selectedTemplate.name}</CardTitle>
                <CardDescription className="text-center">
                  {selectedTemplate.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Dimensions</p>
                    <p className="font-semibold">
                      {selectedTemplate.width} × {selectedTemplate.height} squares
                    </p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Grid Type</p>
                    <p className="font-semibold capitalize">
                      {selectedTemplate.gridType.replace('_', ' ')}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Lighting</p>
                    <p className="font-semibold">
                      {Math.round(parseFloat(selectedTemplate.suggestedSettings.ambientLightLevel) * 100)}%
                    </p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Time of Day</p>
                    <p className="font-semibold capitalize">
                      {selectedTemplate.suggestedSettings.timeOfDay}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold">Included Features:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Pre-configured dimensions and grid</li>
                    <li>Optimized lighting settings</li>
                    {selectedTemplate.suggestedSettings.enableFogOfWar && <li>Fog of War enabled</li>}
                    {selectedTemplate.suggestedSettings.enableDynamicLighting && (
                      <li>Dynamic lighting enabled</li>
                    )}
                  </ul>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-amber-800">
                    <strong>Note:</strong> You'll need to upload your own background image after
                    creating the scene.
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={handleCancelCreate} className="flex-1">
                    Cancel
                  </Button>
                  <Button
                    variant="cosmic"
                    onClick={handleCreateFromTemplate}
                    disabled={createSceneFromTemplateMutation.isLoading}
                    className="flex-1"
                  >
                    {createSceneFromTemplateMutation.isLoading ? (
                      'Creating...'
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Scene
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Template Selection Dialog */}
        <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Choose How to Create Your Scene</DialogTitle>
              <DialogDescription>
                Start with a template or create a custom scene from scratch
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="templates" className="mt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="templates">
                  <Map className="mr-2 h-4 w-4" />
                  Templates
                </TabsTrigger>
                <TabsTrigger value="blank">
                  <Settings className="mr-2 h-4 w-4" />
                  Blank Scene
                </TabsTrigger>
              </TabsList>

              <TabsContent value="templates" className="mt-6">
                <SceneTemplateLibrary
                  onSelectTemplate={handleStartWithTemplate}
                  selectedTemplateId={selectedTemplate?.id}
                />
              </TabsContent>

              <TabsContent value="blank" className="mt-6">
                <Card variant="parchment" className="p-12 text-center">
                  <div className="text-6xl mb-4">🎨</div>
                  <CardTitle className="mb-2">Start from Scratch</CardTitle>
                  <CardDescription className="mb-6">
                    Create a fully customized scene with your own dimensions, grid settings, and
                    background image.
                  </CardDescription>
                  <Button variant="cosmic" onClick={handleStartBlank}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Blank Scene
                  </Button>
                </Card>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default SceneManagementPage;
