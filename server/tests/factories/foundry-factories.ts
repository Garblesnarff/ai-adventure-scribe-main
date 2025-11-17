/**
 * Foundry VTT Test Factories and Utilities
 *
 * Factory functions and helpers for creating test data for Foundry VTT features.
 * Includes scene, token, fog of war, drawing, and measurement template factories.
 */

import { db } from '../../../db/client.js';
import {
  scenes,
  sceneLayers,
  sceneSettings,
  tokens,
  tokenConfigurations,
  fogOfWar,
  visionBlockingShapes,
  sceneDrawings,
  measurementTemplates,
  campaigns,
  characters,
} from '../../../db/schema/index.js';

import type {
  Scene,
  NewScene,
  Token,
  NewToken,
  FogOfWar,
  NewFogOfWar,
  VisionBlockingShape,
  NewVisionBlockingShape,
  SceneDrawing,
  NewSceneDrawing,
  MeasurementTemplate,
  NewMeasurementTemplate,
  SceneSetting,
  NewSceneSetting,
  Campaign,
  NewCampaign,
} from '../../../db/schema/index.js';

import { eq, sql } from 'drizzle-orm';

// =====================================================
// CONSTANTS
// =====================================================

export const TEST_USER_ID = 'test-user-foundry-123';
export const TEST_CAMPAIGN_ID = 'test-campaign-foundry-456';

export const DEFAULT_SCENE_CONFIG = {
  name: 'Test Battle Map',
  description: 'A test scene for combat encounters',
  width: 40,
  height: 30,
  gridSize: 5,
  gridType: 'square' as const,
  gridColor: '#000000',
  isActive: true,
};

export const DEFAULT_TOKEN_CONFIG = {
  name: 'Test Token',
  tokenType: 'character' as const,
  positionX: '10.0',
  positionY: '10.0',
  rotation: '0',
  elevation: '0',
  sizeWidth: '1.0',
  sizeHeight: '1.0',
  gridSize: 'medium' as const,
  scale: '1.0',
  opacity: '1.0',
  borderWidth: 2,
  showNameplate: true,
  nameplatePosition: 'bottom' as const,
  visionEnabled: false,
  emitsLight: false,
  isLocked: false,
  isHidden: false,
  isVisible: true,
  hasFlying: false,
  hasSwimming: false,
};

export const DEFAULT_FOG_CONFIG = {
  revealedAreas: [],
};

export const DEFAULT_VISION_BLOCKER_CONFIG = {
  shapeType: 'wall' as const,
  pointsData: [
    { x: 0, y: 0 },
    { x: 5, y: 0 },
  ],
  blocksMovement: true,
  blocksVision: true,
  blocksLight: true,
  isOneWay: false,
};

export const DEFAULT_DRAWING_CONFIG = {
  drawingType: 'line' as const,
  pointsData: [
    { x: 0, y: 0 },
    { x: 10, y: 10 },
  ],
  strokeColor: '#FF0000',
  strokeWidth: 2,
  fillOpacity: 0,
  zIndex: 0,
};

export const DEFAULT_TEMPLATE_CONFIG = {
  templateType: 'cone' as const,
  originX: 10.0,
  originY: 10.0,
  direction: 0,
  distance: 15.0,
  color: '#FF0000',
  opacity: 0.5,
  isTemporary: true,
};

// =====================================================
// FACTORY FUNCTIONS
// =====================================================

/**
 * Creates a test campaign for Foundry VTT testing
 */
export async function createTestCampaign(
  userId: string = TEST_USER_ID,
  overrides: Partial<NewCampaign> = {}
): Promise<Campaign> {
  const campaignData: NewCampaign = {
    userId,
    name: 'Test Foundry Campaign',
    description: 'A test campaign for Foundry VTT integration',
    genre: 'Fantasy',
    difficultyLevel: 'Medium',
    status: 'active',
    ...overrides,
  };

  const [campaign] = await db.insert(campaigns).values(campaignData).returning();
  return campaign;
}

/**
 * Creates a test scene with sensible defaults
 */
export async function createTestScene(overrides: Partial<NewScene> = {}): Promise<Scene> {
  // Create campaign if campaignId not provided
  let campaignId = overrides.campaignId;
  if (!campaignId) {
    const campaign = await createTestCampaign();
    campaignId = campaign.id;
  }

  const sceneData: NewScene = {
    ...DEFAULT_SCENE_CONFIG,
    campaignId,
    userId: overrides.userId || TEST_USER_ID,
    ...overrides,
  };

  const [scene] = await db.insert(scenes).values(sceneData).returning();
  return scene;
}

/**
 * Creates a test token with defaults
 */
export async function createTestToken(overrides: Partial<NewToken> = {}): Promise<Token> {
  // Create scene if sceneId not provided
  let sceneId = overrides.sceneId;
  if (!sceneId) {
    const scene = await createTestScene();
    sceneId = scene.id;
  }

  const tokenData: NewToken = {
    ...DEFAULT_TOKEN_CONFIG,
    sceneId,
    createdBy: overrides.createdBy || TEST_USER_ID,
    ...overrides,
  };

  const [token] = await db.insert(tokens).values(tokenData).returning();
  return token;
}

