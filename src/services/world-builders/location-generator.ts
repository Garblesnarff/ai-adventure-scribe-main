import { GeminiApiManager } from '../gemini-api-manager';
import { supabase } from '@/integrations/supabase/client';

export interface LocationRequest {
  type: 'settlement' | 'dungeon' | 'wilderness' | 'landmark' | 'building' | 'room';
  size?: 'tiny' | 'small' | 'medium' | 'large' | 'massive';
  purpose?: string; // What the location is for
  atmosphere?: 'peaceful' | 'mysterious' | 'dangerous' | 'sacred' | 'corrupt' | 'bustling';
  connectedTo?: string; // Location ID this connects to
  context: {
    campaignId: string;
    sessionId?: string;
    genre: string;
    currentStory?: string;
    nearbyLocations?: string[];
    playerLevel?: number;
  };
}

export interface GeneratedLocation {
  id?: string;
  name: string;
  description: string;
  type: string;
  atmosphere: string;
  sizeCategory: string;
  keyFeatures: string[];
  inhabitants: string[];
  threats: string[];
  treasures: string[];
  secrets: string[];
  connections: string[];
  lore: string;
  narrativeHooks: string[];
  sensoryDetails: {
    sights: string[];
    sounds: string[];
    smells: string[];
    atmosphere: string;
  };
  mechanics: {
    skillChallenges: string[];
    hiddenElements: string[];
    interactiveFeatures: string[];
  };
  metadata: {
    createdAt: Date;
    campaignId: string;
    sessionId?: string;
    narrativeWeight: number;
    storyArc?: string;
  };
}

export class LocationGenerator {
  private static geminiManager: GeminiApiManager | null = null;

  private static getGeminiManager(): GeminiApiManager {
    if (!this.geminiManager) {
      this.geminiManager = new GeminiApiManager();
    }
    return this.geminiManager;
  }

