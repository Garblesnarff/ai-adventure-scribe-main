import { OrbitControls, Text } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Howl } from 'howler';
import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, Play, Volume2 } from 'lucide-react';
import React, { useState, useRef, useEffect, useCallback } from 'react';

import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { DiceEngine, type DiceRollResult } from '../services/dice/DiceEngine';

import type * as THREE from 'three';

import logger from '@/lib/logger';

interface DiceRollEmbedProps {
  expression: string;
  purpose?: string;
  onRoll?: (result: DiceRollResult) => void;
  autoRoll?: boolean;
  showAnimation?: boolean;
  advantage?: boolean;
  disadvantage?: boolean;
}

// Session-scoped degradation flags for 3D dice. Once WebGL context is lost,
// we degrade to 2D/text mode for the rest of the session and warn only once.
let __dice3dDead = false;
let __dice3dWarned = false;

// 3D Dice Component
function Dice3D({
  value,
  isRolling,
  diceType = 20,
}: {
  value?: number;
  isRolling: boolean;
  diceType?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    if (isRolling && meshRef.current) {
      // Animate dice rolling
      const animate = () => {
        if (meshRef.current) {
          meshRef.current.rotation.x += 0.1;
          meshRef.current.rotation.y += 0.1;
          meshRef.current.rotation.z += 0.05;
        }
      };

      const interval = setInterval(animate, 16);
      return () => clearInterval(interval);
    }
  }, [isRolling]);

  // Different dice shapes for different die types
  const getDiceGeometry = (sides: number) => {
    switch (sides) {
      case 4:
        return <tetrahedronGeometry args={[1]} />;
      case 6:
        return <boxGeometry args={[1, 1, 1]} />;
      case 8:
        return <octahedronGeometry args={[1]} />;
      case 10:
        return <coneGeometry args={[1, 1.5, 10]} />;
      case 12:
        return <dodecahedronGeometry args={[1]} />;
      case 20:
        return <icosahedronGeometry args={[1]} />;
      default:
        return <icosahedronGeometry args={[1]} />;
    }
  };

  const getDiceColor = (sides: number) => {
    switch (sides) {
      case 4:
        return '#ff6b6b'; // Red
      case 6:
        return '#4ecdc4'; // Teal
      case 8:
        return '#45b7d1'; // Blue
      case 10:
        return '#96ceb4'; // Green
      case 12:
        return '#ffeaa7'; // Yellow
      case 20:
        return '#dda0dd'; // Purple
      default:
        return '#dda0dd';
    }
  };

  return (
    <mesh ref={meshRef} scale={isRolling ? [1.2, 1.2, 1.2] : [1, 1, 1]}>
      {getDiceGeometry(diceType)}
      <meshStandardMaterial color={getDiceColor(diceType)} roughness={0.3} metalness={0.1} />
      {value && !isRolling && (
        <Text
          position={[0, 0, 0.6]}
          fontSize={0.3}
          color="#2c3e50"
          anchorX="center"
          anchorY="middle"
        >
          {value.toString()}
        </Text>
      )}
    </mesh>
  );
}

// Audio for dice rolling
const createDiceSound = () =>
  new Howl({
    src: ['/sounds/dice-roll.mp3', '/sounds/dice-roll.ogg'],
    volume: 0.5,
    onloaderror: () => {
      // Fallback - use a simple beep or no sound
      logger.debug('Dice roll sound not found, playing silently');
    },
  });

// Map die icons to values
const getDiceIcon = (sides: number) => {
  switch (sides) {
    case 1:
      return Dice1;
    case 2:
      return Dice2;
    case 3:
      return Dice3;
    case 4:
      return Dice4;
    case 5:
      return Dice5;
    case 6:
      return Dice6;
    default:
      return Dice6;
  }
};

