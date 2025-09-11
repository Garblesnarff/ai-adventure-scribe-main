/**
 * MassCombatManager Component
 * 
 * Component for managing and visualizing mass combat between armies
 */

import React, { useState, useEffect } from 'react';
import { 
  Army, 
  Battlefield, 
  CombatRound, 
  MassCombatResult,
  ArmyUnit
} from '@/types/massCombat';
import { useMassCombat } from '@/hooks/use-mass-combat';
import { commonBattlefields } from '@/types/massCombat';

interface MassCombatManagerProps {
  onClose: () => void;
}

export const MassCombatManager: React.FC<MassCombatManagerProps> = ({ onClose }) => {
  const [selectedBattlefield, setSelectedBattlefield] = useState<Battlefield>(commonBattlefields[0]);
  const [armies, setArmies] = useState<Army[]>([]);
  const [newArmy, setNewArmy] = useState<Omit<Army, 'id'>>({
    name: '',
    faction: '',
    commander: '',
    units: [],
    supplies: 100,
    position: { x: 0, y: 0 },
    status: 'active'
  });
  
  const {
    battlefield,
    currentRound,
    battleLog,
    isBattleActive,
    battleResult,
    selectedArmy,
    startBattle,
    pauseBattle,
    resumeBattle,
    executeCombatRound,
    resetBattle,
    selectArmy,
    moveArmyTo
  } = useMassCombat({
    initialBattlefield: selectedBattlefield,
    onBattleEnd: (result) => {
      console.log('Battle ended:', result);
    }
  });
  
  // Initialize with selected battlefield
  useEffect(() => {
    setArmies(selectedBattlefield.armies);
  }, [selectedBattlefield]);
  
  const handleAddArmy = () => {
    if (!newArmy.name || !newArmy.faction || !newArmy.commander) return;
    
    const army: Army = {
      ...newArmy,
      id: `army-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    };
    
    setArmies(prev => [...prev, army]);
    
    // Reset form
    setNewArmy({
      name: '',
      faction: '',
      commander: '',
      units: [],
      supplies: 100,
      position: { x: 0, y: 0 },
      status: 'active'
    });
  };
  
  const handleRemoveArmy = (armyId: string) => {
    setArmies(prev => prev.filter(army => army.id !== armyId));
  };
  
  const handleAddUnit = (armyId: string, unit: Omit<ArmyUnit, 'id'>) => {
    const unitWithId: ArmyUnit = {
      ...unit,
      id: `unit-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    };
    
    setArmies(prev => prev.map(army => 
      army.id === armyId 
        ? { ...army, units: [...army.units, unitWithId] } 
        : army
    ));
  };
  
  const handleStartBattle = () => {
    const battlefieldWithArmies: Battlefield = {
      ...selectedBattlefield,
      armies
    };
    
    // Update the useMassCombat hook with the new battlefield
    resetBattle();
    startBattle();
  };
  
  const renderBattlefield = () => {
    return (
      <div className="battlefield-view">
        <h3>{battlefield.name}</h3>
        <div className="battlefield-grid" style={{
          width: battlefield.dimensions.width,
          height: battlefield.dimensions.height,
          position: 'relative',
          border: '2px solid #333',
          backgroundColor: getTerrainColor(battlefield.terrain)
        }}>
          {armies.map(army => (
            <div
              key={army.id}
              className={`army-marker ${selectedArmy === army.id ? 'selected' : ''}`}
              style={{
                position: 'absolute',
                left: army.position.x,
                top: army.position.y,
                width: 20,
                height: 20,
                backgroundColor: getFactionColor(army.faction),
                borderRadius: '50%',
                cursor: 'pointer',
                border: '2px solid white'
              }}
              onClick={() => selectArmy(army.id)}
              title={`${army.name} (${army.faction})`}
            />
          ))}
          
          {battlefield.obstacles?.map(obstacle => (
            <div
              key={obstacle.id}
              className="obstacle"
              style={{
                position: 'absolute',
                left: obstacle.position.x,
                top: obstacle.position.y,
                width: obstacle.size.width,
                height: obstacle.size.height,
                backgroundColor: '#8B4513',
                opacity: 0.7
              }}
              title={obstacle.name}
            />
          ))}
        </div>
      </div>
    );
  };
  
  const getTerrainColor = (terrain: string): string => {
    switch (terrain) {
      case 'open_field': return '#90EE90';
      case 'forest': return '#228B22';
      case 'hills': return '#D2B48C';
      case 'mountains': return '#708090';
      case 'swamp': return '#6B8E23';
      case 'urban': return '#C0C0C0';
      case 'underground': return '#696969';
      case 'coastal': return '#4682B4';
      case 'desert': return '#F4A460';
      default: return '#90EE90';
    }
  };
  
  const getFactionColor = (faction: string): string => {
    const colors = ['#FF0000', '#0000FF', '#00FF00', '#FFFF00', '#FF00FF', '#00FFFF'];
    const index = faction.charCodeAt(0) % colors.length;
    return colors[index];
  };
  
  const renderArmyList = () => {
    return (
      <div className="army-list">
        <h3>Armies</h3>
        {armies.map(army => (
          <div key={army.id} className="army-card">
            <div className="army-header">
              <h4>{army.name} ({army.faction})</h4>
              <button onClick={() => handleRemoveArmy(army.id)}>Remove</button>
            </div>
            <p>Commander: {army.commander}</p>
            <p>Units: {army.units.reduce((sum, unit) => sum + unit.size, 0)}</p>
            <p>Status: {army.status}</p>
            <div className="unit-list">
              {army.units.map(unit => (
                <div key={unit.id} className="unit-item">
                  <span>{unit.name} ({unit.type})</span>
                  <span>Size: {unit.size}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  const renderBattleControls = () => {
    if (battleResult) {
      return (
        <div className="battle-result">
          <h3>Battle Result</h3>
          <p>Victor: {battleResult.victor || 'Draw'}</p>
          <p>Strategic Points: {battleResult.strategicPoints}</p>
          <button onClick={resetBattle}>Reset Battle</button>
        </div>
      );
    }
    
    return (
      <div className="battle-controls">
        {!isBattleActive ? (
          <>
            <button onClick={startBattle}>Start Battle</button>
            <button onClick={executeCombatRound}>Execute Round</button>
          </>
        ) : (
          <>
            <button onClick={pauseBattle}>Pause Battle</button>
            <button onClick={executeCombatRound}>Execute Round</button>
          </>
        )}
        <button onClick={resetBattle}>Reset Battle</button>
      </div>
    );
  };
  
  const renderBattleLog = () => {
    if (battleLog.length === 0) return null;
    
    return (
      <div className="battle-log">
        <h3>Battle Log</h3>
        {battleLog.map((round, index) => (
          <div key={index} className="round-log">
            <h4>Round {round.roundNumber}</h4>
            {round.events.map((event, eventIndex) => (
              <p key={eventIndex}>{event.description}</p>
            ))}
          </div>
        ))}
      </div>
    );
  };
  
  return (
    <div className="mass-combat-manager">
      <div className="combat-header">
        <h2>Mass Combat Manager</h2>
        <button onClick={onClose} className="close-button">✕</button>
      </div>
      
      {!isBattleActive && !battleResult && (
        <div className="setup-section">
          <div className="battlefield-selection">
            <h3>Select Battlefield</h3>
            <select 
              value={selectedBattlefield.id}
              onChange={(e) => {
                const battlefield = commonBattlefields.find(bf => bf.id === e.target.value);
                if (battlefield) setSelectedBattlefield(battlefield);
              }}
            >
              {commonBattlefields.map(bf => (
                <option key={bf.id} value={bf.id}>{bf.name}</option>
              ))}
            </select>
          </div>
          
          <div className="army-setup">
            <h3>Add Army</h3>
            <div className="army-form">
              <input
                type="text"
                placeholder="Army Name"
                value={newArmy.name}
                onChange={(e) => setNewArmy({...newArmy, name: e.target.value})}
              />
              <input
                type="text"
                placeholder="Faction"
                value={newArmy.faction}
                onChange={(e) => setNewArmy({...newArmy, faction: e.target.value})}
              />
              <input
                type="text"
                placeholder="Commander"
                value={newArmy.commander}
                onChange={(e) => setNewArmy({...newArmy, commander: e.target.value})}
              />
              <button onClick={handleAddArmy}>Add Army</button>
            </div>
          </div>
        </div>
      )}
      
      <div className="combat-main">
        {renderBattlefield()}
        {renderArmyList()}
      </div>
      
      <div className="combat-footer">
        {renderBattleControls()}
        {renderBattleLog()}
      </div>
    </div>
  );
};

export default MassCombatManager;