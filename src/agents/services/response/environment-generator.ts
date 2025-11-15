/**
 * EnvironmentGenerator
 *
 * Generates environment descriptions, atmosphere, and sensory details
 * for the AI Dungeon Master based on campaign context and character details.
 *
 * Main Class:
 * - EnvironmentGenerator: Creates descriptive environmental narratives.
 *
 * Dependencies:
 * - CampaignContext type (from `@/types/dm`)
 * - Character type (from `@/types/character`)
 *
 * @author AI Dungeon Master Team
 */

// Project Types
import { Character } from '@/types/character';
import { CampaignContext } from '@/types/dm';

export class EnvironmentGenerator {
  generateEnvironment(context: CampaignContext, character: Character) {
    const timeOfDay = this.getRandomTimeOfDay();
    const weatherCondition = this.getWeatherBasedOnAtmosphere(context.setting?.atmosphere || ''); // Added null check for context.setting

    return {
      description: this.generateDescription(
        context.setting,
        timeOfDay,
        weatherCondition,
        character,
      ),
      atmosphere: context.setting?.atmosphere || 'neutral', // Added null check
      sensoryDetails: this.generateSensoryDetails(context, character),
    };
  }

  private getRandomTimeOfDay(): string {
    const times = ['dawn', 'morning', 'afternoon', 'dusk', 'twilight', 'night'];
    return times[Math.floor(Math.random() * times.length)];
  }

  private getWeatherBasedOnAtmosphere(atmosphere: string): string {
    const lowerAtmosphere = atmosphere.toLowerCase();
    if (lowerAtmosphere.includes('dark') || lowerAtmosphere.includes('foreboding')) {
      return 'overcast skies cast long shadows';
    }
    if (lowerAtmosphere.includes('mysterious')) {
      return 'a light mist curls around your feet';
    }
    return 'a gentle breeze carries hints of adventure';
  }

  private generateDescription(
    setting: CampaignContext['setting'] | undefined, // Made setting potentially undefined
    timeOfDay: string,
    weather: string,
    character: Character,
  ): string {
    // Ensure character.class and character.race are treated as potentially complex objects or strings
    const characterClassString =
      typeof character.class === 'string' ? character.class : character.class?.name;
    const characterRaceString =
      typeof character.race === 'string' ? character.race : character.race?.name;

    const magicalDescription =
      characterClassString?.toLowerCase() === 'wizard'
        ? 'Your arcane senses tingle with the presence of latent magical energies.'
        : '';

    const raceSpecificDesc = this.getRaceSpecificDescription(characterRaceString || '', setting);

    return `*As ${timeOfDay} settles over ${setting?.location || 'the area'}, ${weather}. ${raceSpecificDesc} ${magicalDescription}*`;
  }

  private getRaceSpecificDescription(
    raceName: string,
    setting: CampaignContext['setting'] | undefined,
  ): string {
    switch (raceName.toLowerCase()) {
      case 'dragonborn':
        return 'Your scales shimmer in the ambient light, drawing curious glances from passersby.';
      case 'elf':
        return 'Your keen elven senses pick up subtle details others might miss.';
      default:
        return 'You take in the surroundings with careful consideration.';
    }
  }

  private generateSensoryDetails(context: CampaignContext, character: Character): string[] {
    const details = [];
    const atmosphere = context.setting?.atmosphere?.toLowerCase() || 'neutral'; // Added null check and toLowerCase
    const characterClassString =
      typeof character.class === 'string' ? character.class : character.class?.name;

    if (atmosphere.includes('mysterious')) {
      details.push('Whispered conversations fade as you pass');
      details.push('The air tingles with untold secrets');
    }

    if (atmosphere.includes('dark') || atmosphere.includes('foreboding')) {
      details.push('Shadows seem to move with a life of their own');
      details.push('A chill wind carries echoes of distant sounds');
    }

    if (characterClassString?.toLowerCase() === 'wizard') {
      details.push('Your magical attunement reveals subtle flows of arcane energy');
    }

    return details.length > 0 ? details : ['The environment feels ordinary but watchful.'];
  }
}