export const DiceRollEmbed: React.FC<DiceRollEmbedProps> = ({
  expression,
  purpose,
  onRoll,
  autoRoll = false,
  showAnimation = true,
  advantage = false,
  disadvantage = false,
}) => {
  const [result, setResult] = useState<DiceRollResult | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [hasRolled, setHasRolled] = useState(false);
  const [contextLost, setContextLost] = useState(false);
  const [canvasKey, setCanvasKey] = useState(0);
  const [hasContextLoss, setHasContextLoss] = useState(false);
  const diceSound = useRef<Howl | null>(null);
  const disable3D =
    String((import.meta as any)?.env?.VITE_DISABLE_DICE_3D ?? 'false').toLowerCase() === 'true';
  const threeDEnabled = !disable3D && !__dice3dDead;

  // Handle WebGL context loss and restoration
  const handleCreated = useCallback(({ gl }: { gl: THREE.WebGLRenderer }) => {
    const canvas = gl.domElement as HTMLCanvasElement;
    const onLost = (e: Event) => {
      // Prevent default to allow us to handle loss; permanently degrade for session
      e.preventDefault();
      __dice3dDead = true;
      setContextLost(true);
      setHasContextLoss(true);
      if (!__dice3dWarned) {
        __dice3dWarned = true;
        logger.warn(
          'Dice 3D disabled after WebGL context loss; falling back to 2D/text for this session.',
        );
      }
    };
    const onRestored = () => {
      // We intentionally do not restore 3D once degraded for stability.
      setContextLost(false);
      setCanvasKey((k) => k + 1);
    };

    canvas.addEventListener('webglcontextlost', onLost as any, { passive: false });
    canvas.addEventListener('webglcontextrestored', onRestored as any);

    return () => {
      canvas.removeEventListener('webglcontextlost', onLost as any);
      canvas.removeEventListener('webglcontextrestored', onRestored as any);
    };
  }, []);

  useEffect(() => {
    diceSound.current = createDiceSound();

    if (autoRoll && !hasRolled) {
      handleRoll();
    }

    return () => {
      if (diceSound.current) {
        diceSound.current.unload();
      }
    };
  }, [autoRoll, hasRolled]);

  const handleRoll = async () => {
    if (isRolling) return;

    setIsRolling(true);
    setHasRolled(true);

    // Play sound effect
    if (diceSound.current) {
      try {
        diceSound.current.play();
      } catch (error) {
        // Silently continue if sound fails to play
        logger.debug('Dice sound playback failed, continuing silently');
      }
    }

    // Add rolling animation delay
    setTimeout(
      () => {
        const rollResult = DiceEngine.roll(expression, {
          purpose,
          advantage,
          disadvantage,
        });
        setResult(rollResult);
        setIsRolling(false);

        // Show result briefly (500ms) before calling callback to allow next roll
        setTimeout(() => {
          if (onRoll) {
            onRoll(rollResult);
          }
        }, 500);
      },
      showAnimation ? 1500 : 100,
    );
  };

  const handleRetry3D = () => {
    if (disable3D) return;
    __dice3dDead = false;
    setContextLost(false);
    setHasContextLoss(false);
    setCanvasKey((k) => k + 1);
  };

  const getCriticalityBadge = (result: DiceRollResult) => {
    if (result.critical) {
      return (
        <Badge variant="destructive" className="text-xs">
          Critical Hit!
        </Badge>
      );
    }
    if (result.naturalRoll === 1) {
      return (
        <Badge variant="secondary" className="text-xs">
          Critical Miss
        </Badge>
      );
    }
    return null;
  };

  const getAdvantageIndicator = (result: DiceRollResult) => {
    if (result.advantage) {
      return (
        <Badge variant="default" className="text-xs bg-green-600">
          Advantage
        </Badge>
      );
    }
    if (result.disadvantage) {
      return (
        <Badge variant="outline" className="text-xs border-red-600 text-red-600">
          Disadvantage
        </Badge>
      );
    }
    return null;
  };

  return (
    <Card className="p-4 my-2 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Dice6 className="w-4 h-4 text-purple-600" />
            <span className="font-mono text-sm font-semibold text-purple-800">{expression}</span>
          </div>
          {purpose && (
            <Badge variant="outline" className="text-xs">
              {purpose}
            </Badge>
          )}
        </div>

        {!hasRolled && (
          <Button
            onClick={handleRoll}
            disabled={isRolling}
            size="sm"
            className="flex items-center gap-1"
          >
            <Play className="w-3 h-3" />
            Roll
          </Button>
        )}
      </div>

      {/* 3D Dice Animation (feature-flagged) */}
      {showAnimation && threeDEnabled && hasRolled && (
        <div className="h-24 mb-3 rounded-lg overflow-hidden border border-purple-200">
          {!contextLost ? (
            <Canvas
              key={canvasKey}
              onCreated={handleCreated}
              gl={{
                powerPreference: 'high-performance',
                antialias: true,
                failIfMajorPerformanceCaveat: false,
              }}
              camera={{ position: [0, 0, 5] }}
            >
              <ambientLight intensity={0.5} />
              <pointLight position={[10, 10, 10]} />

              <group position={[0, 0, 0]}>
                {result?.rolls.map((roll, index) => (
                  <Dice3D
                    key={index}
                    value={isRolling ? undefined : roll.value}
                    isRolling={isRolling}
                    diceType={roll.dice}
                  />
                )) || <Dice3D value={undefined} isRolling={isRolling} diceType={20} />}
              </group>

              <OrbitControls enableRotate={false} enableZoom={false} enablePan={false} />
            </Canvas>
          ) : (
            <div className="h-full w-full flex items-center justify-center text-xs text-gray-600 bg-gray-50">
              3D dice disabled after graphics context loss. Using fallback.
            </div>
          )}
        </div>
      )}

      {showAnimation && !threeDEnabled && hasRolled && (
        <div className="h-24 mb-3 rounded-lg overflow-hidden border border-purple-200 flex flex-col items-center justify-center gap-2 text-xs text-gray-600 bg-gray-50">
          <span>3D dice unavailable. Showing results without 3D animation.</span>
          {hasContextLoss && (
            <Button size="xs" variant="outline" onClick={handleRetry3D}>
              Try 3D again
            </Button>
          )}
        </div>
      )}

      {/* Results Display */}
      {result && !isRolling && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-purple-800">{result.total}</span>
              {getCriticalityBadge(result)}
              {getAdvantageIndicator(result)}
            </div>

            <div className="flex items-center gap-1 text-xs text-gray-600">
              <Volume2 className="w-3 h-3" />
              <span>d{result.rolls[0]?.dice || 20}</span>
            </div>
          </div>

          {/* Individual Die Results */}
          {result.rolls.length > 1 && (
            <div className="flex flex-wrap gap-1">
              {result.rolls.map((roll, index) => {
                const DiceIcon = getDiceIcon(Math.min(roll.value, 6));
                return (
                  <div
                    key={index}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                      roll.critical
                        ? 'bg-red-100 text-red-800 border border-red-300'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    <DiceIcon className="w-3 h-3" />
                    <span>{roll.value}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Modifiers */}
          {result.modifiers !== 0 && (
            <div className="text-xs text-gray-600">
              Base: {(result.total || 0) - (result.modifiers || 0)}{' '}
              {(result.modifiers || 0) >= 0 ? '+' : ''}
              {result.modifiers || 0}
            </div>
          )}

          {/* Natural Roll for d20s */}
          {result.naturalRoll && (
            <div className="text-xs text-gray-600">Natural {result.naturalRoll}</div>
          )}
        </div>
      )}

      {isRolling && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
          <span className="ml-2 text-sm text-purple-600">Rolling...</span>
        </div>
      )}
    </Card>
  );
};