  /**
   * Generate a detailed location using AI
   */
  static async generateLocation(request: LocationRequest): Promise<GeneratedLocation> {
    try {
      const geminiManager = this.getGeminiManager();
      
      const result = await geminiManager.executeWithRotation(async (genAI) => {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
        
        const prompt = this.buildLocationPrompt(request);
        
        const response = await model.generateContent(prompt);
        const text = await response.response.text();
        
        try {
          // Extract JSON from the response
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (!jsonMatch) {
            throw new Error('No JSON found in location generation response');
          }
          
          const locationData = JSON.parse(jsonMatch[0]);
          
          // Add metadata
          const location: GeneratedLocation = {
            ...locationData,
            id: undefined, // Will be set when saved
            metadata: {
              createdAt: new Date(),
              campaignId: request.context.campaignId,
              sessionId: request.context.sessionId,
              narrativeWeight: this.calculateNarrativeWeight(locationData, request),
              storyArc: request.context.currentStory,
            }
          };
          
          return location;
          
        } catch (parseError) {
          console.error('Failed to parse location JSON:', parseError);
          throw new Error('Failed to generate location: Invalid response format');
        }
      });

      console.log(`🏰 Generated location: ${result.name}`);
      return result;

    } catch (error) {
      console.error('Location generation failed:', error);
      throw new Error(`Failed to generate location: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Build the prompt for location generation
   */
  private static buildLocationPrompt(request: LocationRequest): string {
    const { type, size = 'medium', purpose, atmosphere = 'mysterious', context } = request;
    
    return `
You are a master world builder creating a ${type} for a ${context.genre} D&D campaign. Generate a detailed, immersive location.

REQUIREMENTS:
- Type: ${type}
- Size: ${size}
- Purpose: ${purpose || 'undefined - be creative'}
- Atmosphere: ${atmosphere}
- Player Level: ${context.playerLevel || 'unknown'}
- Campaign Genre: ${context.genre}

${request.context.currentStory ? `CURRENT STORY: ${request.context.currentStory}` : ''}
${request.context.nearbyLocations?.length ? `NEARBY LOCATIONS: ${request.context.nearbyLocations.join(', ')}` : ''}

Generate a location in this EXACT JSON format:
{
  "name": "Location Name",
  "description": "Rich 2-3 paragraph description with atmosphere and mood",
  "type": "${type}",
  "atmosphere": "${atmosphere}",
  "sizeCategory": "${size}",
  "keyFeatures": ["3-5 notable physical features"],
  "inhabitants": ["Who or what lives here - be specific"],
  "threats": ["Dangers present - monsters, traps, hazards"],
  "treasures": ["Valuable items, knowledge, or resources"],
  "secrets": ["Hidden elements players might discover"],
  "connections": ["How this connects to other locations"],
  "lore": "Historical background and significance",
  "narrativeHooks": ["Story opportunities for DM"],
  "sensoryDetails": {
    "sights": ["What players see"],
    "sounds": ["What players hear"],  
    "smells": ["What players smell"],
    "atmosphere": "Overall sensory mood"
  },
  "mechanics": {
    "skillChallenges": ["Required skill checks"],
    "hiddenElements": ["Things requiring investigation"],
    "interactiveFeatures": ["Things players can interact with"]
  }
}

GUIDELINES:
- Make it vivid and immersive
- Include specific, memorable details
- Provide clear hooks for player interaction
- Match the ${context.genre} genre
- Consider player level ${context.playerLevel || 1} for appropriate challenges
- Be creative but grounded in D&D logic
- Include both obvious and subtle elements`;
  }

  /**
   * Calculate narrative importance of location
   */
  private static calculateNarrativeWeight(location: any, request: LocationRequest): number {
    let weight = 5; // Base weight
    
    // Increase weight for story-critical locations
    if (request.context.currentStory && location.narrativeHooks?.length > 2) weight += 2;
    if (location.secrets?.length > 2) weight += 1;
    if (location.type === 'dungeon' || location.type === 'landmark') weight += 1;
    if (request.atmosphere === 'dangerous' || request.atmosphere === 'sacred') weight += 1;
    
    return Math.min(weight, 10);
  }

  /**
   * Save location to database
   */
  static async saveLocation(location: GeneratedLocation): Promise<string> {
    try {
      const locationData = {
        name: location.name,
        description: location.description,
        location_type: location.type,
        campaign_id: location.metadata.campaignId,
        metadata: {
          ...location,
          generatedAt: location.metadata.createdAt.toISOString(),
          generator: 'LocationGenerator',
          version: '1.0'
        }
      };

      const { data, error } = await supabase
        .from('locations')
        .insert(locationData)
        .select('id')
        .single();

      if (error) {
        console.error('Error saving location:', error);
        throw new Error('Failed to save location to database');
      }

      console.log(`💾 Saved location "${location.name}" with ID: ${data.id}`);
      return data.id;

    } catch (error) {
      console.error('Error saving location:', error);
      throw error;
    }
  }

  /**
   * Generate and save a location in one call
   */
  static async createLocation(request: LocationRequest): Promise<GeneratedLocation> {
    const location = await this.generateLocation(request);
    
    try {
      const locationId = await this.saveLocation(location);
      location.id = locationId;
      
      console.log(`✅ Created location "${location.name}" successfully`);
      return location;
      
    } catch (saveError) {
      console.warn('Location generated but failed to save:', saveError);
      // Return the generated location even if save failed
      return location;
    }
  }

  /**
   * Generate a location based on current game context
   */
  static async generateContextualLocation(
    campaignId: string,
    sessionId: string,
    playerAction: string,
    currentLocationId?: string
  ): Promise<GeneratedLocation> {
    try {
      // Security check: Get campaign details and verify user ownership
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const { data: campaign } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .eq('user_id', user.id) // Ensure user owns this campaign
        .single();

      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Determine location type based on player action
      const locationType = this.inferLocationTypeFromAction(playerAction);
      
      const request: LocationRequest = {
        type: locationType,
        size: 'medium',
        atmosphere: 'mysterious',
        context: {
          campaignId,
          sessionId,
          genre: campaign.genre || 'fantasy',
          currentStory: playerAction,
          playerLevel: 1, // TODO: Get from character data
        }
      };

      return await this.createLocation(request);

    } catch (error) {
      console.error('Failed to generate contextual location:', error);
      throw error;
    }
  }

  /**
   * Infer what type of location is needed based on player action
   */
  private static inferLocationTypeFromAction(action: string): LocationRequest['type'] {
    const actionLower = action.toLowerCase();
    
    if (actionLower.includes('enter') || actionLower.includes('building') || actionLower.includes('shop')) {
      return 'building';
    }
    if (actionLower.includes('forest') || actionLower.includes('wilderness') || actionLower.includes('travel')) {
      return 'wilderness';
    }
    if (actionLower.includes('dungeon') || actionLower.includes('cave') || actionLower.includes('underground')) {
      return 'dungeon';
    }
    if (actionLower.includes('town') || actionLower.includes('city') || actionLower.includes('village')) {
      return 'settlement';
    }
    
    // Default to a generic building/room
    return 'room';
  }
}