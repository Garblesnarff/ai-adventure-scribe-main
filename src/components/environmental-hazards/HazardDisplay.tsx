/**
 * HazardDisplay Component
 * 
 * Component for displaying and interacting with environmental hazards
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ShieldAlert, 
  Eye, 
  Zap, 
  Thermometer, 
  Wind, 
  Mountain,
  Waves,
  ZapIcon
} from 'lucide-react';
import { 
  EnvironmentalHazard, 
  HazardDetectionResult, 
  HazardSaveResult 
} from '@/types/environmentalHazards';
import { useEnvironmentalHazards } from '@/hooks/use-environmental-hazards';
import { Character } from '@/types/character';

interface HazardDisplayProps {
  character: Character;
  onCharacterUpdate: (updatedCharacter: Character) => void;
}

const HazardDisplay: React.FC<HazardDisplayProps> = ({ character, onCharacterUpdate }) => {
  const {
    activeHazards,
    detectHazardById,
    triggerHazard,
    applyHazardEffectsToCharacter,
    getHazardInteractionStatus
  } = useEnvironmentalHazards(character);
  
  const [detectionResults, setDetectionResults] = useState<Record<string, HazardDetectionResult>>({});
  const [saveResults, setSaveResults] = useState<Record<string, HazardSaveResult>>({});

  const handleDetectHazard = async (hazardId: string) => {
    const result = await detectHazardById(hazardId);
    setDetectionResults(prev => ({
      ...prev,
      [hazardId]: result
    }));
  };

  const handleTriggerHazard = async (hazardId: string) => {
    const result = await triggerHazard(hazardId);
    setSaveResults(prev => ({
      ...prev,
      [hazardId]: result
    }));
    
    // Apply effects to character
    const updatedCharacter = applyHazardEffectsToCharacter(hazardId, result);
    onCharacterUpdate(updatedCharacter);
  };

  const getHazardIcon = (type: string) => {
    switch (type) {
      case 'acid_pool':
      case 'caustic_fog':
      case 'toxic_waste':
        return <Waves className="w-4 h-4" />;
      case 'extreme_heat':
      case 'fiery_pit':
      case 'lava_flow':
        return <Thermometer className="w-4 h-4" />;
      case 'extreme_cold':
      case 'freezing_water':
        return <Wind className="w-4 h-4" />;
      case 'electrified_surface':
      case 'lightning_storm':
        return <ZapIcon className="w-4 h-4" />;
      case 'crushing_walls':
      case 'falling_rocks':
        return <Mountain className="w-4 h-4" />;
      default:
        return <ShieldAlert className="w-4 h-4" />;
    }
  };

  const getHazardColor = (type: string) => {
    switch (type) {
      case 'acid_pool':
      case 'caustic_fog':
      case 'toxic_waste':
        return 'border-green-500';
      case 'extreme_heat':
      case 'fiery_pit':
      case 'lava_flow':
        return 'border-red-500';
      case 'extreme_cold':
      case 'freezing_water':
        return 'border-blue-500';
      case 'electrified_surface':
      case 'lightning_storm':
        return 'border-yellow-500';
      default:
        return 'border-gray-500';
    }
  };

  if (activeHazards.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5" />
            Environmental Hazards
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            No active environmental hazards in the area.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5" />
          Environmental Hazards
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activeHazards.map((hazard) => {
            const interactionStatus = getHazardInteractionStatus(hazard.id);
            const detectionResult = detectionResults[hazard.id];
            const saveResult = saveResults[hazard.id];
            
            return (
              <div 
                key={hazard.id} 
                className={`border rounded-lg p-4 ${getHazardColor(hazard.type)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {getHazardIcon(hazard.type)}
                    <div>
                      <h3 className="font-semibold flex items-center gap-2">
                        {hazard.name}
                        {hazard.isHidden && (
                          <Badge variant="outline" className="text-xs">
                            Hidden
                          </Badge>
                        )}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {hazard.description}
                      </p>
                      
                      {detectionResult && (
                        <div className={`mt-2 text-sm ${
                          detectionResult.detected ? 'text-green-600' : 'text-red-600'
                        }`}>
                          <span className="font-medium">
                            {detectionResult.detected ? 'Detected!' : 'Not detected'}
                          </span>
                          {detectionResult.rollResult && (
                            <span className="ml-2">
                              (Rolled {detectionResult.rollResult} vs DC {detectionResult.dc})
                            </span>
                          )}
                        </div>
                      )}
                      
                      {saveResult && (
                        <div className={`mt-2 text-sm ${
                          saveResult.saved ? 'text-green-600' : 'text-red-600'
                        }`}>
                          <span className="font-medium">
                            {saveResult.saved ? 'Saved!' : 'Failed save'}
                          </span>
                          {saveResult.rollResult && (
                            <span className="ml-2">
                              (Rolled {saveResult.rollResult} vs DC {saveResult.dc})
                            </span>
                          )}
                          {saveResult.damageTaken !== undefined && (
                            <div className="mt-1">
                              <span className="font-medium">
                                Damage: {saveResult.damageTaken}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    {!interactionStatus.detected && hazard.isHidden && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDetectHazard(hazard.id)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Detect
                      </Button>
                    )}
                    
                    {(!interactionStatus.triggered || !hazard.isInstant) && (
                      <Button
                        size="sm"
                        onClick={() => handleTriggerHazard(hazard.id)}
                        disabled={!interactionStatus.detected && hazard.isHidden}
                      >
                        <Zap className="w-4 h-4 mr-2" />
                        {hazard.isInstant ? 'Trigger' : 'Interact'}
                      </Button>
                    )}
                  </div>
                </div>
                
                {hazard.saveDC && (
                  <div className="mt-3 text-xs text-muted-foreground">
                    <span>DC {hazard.saveDC} {hazard.saveAbility?.toUpperCase()} save</span>
                    {hazard.damage && (
                      <span className="ml-2">
                        {hazard.damage.dice} {hazard.damage.type} damage
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default HazardDisplay;