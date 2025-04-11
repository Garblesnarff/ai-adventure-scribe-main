import { CampaignContext } from '@/types/dm';
import { Character } from '@/types/character';

export class EnvironmentGenerator {
  generateEnvironment(context: CampaignContext, character: Character) {
    const timeOfDay = this.getRandomTimeOfDay();
    const weatherCondition = this.getWeatherBasedOnAtmosphere(context.setting.atmosphere || '');
    
    return {
      description: this.generateDescription(context.setting, timeOfDay, weatherCondition, character),
      atmosphere: context.setting.atmosphere || 'neutral',
      sensoryDetails: this.generateSensoryDetails(context, character)
    };
  }

  private getRandomTimeOfDay(): string {
    const times = ['dawn', 'morning', 'afternoon', 'dusk', 'twilight', 'night'];
    return times[Math.floor(Math.random() * times.length)];
  }

  private getWeatherBasedOnAtmosphere(atmosphere: string): string {
    if (atmosphere.includes('dark') || atmosphere.includes('foreboding')) {
      return 'overcast skies cast long shadows';
    }
    if (atmosphere.includes('mysterious')) {
      return 'a light mist curls around your feet';
    }
    return 'a gentle breeze carries hints of adventure';
  }

  private generateDescription(
    setting: any,
    timeOfDay: string,
    weather: string,
    character: Character
  ): string {
    const magicalDescription = String(character.class).toLowerCase() === 'wizard'
      ? 'Your arcane senses tingle with the presence of latent magical energies.' 
      : '';

    const raceSpecificDesc = this.getRaceSpecificDescription(String(character.race), setting);

    return `*As ${timeOfDay} settles over ${setting?.location || 'the area'}, ${weather}. ${raceSpecificDesc} ${magicalDescription}*`;
  }

  private getRaceSpecificDescription(race: string, setting: any): string {
    switch (race.toLowerCase()) {
      case 'dragonborn':
        return 'Your scales shimmer in the ambient light, drawing curious glances from passersby.';
      case 'elf':
        return 'Your keen elven senses pick up subtle details others might miss.';
      default:
        return 'You take in the surroundings with careful consideration.';
    }
  }

  private generateSensoryDetails(
    context: CampaignContext,
    character: Character
  ): string[] {
    const details = [];
    const atmosphere = context.setting?.atmosphere || 'neutral';
    
    if (atmosphere.includes('mysterious')) {
      details.push('Whispered conversations fade as you pass');
      details.push('The air tingles with untold secrets');
    }
    
    if (atmosphere.includes('dark') || atmosphere.includes('foreboding')) {
      details.push('Shadows seem to move with a life of their own');
      details.push('A chill wind carries echoes of distant sounds');
    }
    
    if (String(character.class).toLowerCase() === 'wizard') {
      details.push('Your magical attunement reveals subtle flows of arcane energy');
    }
    
    return details.length ? details : ['The environment feels ordinary but watchful'];
  }
}