/**
 * Creates fog of war data for a scene
 */
export async function createTestFogOfWar(overrides: Partial<NewFogOfWar> = {}): Promise<FogOfWar> {
  // Create scene if sceneId not provided
  let sceneId = overrides.sceneId;
  if (!sceneId) {
    const scene = await createTestScene();
    sceneId = scene.id;
  }

  const fogData: NewFogOfWar = {
    ...DEFAULT_FOG_CONFIG,
    sceneId,
    userId: overrides.userId || TEST_USER_ID,
    ...overrides,
  };

  const [fog] = await db.insert(fogOfWar).values(fogData).returning();
  return fog;
}

/**
 * Creates a vision blocking shape (wall/door)
 */
export async function createTestVisionBlocker(
  overrides: Partial<NewVisionBlockingShape> = {}
): Promise<VisionBlockingShape> {
  // Create scene if sceneId not provided
  let sceneId = overrides.sceneId;
  if (!sceneId) {
    const scene = await createTestScene();
    sceneId = scene.id;
  }

  const blockerData: NewVisionBlockingShape = {
    ...DEFAULT_VISION_BLOCKER_CONFIG,
    sceneId,
    createdBy: overrides.createdBy || TEST_USER_ID,
    ...overrides,
  };

  const [blocker] = await db.insert(visionBlockingShapes).values(blockerData).returning();
  return blocker;
}

/**
 * Creates a scene drawing
 */
export async function createTestDrawing(overrides: Partial<NewSceneDrawing> = {}): Promise<SceneDrawing> {
  // Create scene if sceneId not provided
  let sceneId = overrides.sceneId;
  if (!sceneId) {
    const scene = await createTestScene();
    sceneId = scene.id;
  }

  const drawingData: NewSceneDrawing = {
    ...DEFAULT_DRAWING_CONFIG,
    sceneId,
    createdBy: overrides.createdBy || TEST_USER_ID,
    ...overrides,
  };

  const [drawing] = await db.insert(sceneDrawings).values(drawingData).returning();
  return drawing;
}

/**
 * Creates a measurement template (AOE)
 */
export async function createTestMeasurementTemplate(
  overrides: Partial<NewMeasurementTemplate> = {}
): Promise<MeasurementTemplate> {
  // Create scene if sceneId not provided
  let sceneId = overrides.sceneId;
  if (!sceneId) {
    const scene = await createTestScene();
    sceneId = scene.id;
  }

  const templateData: NewMeasurementTemplate = {
    ...DEFAULT_TEMPLATE_CONFIG,
    sceneId,
    createdBy: overrides.createdBy || TEST_USER_ID,
    ...overrides,
  };

  const [template] = await db.insert(measurementTemplates).values(templateData).returning();
  return template;
}

/**
 * Creates scene settings for a given scene
 */
export async function createTestSceneSettings(
  sceneId: string,
  overrides: Partial<NewSceneSetting> = {}
): Promise<SceneSetting> {
  const settingsData: NewSceneSetting = {
    sceneId,
    enableFogOfWar: false,
    enableDynamicLighting: false,
    snapToGrid: true,
    gridOpacity: '0.30',
    ambientLightLevel: '1.00',
    darknessLevel: '0.00',
    ...overrides,
  };

  const [settings] = await db.insert(sceneSettings).values(settingsData).returning();
  return settings;
}

// =====================================================
// TEST HELPERS
// =====================================================

/**
 * Creates a complete test scene with tokens, fog of war, and settings
 */
export async function seedTestScene(userId: string = TEST_USER_ID): Promise<{
  campaign: Campaign;
  scene: Scene;
  tokens: Token[];
  fogOfWar: FogOfWar;
  settings: SceneSetting;
  walls: VisionBlockingShape[];
}> {
  // Create campaign
  const campaign = await createTestCampaign(userId);

  // Create scene
  const scene = await createTestScene({
    campaignId: campaign.id,
    userId,
  });

  // Create scene settings
  const settings = await createTestSceneSettings(scene.id, {
    enableFogOfWar: true,
    enableDynamicLighting: true,
  });

  // Create tokens
  const token1 = await createTestToken({
    sceneId: scene.id,
    createdBy: userId,
    name: 'Hero Token',
    tokenType: 'character',
    positionX: '5.0',
    positionY: '5.0',
  });

  const token2 = await createTestToken({
    sceneId: scene.id,
    createdBy: userId,
    name: 'Monster Token',
    tokenType: 'monster',
    positionX: '15.0',
    positionY: '15.0',
  });

  // Create fog of war
  const fog = await createTestFogOfWar({
    sceneId: scene.id,
    userId,
    revealedAreas: [
      {
        id: 'area-1',
        points: [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
          { x: 10, y: 10 },
          { x: 0, y: 10 },
        ],
        revealedAt: new Date().toISOString(),
        isPermanent: true,
      },
    ],
  });

  // Create vision blocking walls
  const wall1 = await createTestVisionBlocker({
    sceneId: scene.id,
    createdBy: userId,
    shapeType: 'wall',
    pointsData: [
      { x: 10, y: 0 },
      { x: 10, y: 20 },
    ],
  });

  const wall2 = await createTestVisionBlocker({
    sceneId: scene.id,
    createdBy: userId,
    shapeType: 'door',
    doorState: 'closed',
    pointsData: [
      { x: 10, y: 10 },
      { x: 12, y: 10 },
    ],
  });

  return {
    campaign,
    scene,
    tokens: [token1, token2],
    fogOfWar: fog,
    settings,
    walls: [wall1, wall2],
  };
}

