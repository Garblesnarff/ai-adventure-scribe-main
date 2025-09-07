import { Card } from '@/components/ui/card';
import { ScrollText, Eye, Heart, BookOpen, Shield } from 'lucide-react';
import { Character } from '@/types/character';

interface BasicInfoProps {
  character: Character;
}

/**
 * BasicInfo component displays the fundamental character information
 * Including race, class, level, background, and AI-generated details
 * @param character - The character data to display
 */
const BasicInfo = ({ character }: BasicInfoProps) => {
  return (
    <div className="space-y-6">
      {/* Core Stats */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <ScrollText className="w-5 h-5" />
          <h2 className="text-xl font-semibold">Basic Information</h2>
        </div>
        <div className="space-y-2">
          <p><span className="font-medium">Race:</span> {character.race?.name || 'Unknown'}</p>
          <p><span className="font-medium">Class:</span> {character.class?.name || 'Unknown'}</p>
          <p><span className="font-medium">Level:</span> {character.level}</p>
          <p><span className="font-medium">Background:</span> {character.background?.name || (typeof character.background === 'string' ? character.background : 'Unknown')}</p>
          {character.alignment && (
            <p><span className="font-medium">Alignment:</span> {character.alignment}</p>
          )}
        </div>
      </Card>

      {/* AI-Generated Appearance */}
      {character.appearance && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Eye className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold">Appearance</h3>
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">AI Generated</span>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {character.appearance}
          </p>
        </Card>
      )}

      {/* AI-Generated Personality */}
      {character.personality_traits && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Heart className="w-5 h-5 text-rose-600" />
            <h3 className="text-lg font-semibold">Personality</h3>
            <span className="text-xs bg-rose-100 text-rose-800 px-2 py-1 rounded-full">AI Generated</span>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {character.personality_traits}
          </p>
        </Card>
      )}

      {/* AI-Generated Backstory */}
      {character.backstory_elements && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-5 h-5 text-amber-600" />
            <h3 className="text-lg font-semibold">Backstory</h3>
            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full">AI Generated</span>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {character.backstory_elements}
          </p>
        </Card>
      )}

      {/* User-Defined Personality Elements */}
      {character.alignment && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-semibold">Alignment</h3>
            <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full">User Defined</span>
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            {character.alignment}
          </p>
        </Card>
      )}

      {(character.personalityTraits && character.personalityTraits.length > 0) && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Heart className="w-5 h-5 text-rose-600" />
            <h3 className="text-lg font-semibold">Personality Traits</h3>
            <span className="text-xs bg-rose-100 text-rose-800 px-2 py-1 rounded-full">User Defined</span>
          </div>
          <ul className="text-sm space-y-1 text-muted-foreground">
            {character.personalityTraits.map((trait, index) => (
              <li key={index} className="list-disc list-inside">• {trait}</li>
            ))}
          </ul>
        </Card>
      )}

      {((character.ideals && character.ideals.length > 0) || 
        (character.bonds && character.bonds.length > 0) || 
        (character.flaws && character.flaws.length > 0)) && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-5 h-5 text-emerald-600" />
            <h3 className="text-lg font-semibold">Character Motivations</h3>
            <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full">User Defined</span>
          </div>
          
          {character.ideals && character.ideals.length > 0 && (
            <div className="mb-3">
              <h4 className="font-medium text-sm mb-1">Ideals</h4>
              <ul className="text-xs space-y-1 text-muted-foreground">
                {character.ideals.map((ideal, index) => (
                  <li key={index} className="list-disc list-inside">• {ideal}</li>
                ))}
              </ul>
            </div>
          )}
          
          {character.bonds && character.bonds.length > 0 && (
            <div className="mb-3">
              <h4 className="font-medium text-sm mb-1">Bonds</h4>
              <ul className="text-xs space-y-1 text-muted-foreground">
                {character.bonds.map((bond, index) => (
                  <li key={index} className="list-disc list-inside">• {bond}</li>
                ))}
              </ul>
            </div>
          )}
          
          {character.flaws && character.flaws.length > 0 && (
            <div>
              <h4 className="font-medium text-sm mb-1">Flaws</h4>
              <ul className="text-xs space-y-1 text-muted-foreground">
                {character.flaws.map((flaw, index) => (
                  <li key={index} className="list-disc list-inside">• {flaw}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default BasicInfo;
