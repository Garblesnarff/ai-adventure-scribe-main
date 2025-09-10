/**
 * DowntimeActivityManager Component
 * 
 * Component for managing and performing downtime activities
 */

import React, { useState, useEffect } from 'react';
import { Character } from '@/types/character';
import { 
  DowntimeActivity, 
  DowntimeResult 
} from '@/types/downtimeActivities';
import { useDowntimeActivities } from '@/hooks/use-downtime-activities';
import { commonDowntimeActivities } from '@/utils/downtimeActivities';

interface DowntimeActivityManagerProps {
  character: Character;
  onCharacterUpdate: (updatedCharacter: Character) => void;
  onClose: () => void;
}

export const DowntimeActivityManager: React.FC<DowntimeActivityManagerProps> = ({
  character,
  onCharacterUpdate,
  onClose
}) => {
  const {
    isPerformingActivity,
    lastResult,
    availableActivities,
    performActivity,
    refreshAvailableActivities
  } = useDowntimeActivities({ character, onCharacterUpdate });
  
  const [selectedActivity, setSelectedActivity] = useState<DowntimeActivity | null>(null);
  const [showResult, setShowResult] = useState(false);
  
  // Refresh available activities when component mounts
  useEffect(() => {
    refreshAvailableActivities(commonDowntimeActivities);
  }, [refreshAvailableActivities]);
  
  const handlePerformActivity = async () => {
    if (!selectedActivity) return;
    
    const result = await performActivity(selectedActivity);
    setShowResult(true);
  };
  
  const handleActivitySelect = (activity: DowntimeActivity) => {
    setSelectedActivity(activity);
    setShowResult(false);
  };
  
  const resetSelection = () => {
    setSelectedActivity(null);
    setShowResult(false);
  };
  
  return (
    <div className="downtime-activity-manager">
      <div className="downtime-header">
        <h2>Downtime Activities</h2>
        <button onClick={onClose} className="close-button">✕</button>
      </div>
      
      {showResult && lastResult ? (
        <div className="downtime-result">
          <h3>{lastResult.success ? 'Success!' : 'Activity Failed'}</h3>
          <p>{lastResult.message}</p>
          
          {lastResult.outcome && (
            <div className="outcome-details">
              <p>{lastResult.outcome.description}</p>
              {lastResult.outcome.experienceGained && (
                <p>Experience Gained: {lastResult.outcome.experienceGained}</p>
              )}
              {lastResult.outcome.goldRecovery && (
                <p>Gold Recovery: {lastResult.outcome.goldRecovery} gp</p>
              )}
            </div>
          )}
          
          <div className="result-details">
            <p>Days Spent: {lastResult.daysSpent}</p>
            <p>Gold Spent: {lastResult.goldSpent} gp</p>
            <p>Materials Used: {lastResult.materialsUsed} gp</p>
            
            {lastResult.rollResult && lastResult.dc && (
              <p>
                Roll: {lastResult.rollResult} (DC {lastResult.dc}) - 
                {lastResult.success ? ' Success' : ' Failure'}
              </p>
            )}
          </div>
          
          <button onClick={resetSelection}>Select Another Activity</button>
        </div>
      ) : (
        <div className="downtime-content">
          <div className="available-activities">
            <h3>Available Activities</h3>
            {availableActivities.length === 0 ? (
              <p>No activities available for your character.</p>
            ) : (
              <ul className="activity-list">
                {availableActivities.map(activity => (
                  <li 
                    key={activity.id}
                    className={`activity-item ${selectedActivity?.id === activity.id ? 'selected' : ''}`}
                    onClick={() => handleActivitySelect(activity)}
                  >
                    <h4>{activity.name}</h4>
                    <p className="activity-type">{activity.type}</p>
                    <p className="activity-description">{activity.description}</p>
                    
                    <div className="activity-details">
                      <span>Days: {activity.daysRequired}</span>
                      {activity.goldCost && <span>Gold: {activity.goldCost} gp</span>}
                      {activity.materialCost && <span>Materials: {activity.materialCost} gp</span>}
                      {activity.levelRequirement && <span>Level: {activity.levelRequirement}+</span>}
                    </div>
                    
                    {activity.skillRequirements && activity.skillRequirements.length > 0 && (
                      <div className="skill-requirements">
                        <strong>Skills:</strong> {activity.skillRequirements.join(', ')}
                      </div>
                    )}
                    
                    {activity.toolRequirements && activity.toolRequirements.length > 0 && (
                      <div className="tool-requirements">
                        <strong>Tools:</strong> {activity.toolRequirements.join(', ')}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          {selectedActivity && (
            <div className="activity-details-panel">
              <h3>{selectedActivity.name}</h3>
              <p>{selectedActivity.description}</p>
              
              <div className="activity-requirements">
                <h4>Requirements</h4>
                <ul>
                  <li>Days Required: {selectedActivity.daysRequired}</li>
                  {selectedActivity.goldCost && (
                    <li>Gold Cost: {selectedActivity.goldCost} gp</li>
                  )}
                  {selectedActivity.materialCost && (
                    <li>Material Cost: {selectedActivity.materialCost} gp</li>
                  )}
                  {selectedActivity.levelRequirement && (
                    <li>Level Requirement: {selectedActivity.levelRequirement}+</li>
                  )}
                  {selectedActivity.classRequirement && (
                    <li>Class Requirement: {selectedActivity.classRequirement}</li>
                  )}
                  {selectedActivity.skillRequirements && selectedActivity.skillRequirements.length > 0 && (
                    <li>Skills: {selectedActivity.skillRequirements.join(', ')}</li>
                  )}
                  {selectedActivity.toolRequirements && selectedActivity.toolRequirements.length > 0 && (
                    <li>Tools: {selectedActivity.toolRequirements.join(', ')}</li>
                  )}
                </ul>
              </div>
              
              <div className="activity-outcomes">
                <h4>Potential Outcomes</h4>
                {selectedActivity.outcomes.map((outcome, index) => (
                  <div key={index} className="outcome">
                    <h5>{outcome.type.charAt(0).toUpperCase() + outcome.type.slice(1)}</h5>
                    <p>{outcome.description}</p>
                    {outcome.experienceGained && (
                      <p>Experience: {outcome.experienceGained}</p>
                    )}
                    {outcome.goldRecovery && (
                      <p>Gold Recovery: {outcome.goldRecovery} gp</p>
                    )}
                  </div>
                ))}
              </div>
              
              <button 
                onClick={handlePerformActivity}
                disabled={isPerformingActivity}
                className="perform-activity-button"
              >
                {isPerformingActivity ? 'Performing...' : 'Perform Activity'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DowntimeActivityManager;