/**
 * Creates a WebSocket test message
 */
export function createTestWebSocketMessage(type: string, data: any): string {
  return JSON.stringify({
    type,
    data,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Waits for a specific WebSocket message type
 */
export async function waitForWebSocketMessage(
  ws: any,
  messageType: string,
  timeout: number = 5000
): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for message type: ${messageType}`));
    }, timeout);

    const handler = (data: any) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === messageType) {
          clearTimeout(timer);
          ws.off('message', handler);
          resolve(message.data);
        }
      } catch (error) {
        // Ignore parsing errors and continue listening
      }
    };

    ws.on('message', handler);
  });
}

// =====================================================
// DATABASE UTILITIES
// =====================================================

/**
 * Removes all Foundry VTT test data from database
 */
export async function cleanupFoundryTestData(): Promise<void> {
  // Delete in order respecting foreign key constraints
  await db.delete(measurementTemplates).execute();
  await db.delete(sceneDrawings).execute();
  await db.delete(visionBlockingShapes).execute();
  await db.delete(fogOfWar).execute();
  await db.delete(tokens).execute();
  await db.delete(tokenConfigurations).execute();
  await db.delete(sceneSettings).execute();
  await db.delete(sceneLayers).execute();
  await db.delete(scenes).execute();
}

/**
 * Truncates all Foundry VTT tables for a clean slate
 */
export async function clearFoundryTables(): Promise<void> {
  // Use TRUNCATE for faster cleanup (resets sequences)
  await db.execute(sql`TRUNCATE TABLE measurement_templates CASCADE`);
  await db.execute(sql`TRUNCATE TABLE scene_drawings CASCADE`);
  await db.execute(sql`TRUNCATE TABLE vision_blocking_shapes CASCADE`);
  await db.execute(sql`TRUNCATE TABLE fog_of_war CASCADE`);
  await db.execute(sql`TRUNCATE TABLE character_tokens CASCADE`);
  await db.execute(sql`TRUNCATE TABLE tokens CASCADE`);
  await db.execute(sql`TRUNCATE TABLE token_configurations CASCADE`);
  await db.execute(sql`TRUNCATE TABLE scene_settings CASCADE`);
  await db.execute(sql`TRUNCATE TABLE scene_layers CASCADE`);
  await db.execute(sql`TRUNCATE TABLE scenes CASCADE`);
}

/**
 * Wraps a test function with transaction rollback for isolation
 * Note: Requires test framework support for async setup/teardown
 */
export async function withTestDatabase<T>(
  testFn: () => Promise<T>
): Promise<T> {
  // Start a transaction
  return await db.transaction(async (tx) => {
    try {
      // Run the test function
      const result = await testFn();

      // Rollback transaction to clean up
      throw new Error('ROLLBACK');
    } catch (error) {
      if (error instanceof Error && error.message === 'ROLLBACK') {
        // This is our intentional rollback, not a real error
        return undefined as T;
      }
      throw error;
    }
  });
}

/**
 * Removes test data for a specific user
 */
export async function cleanupTestUserFoundryData(userId: string): Promise<void> {
  // Delete user-specific Foundry data
  await db.delete(fogOfWar).where(eq(fogOfWar.userId, userId)).execute();
  await db.delete(scenes).where(eq(scenes.userId, userId)).execute();
  await db.delete(campaigns).where(eq(campaigns.userId, userId)).execute();
}

/**
 * Creates a minimal campaign for testing (without full setup)
 */
export function createMinimalCampaign(
  userId: string = TEST_USER_ID,
  overrides: Partial<NewCampaign> = {}
): NewCampaign {
  return {
    userId,
    name: 'Minimal Test Campaign',
    status: 'active',
    ...overrides,
  };
}

/**
 * Creates a minimal scene for testing (without inserting to DB)
 */
export function createMinimalScene(
  campaignId: string,
  userId: string = TEST_USER_ID,
  overrides: Partial<NewScene> = {}
): NewScene {
  return {
    name: 'Minimal Test Scene',
    campaignId,
    userId,
    width: 20,
    height: 20,
    gridSize: 5,
    gridType: 'square',
    isActive: false,
    ...overrides,
  };
}

/**
 * Creates a minimal token for testing (without inserting to DB)
 */
export function createMinimalToken(
  sceneId: string,
  createdBy: string = TEST_USER_ID,
  overrides: Partial<NewToken> = {}
): NewToken {
  return {
    sceneId,
    createdBy,
    name: 'Minimal Token',
    tokenType: 'character',
    positionX: '0',
    positionY: '0',
    sizeWidth: '1',
    sizeHeight: '1',
    gridSize: 'medium',
    ...overrides,
  };
}
