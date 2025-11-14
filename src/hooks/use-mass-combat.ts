/**
 * useMassCombat Hook
 *
 * Custom hook for managing mass combat state and operations
 */

import { useState, useCallback, useEffect } from 'react';

import type {
  Battlefield,
  CombatRound,
  MassCombatResult,
  TacticalManeuver,
  ArmyCommander,
} from '@/types/massCombat';

import { Army } from '@/types/massCombat';
import {
  simulateCombatRound,
  isBattleEnded,
  calculateCasualties,
  executeTacticalManeuver,
  moveArmy,
  createDefaultCombatResult,
} from '@/utils/massCombat';

interface UseMassCombatProps {
  initialBattlefield: Battlefield;
  onBattleEnd?: (result: MassCombatResult) => void;
}

export const useMassCombat = ({ initialBattlefield, onBattleEnd }: UseMassCombatProps) => {
  const [battlefield, setBattlefield] = useState<Battlefield>(initialBattlefield);
  const [currentRound, setCurrentRound] = useState<CombatRound | null>(null);
  const [battleLog, setBattleLog] = useState<CombatRound[]>([]);
  const [isBattleActive, setIsBattleActive] = useState(false);
  const [battleResult, setBattleResult] = useState<MassCombatResult | null>(null);
  const [selectedArmy, setSelectedArmy] = useState<string | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);

  /**
   * Start the battle
   */
  const startBattle = useCallback(() => {
    setIsBattleActive(true);
    setCurrentRound(null);
    setBattleLog([]);
    setBattleResult(null);
  }, []);

  /**
   * Pause the battle
   */
  const pauseBattle = useCallback(() => {
    setIsBattleActive(false);
  }, []);

  /**
   * Resume the battle
   */
  const resumeBattle = useCallback(() => {
    setIsBattleActive(true);
  }, []);

  /**
   * Execute one round of combat
   */
  const executeCombatRound = useCallback(() => {
    if (!isBattleActive) return;

    const roundNumber = battleLog.length + 1;
    const roundResult = simulateCombatRound(battlefield.armies, battlefield, roundNumber);

    setCurrentRound(roundResult);
    setBattleLog((prev) => [...prev, roundResult]);

    // Update battlefield with new army states
    const updatedArmies = battlefield.armies.map((army) => {
      const statusUpdate = roundResult.armyStatus.find((s) => s.armyId === army.id);
      if (statusUpdate) {
        return {
          ...army,
          status: statusUpdate.status,
          position: statusUpdate.position,
        };
      }
      return army;
    });

    setBattlefield((prev) => ({
      ...prev,
      armies: updatedArmies,
    }));

    // Check if battle has ended
    const battleStatus = isBattleEnded(updatedArmies);
    if (battleStatus.ended) {
      endBattle(battleStatus.victor);
    }
  }, [battlefield, battleLog, isBattleActive]);

  /**
   * End the battle and calculate results
   */
  const endBattle = useCallback(
    (victor: string | null) => {
      setIsBattleActive(false);

      // Calculate casualties
      const casualtyReports = battlefield.armies.map((army) => {
        // Find initial state of army (this would need to be tracked)
        const initialArmy = battlefield.armies.find((a) => a.id === army.id) || army;
        return calculateCasualties(army, initialArmy);
      });

      // Determine surviving armies
      const survivingArmies = battlefield.armies.filter(
        (army) => army.status !== 'destroyed' && army.units.some((unit) => unit.size > 0),
      );

      // Calculate strategic points
      const strategicPoints = victor
        ? survivingArmies
            .find((a) => a.faction === victor)
            ?.units.reduce((sum, unit) => sum + unit.size, 0) || 0
        : 0;

      const result: MassCombatResult = {
        victor,
        survivingArmies,
        casualtyReports,
        battleLog,
        strategicPoints,
      };

      setBattleResult(result);

      if (onBattleEnd) {
        onBattleEnd(result);
      }
    },
    [battlefield, battleLog, onBattleEnd],
  );

  /**
   * Move an army to a new position
   */
  const moveArmyTo = useCallback((armyId: string, x: number, y: number) => {
    setBattlefield((prev) => {
      const updatedArmies = prev.armies.map((army) => {
        if (army.id === armyId) {
          return moveArmy(army, x, y, prev);
        }
        return army;
      });

      return {
        ...prev,
        armies: updatedArmies,
      };
    });
  }, []);

  /**
   * Execute a tactical maneuver
   */
  const executeManeuver = useCallback(
    (maneuver: TacticalManeuver, commander: ArmyCommander, armyId: string) => {
      const army = battlefield.armies.find((a) => a.id === armyId);
      if (!army) return;

      const result = executeTacticalManeuver(maneuver, commander, army);

      // Add event to battle log
      if (currentRound) {
        const updatedRound = {
          ...currentRound,
          events: [
            ...currentRound.events,
            {
              id: `maneuver-${Date.now()}`,
              type: 'special_ability',
              description: result.description,
              affectedArmies: [armyId],
            },
          ],
        };

        setCurrentRound(updatedRound);
        setBattleLog((prev) => {
          const newLog = [...prev];
          newLog[newLog.length - 1] = updatedRound;
          return newLog;
        });
      }

      return result;
    },
    [battlefield, currentRound],
  );

  /**
   * Reset the battle
   */
  const resetBattle = useCallback(() => {
    setBattlefield(initialBattlefield);
    setCurrentRound(null);
    setBattleLog([]);
    setIsBattleActive(false);
    setBattleResult(null);
    setSelectedArmy(null);
    setSelectedUnit(null);
  }, [initialBattlefield]);

  /**
   * Select an army
   */
  const selectArmy = useCallback((armyId: string) => {
    setSelectedArmy(armyId);
  }, []);

  /**
   * Select a unit
   */
  const selectUnit = useCallback((unitId: string) => {
    setSelectedUnit(unitId);
  }, []);

  /**
   * Auto-execute rounds when battle is active
   */
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isBattleActive) {
      interval = setInterval(() => {
        executeCombatRound();
      }, 3000); // Execute round every 3 seconds
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isBattleActive, executeCombatRound]);

  return {
    // State
    battlefield,
    currentRound,
    battleLog,
    isBattleActive,
    battleResult,
    selectedArmy,
    selectedUnit,

    // Actions
    startBattle,
    pauseBattle,
    resumeBattle,
    executeCombatRound,
    endBattle,
    moveArmyTo,
    executeManeuver,
    resetBattle,
    selectArmy,
    selectUnit,
  };
};
