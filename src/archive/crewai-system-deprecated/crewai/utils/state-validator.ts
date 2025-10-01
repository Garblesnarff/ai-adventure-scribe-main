import { AgentState, StateChange, StateValidationResult } from '../types/state';

export class StateValidator {
  public static validateStateChange(
    currentState: AgentState,
    proposedChanges: StateChange
  ): StateValidationResult {
    const errors: string[] = [];

    // Validate status transitions
    if (proposedChanges.status) {
      if (currentState.status === 'offline' && proposedChanges.status !== 'idle') {
        errors.push('Agent must transition to idle state first when coming online');
      }
    }

    // Validate configuration changes
    if (proposedChanges.configuration) {
      if (typeof proposedChanges.configuration !== 'object') {
        errors.push('Configuration must be an object');
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  public static validateState(state: AgentState): StateValidationResult {
    const errors: string[] = [];

    if (!state.id) {
      errors.push('State must have an ID');
    }

    if (!state.status) {
      errors.push('State must have a status');
    }

    if (!state.lastActive) {
      errors.push('State must have a lastActive timestamp');
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}