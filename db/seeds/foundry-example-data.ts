/**
 * Foundry VTT Example Battle Maps Seed Data
 *
 * This script creates example campaigns, scenes, tokens, and related data
 * for demonstrating Foundry VTT integration features.
 *
 * Usage: npm run seed:foundry
 */

import 'dotenv/config';
import { db } from '../client.js';
import { campaigns, scenes, sceneSettings, sceneLayers, tokens, visionBlockingShapes } from '../schema/index.js';
import { eq, and } from 'drizzle-orm';

// Example user ID - this should match your test user in the database
const EXAMPLE_USER_ID = 'example-user-foundry-seed';

// Define seed data
const campaignData = {
  name: 'Foundry VTT Demo Campaign',
  description: 'Example campaign showcasing Foundry VTT integration features including battle maps, tokens, fog of war, and vision systems.',
  genre: 'High Fantasy',
  difficultyLevel: 'Medium',
  campaignLength: 'Short',
  tone: 'Balanced',
  status: 'active',
  userId: EXAMPLE_USER_ID,
};

const scenesData = [
  {
    name: 'Tavern Brawl',
    description: 'A rowdy tavern where a bar fight has broken out. Tables and chairs provide cover.',
    width: 15,
    height: 15,
    gridSize: 5,
    gridType: 'square',
    gridColor: '#000000',
    backgroundImageUrl: 'https://example.com/tavern-bg.jpg',
    isActive: false,
    settings: {
      enableFogOfWar: true,
      enableDynamicLighting: true,
      snapToGrid: true,
      gridOpacity: '0.30',
      ambientLightLevel: '0.80',
      darknessLevel: '0.20',
      weatherEffects: null,
      timeOfDay: 'evening',
    },
    tokens: [
      {
        name: 'Baran the Fighter',
        tokenType: 'character',
        positionX: '2.0',
        positionY: '2.0',
        sizeWidth: '1.0',
        sizeHeight: '1.0',
        gridSize: 'medium',
        borderColor: '#00FF00',
        borderWidth: 3,
        visionEnabled: true,
        visionRange: '60.0',
        visionAngle: '360.0',
        nightVision: false,
        emitsLight: true,
        lightRange: '40.0',
        brightLightRange: '20.0',
        dimLightRange: '40.0',
        lightColor: '#FFD700',
        lightIntensity: '0.80',
        movementSpeed: 30,
      },
      {
        name: 'Elara the Wizard',
        tokenType: 'character',
        positionX: '3.0',
        positionY: '2.0',
        sizeWidth: '1.0',
        sizeHeight: '1.0',
        gridSize: 'medium',
        borderColor: '#0000FF',
        borderWidth: 3,
        visionEnabled: true,
        visionRange: '60.0',
        visionAngle: '360.0',
        nightVision: false,
        emitsLight: true,
        lightRange: '20.0',
        brightLightRange: '10.0',
        dimLightRange: '20.0',
        lightColor: '#9370DB',
        lightIntensity: '0.60',
        movementSpeed: 30,
      },
      {
        name: 'Drunken Patron',
        tokenType: 'npc',
        positionX: '7.0',
        positionY: '7.0',
        sizeWidth: '1.0',
        sizeHeight: '1.0',
        gridSize: 'medium',
        borderColor: '#FFFF00',
        borderWidth: 2,
        visionEnabled: false,
        movementSpeed: 30,
      },
      {
        name: 'Bandit Leader',
        tokenType: 'monster',
        positionX: '12.0',
        positionY: '12.0',
        sizeWidth: '1.0',
        sizeHeight: '1.0',
        gridSize: 'medium',
        borderColor: '#FF0000',
        borderWidth: 3,
        visionEnabled: true,
        visionRange: '60.0',
        visionAngle: '360.0',
        nightVision: false,
        movementSpeed: 30,
      },
      {
        name: 'Bandit',
        tokenType: 'monster',
        positionX: '11.0',
        positionY: '10.0',
        sizeWidth: '1.0',
        sizeHeight: '1.0',
        gridSize: 'medium',
        borderColor: '#FF0000',
        borderWidth: 2,
        visionEnabled: true,
        visionRange: '60.0',
        visionAngle: '360.0',
        movementSpeed: 30,
      },
    ],
    walls: [
      {
        shapeType: 'wall' as const,
        pointsData: [
          { x: 0, y: 0 },
          { x: 15, y: 0 },
        ],
        blocksMovement: true,
        blocksVision: true,
        blocksLight: true,
      },
      {
        shapeType: 'wall' as const,
        pointsData: [
          { x: 15, y: 0 },
          { x: 15, y: 15 },
        ],
        blocksMovement: true,
        blocksVision: true,
        blocksLight: true,
      },
      {
        shapeType: 'wall' as const,
        pointsData: [
          { x: 15, y: 15 },
          { x: 0, y: 15 },
        ],
        blocksMovement: true,
        blocksVision: true,
        blocksLight: true,
      },
      {
        shapeType: 'wall' as const,
        pointsData: [
          { x: 0, y: 15 },
          { x: 0, y: 0 },
        ],
        blocksMovement: true,
        blocksVision: true,
        blocksLight: true,
      },
      {
        shapeType: 'door' as const,
        pointsData: [
          { x: 7, y: 0 },
          { x: 8, y: 0 },
        ],
        blocksMovement: false,
        blocksVision: false,
        blocksLight: false,
        doorState: 'open' as const,
      },
    ],
  },
  {
    name: 'Forest Encounter',
    description: 'A dense forest clearing where goblin raiders have set up camp.',
    width: 20,
    height: 20,
    gridSize: 5,
    gridType: 'hexagonal_horizontal',
    gridColor: '#2D5016',
    backgroundImageUrl: 'https://example.com/forest-bg.jpg',
    isActive: false,
    settings: {
      enableFogOfWar: true,
      enableDynamicLighting: true,
      snapToGrid: true,
      gridOpacity: '0.25',
      ambientLightLevel: '0.60',
      darknessLevel: '0.40',
      weatherEffects: 'light_rain',
      timeOfDay: 'dusk',
    },
    tokens: [
      {
        name: 'Ranger Scout',
        tokenType: 'character',
        positionX: '3.0',
        positionY: '3.0',
        sizeWidth: '1.0',
        sizeHeight: '1.0',
        gridSize: 'medium',
        borderColor: '#228B22',
        borderWidth: 3,
        visionEnabled: true,
        visionRange: '120.0',
        visionAngle: '360.0',
        nightVision: true,
        darkvisionRange: '60.0',
        movementSpeed: 35,
      },
      {
        name: 'Paladin',
        tokenType: 'character',
        positionX: '4.0',
        positionY: '3.0',
        sizeWidth: '1.0',
        sizeHeight: '1.0',
        gridSize: 'medium',
        borderColor: '#FFD700',
        borderWidth: 3,
        visionEnabled: true,
        visionRange: '60.0',
        visionAngle: '360.0',
        emitsLight: true,
        lightRange: '30.0',
        brightLightRange: '15.0',
        dimLightRange: '30.0',
        lightColor: '#FFFFFF',
        lightIntensity: '0.90',
        movementSpeed: 30,
      },
      {
        name: 'Goblin Chief',
        tokenType: 'monster',
        positionX: '15.0',
        positionY: '15.0',
        sizeWidth: '1.0',
        sizeHeight: '1.0',
        gridSize: 'small',
        borderColor: '#8B0000',
        borderWidth: 3,
        visionEnabled: true,
        visionRange: '60.0',
        visionAngle: '360.0',
        nightVision: true,
        darkvisionRange: '60.0',
        movementSpeed: 30,
      },
      {
        name: 'Goblin Warrior',
        tokenType: 'monster',
        positionX: '14.0',
        positionY: '16.0',
        sizeWidth: '1.0',
        sizeHeight: '1.0',
        gridSize: 'small',
        borderColor: '#FF4500',
        borderWidth: 2,
        visionEnabled: true,
        visionRange: '60.0',
        visionAngle: '360.0',
        nightVision: true,
        darkvisionRange: '60.0',
        movementSpeed: 30,
      },
      {
        name: 'Forest Spirit',
        tokenType: 'npc',
        positionX: '10.0',
        positionY: '10.0',
        sizeWidth: '1.0',
        sizeHeight: '1.0',
        gridSize: 'medium',
        borderColor: '#00FF7F',
        borderWidth: 2,
        opacity: '0.70',
        emitsLight: true,
        lightRange: '25.0',
        brightLightRange: '12.0',
        dimLightRange: '25.0',
        lightColor: '#7FFF00',
        lightIntensity: '0.50',
        movementSpeed: 40,
        hasFlying: true,
      },
    ],
    walls: [
      {
        shapeType: 'terrain' as const,
        pointsData: [
          { x: 5, y: 5 },
          { x: 8, y: 5 },
          { x: 8, y: 8 },
          { x: 5, y: 8 },
        ],
        blocksMovement: true,
        blocksVision: false,
        blocksLight: false,
      },
      {
        shapeType: 'terrain' as const,
        pointsData: [
          { x: 12, y: 12 },
          { x: 16, y: 12 },
          { x: 16, y: 16 },
          { x: 12, y: 16 },
        ],
        blocksMovement: true,
        blocksVision: false,
        blocksLight: false,
      },
    ],
  },
  {
    name: 'Dungeon Chamber',
    description: 'An ancient dungeon chamber with mysterious runes and hidden dangers.',
    width: 25,
    height: 20,
    gridSize: 5,
    gridType: 'square',
    gridColor: '#1C1C1C',
    backgroundImageUrl: 'https://example.com/dungeon-bg.jpg',
    isActive: false,
    settings: {
      enableFogOfWar: true,
      enableDynamicLighting: true,
      snapToGrid: true,
      gridOpacity: '0.35',
      ambientLightLevel: '0.10',
      darknessLevel: '0.90',
      weatherEffects: null,
      timeOfDay: 'underground',
    },
    tokens: [
      {
        name: 'Dwarf Cleric',
        tokenType: 'character',
        positionX: '2.0',
        positionY: '10.0',
        sizeWidth: '1.0',
        sizeHeight: '1.0',
        gridSize: 'medium',
        borderColor: '#C0C0C0',
        borderWidth: 3,
        visionEnabled: true,
        visionRange: '60.0',
        visionAngle: '360.0',
        nightVision: true,
        darkvisionRange: '60.0',
        emitsLight: true,
        lightRange: '40.0',
        brightLightRange: '20.0',
        dimLightRange: '40.0',
        lightColor: '#FFD700',
        lightIntensity: '0.85',
        movementSpeed: 25,
      },
      {
        name: 'Rogue',
        tokenType: 'character',
        positionX: '3.0',
        positionY: '11.0',
        sizeWidth: '1.0',
        sizeHeight: '1.0',
        gridSize: 'medium',
        borderColor: '#708090',
        borderWidth: 3,
        visionEnabled: true,
        visionRange: '120.0',
        visionAngle: '360.0',
        nightVision: true,
        darkvisionRange: '60.0',
        movementSpeed: 30,
      },
      {
        name: 'Beholder',
        tokenType: 'monster',
        positionX: '20.0',
        positionY: '10.0',
        sizeWidth: '2.0',
        sizeHeight: '2.0',
        gridSize: 'large',
        borderColor: '#8B008B',
        borderWidth: 4,
        visionEnabled: true,
        visionRange: '120.0',
        visionAngle: '360.0',
        nightVision: true,
        darkvisionRange: '120.0',
        movementSpeed: 0,
        hasFlying: true,
      },
      {
        name: 'Skeleton Warrior',
        tokenType: 'monster',
        positionX: '15.0',
        positionY: '8.0',
        sizeWidth: '1.0',
        sizeHeight: '1.0',
        gridSize: 'medium',
        borderColor: '#DCDCDC',
        borderWidth: 2,
        visionEnabled: true,
        visionRange: '60.0',
        visionAngle: '360.0',
        nightVision: true,
        darkvisionRange: '60.0',
        movementSpeed: 30,
      },
      {
        name: 'Skeleton Archer',
        tokenType: 'monster',
        positionX: '15.0',
        positionY: '12.0',
        sizeWidth: '1.0',
        sizeHeight: '1.0',
        gridSize: 'medium',
        borderColor: '#DCDCDC',
        borderWidth: 2,
        visionEnabled: true,
        visionRange: '60.0',
        visionAngle: '360.0',
        nightVision: true,
        darkvisionRange: '60.0',
        movementSpeed: 30,
      },
    ],
    walls: [
      // Outer walls
      {
        shapeType: 'wall' as const,
        pointsData: [
          { x: 0, y: 0 },
          { x: 25, y: 0 },
        ],
        blocksMovement: true,
        blocksVision: true,
        blocksLight: true,
      },
      {
        shapeType: 'wall' as const,
        pointsData: [
          { x: 25, y: 0 },
          { x: 25, y: 20 },
        ],
        blocksMovement: true,
        blocksVision: true,
        blocksLight: true,
      },
      {
        shapeType: 'wall' as const,
        pointsData: [
          { x: 25, y: 20 },
          { x: 0, y: 20 },
        ],
        blocksMovement: true,
        blocksVision: true,
        blocksLight: true,
      },
      {
        shapeType: 'wall' as const,
        pointsData: [
          { x: 0, y: 20 },
          { x: 0, y: 0 },
        ],
        blocksMovement: true,
        blocksVision: true,
        blocksLight: true,
      },
      // Inner dividing wall
      {
        shapeType: 'wall' as const,
        pointsData: [
          { x: 12, y: 5 },
          { x: 12, y: 8 },
        ],
        blocksMovement: true,
        blocksVision: true,
        blocksLight: true,
      },
      {
        shapeType: 'wall' as const,
        pointsData: [
          { x: 12, y: 12 },
          { x: 12, y: 15 },
        ],
        blocksMovement: true,
        blocksVision: true,
        blocksLight: true,
      },
      // Doors
      {
        shapeType: 'door' as const,
        pointsData: [
          { x: 12, y: 8 },
          { x: 12, y: 12 },
        ],
        blocksMovement: false,
        blocksVision: true,
        blocksLight: true,
        doorState: 'closed' as const,
      },
    ],
  },
];

/**
 * Main seed function
 */
export async function seedFoundryData() {
  try {
    console.log('🎲 Starting Foundry VTT example data seeding...\n');

    // 1. Create or get example campaign
    console.log('📖 Creating example campaign...');
    let campaign = await db
      .select()
      .from(campaigns)
      .where(and(
        eq(campaigns.name, campaignData.name),
        eq(campaigns.userId, EXAMPLE_USER_ID)
      ))
      .limit(1);

    let campaignId: string;

    if (campaign.length === 0) {
      const [newCampaign] = await db.insert(campaigns).values(campaignData).returning();
      campaignId = newCampaign!.id;
      console.log(`✅ Created campaign: "${campaignData.name}" (ID: ${campaignId})`);
    } else {
      campaignId = campaign[0]!.id;
      console.log(`✅ Campaign already exists: "${campaignData.name}" (ID: ${campaignId})`);
    }

    // 2. Create scenes with all related data
    for (const sceneData of scenesData) {
      console.log(`\n🗺️  Processing scene: "${sceneData.name}"...`);

      // Check if scene already exists
      const existingScene = await db
        .select()
        .from(scenes)
        .where(and(
          eq(scenes.name, sceneData.name),
          eq(scenes.campaignId, campaignId)
        ))
        .limit(1);

      if (existingScene.length > 0) {
        console.log(`⏭️  Scene "${sceneData.name}" already exists, skipping...`);
        continue;
      }

      // Create scene
      const [newScene] = await db.insert(scenes).values({
        name: sceneData.name,
        description: sceneData.description,
        campaignId,
        userId: EXAMPLE_USER_ID,
        width: sceneData.width,
        height: sceneData.height,
        gridSize: sceneData.gridSize,
        gridType: sceneData.gridType,
        gridColor: sceneData.gridColor,
        backgroundImageUrl: sceneData.backgroundImageUrl,
        isActive: sceneData.isActive,
      }).returning();

      console.log(`  ✅ Created scene (ID: ${newScene!.id})`);

      // Create scene settings
      await db.insert(sceneSettings).values({
        sceneId: newScene!.id,
        ...sceneData.settings,
      });
      console.log(`  ✅ Created scene settings`);

      // Create scene layers
      const layerTypes = ['background', 'grid', 'tokens', 'effects', 'drawings', 'ui'];
      for (let i = 0; i < layerTypes.length; i++) {
        await db.insert(sceneLayers).values({
          sceneId: newScene!.id,
          layerType: layerTypes[i]!,
          zIndex: i,
          isVisible: true,
          opacity: '1.00',
          locked: false,
        });
      }
      console.log(`  ✅ Created ${layerTypes.length} scene layers`);

      // Create tokens
      for (const tokenData of sceneData.tokens) {
        await db.insert(tokens).values({
          sceneId: newScene!.id,
          createdBy: EXAMPLE_USER_ID,
          ...tokenData,
        });
      }
      console.log(`  ✅ Created ${sceneData.tokens.length} tokens`);

      // Create vision blocking shapes (walls, doors, etc.)
      for (const wall of sceneData.walls) {
        await db.insert(visionBlockingShapes).values({
          sceneId: newScene!.id,
          createdBy: EXAMPLE_USER_ID,
          ...wall,
        });
      }
      console.log(`  ✅ Created ${sceneData.walls.length} vision blocking shapes`);
    }

    console.log('\n🎉 Foundry VTT example data seeding completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   • Campaign: 1 created/verified`);
    console.log(`   • Scenes: ${scenesData.length} processed`);
    console.log(`   • Total tokens: ${scenesData.reduce((sum, s) => sum + s.tokens.length, 0)}`);
    console.log(`   • Total walls: ${scenesData.reduce((sum, s) => sum + s.walls.length, 0)}`);
    console.log(`   • User ID: ${EXAMPLE_USER_ID}\n`);
  } catch (error) {
    console.error('❌ Error seeding Foundry VTT data:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedFoundryData()
    .then(() => {
      console.log('Seed script finished.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seed script failed:', error);
      process.exit(1);
    });
}
