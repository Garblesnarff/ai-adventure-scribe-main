# Interactive Dice Roll System Test Plan

## Overview
This document outlines the test cases for the interactive dice roll system implementation. The system should prevent the DM from auto-rolling dice and instead prompt players to roll themselves.

## Test Cases

### 1. DM Message Processing
**Goal**: Verify DM requests rolls instead of auto-generating them
- [ ] DM says "Please roll 1d20+5 for Perception" instead of "Rolling 1d20+5 = 17"
- [ ] Roll requests are parsed from DM messages
- [ ] Structured roll requests take priority over text parsing
- [ ] Multiple roll requests in one message are handled correctly

### 2. Roll Request UI Display
**Goal**: Verify DiceRollRequest component displays correctly
- [ ] Roll request cards appear after DM messages
- [ ] Correct roll type icons and colors are displayed
- [ ] Formula, purpose, and DC/AC are shown correctly
- [ ] Advantage/disadvantage toggles work properly
- [ ] Auto-roll and manual input modes both function

### 3. Pending Roll Detection
**Goal**: Verify chat is disabled when rolls are pending
- [ ] `usePendingRolls` hook detects unresolved requests
- [ ] Chat input is disabled when rolls are pending
- [ ] Visual indicator shows pending rolls status
- [ ] Pending status clears after player rolls

### 4. Player Roll Interaction
**Goal**: Verify player can successfully perform rolls
- [ ] Auto-roll button generates proper dice results
- [ ] Manual input accepts player-entered values
- [ ] Advantage/disadvantage modifies roll results correctly
- [ ] Roll results are sent back to DM for narration

### 5. Message Flow Integration
**Goal**: Verify complete request → roll → response flow
- [ ] DM requests roll → UI appears → Player rolls → DM narrates result
- [ ] Chat remains disabled until roll is completed
- [ ] Message history preserves roll context
- [ ] Multiple sequential rolls work correctly

## Manual Testing Scenarios

### Scenario A: Combat Attack Roll
1. Start a game session
2. Trigger combat by attacking an enemy
3. Verify DM says "Please roll 1d20+[modifier] for your attack" 
4. Verify roll request UI appears with attack roll styling
5. Click "Roll Dice" and verify result is sent to DM
6. Verify DM narrates the result appropriately

### Scenario B: Skill Check with Advantage
1. Ask to investigate something complex
2. Verify DM requests a skill check
3. Toggle advantage on the roll request
4. Roll and verify advantage mechanics work
5. Verify DM incorporates the result into narrative

### Scenario C: Manual Roll Entry
1. Trigger any roll request
2. Click "Enter Manually" 
3. Enter a specific number (e.g., 18)
4. Submit and verify DM uses that exact result

### Scenario D: Multiple Pending Rolls
1. Trigger a scenario requiring multiple rolls
2. Verify all roll requests appear
3. Complete them in sequence
4. Verify chat unlocks after all are completed

## Technical Validation

### Code Integration Points
- `src/services/ai-service.ts` - AI prompting modifications
- `src/components/game/DiceRollRequest.tsx` - Roll request UI
- `src/hooks/use-pending-rolls.ts` - Pending roll detection
- `src/components/game/MessageList.tsx` - Roll request display
- `src/components/game/GameContent.tsx` - Chat input disabling
- `src/utils/rollRequestParser.ts` - Text parsing fallback

### TypeScript Validation
- [ ] All new types compile without errors
- [ ] RollRequest interface is properly used throughout
- [ ] EnhancedChatMessage extends work correctly
- [ ] No undefined prop warnings in components

## Success Criteria

✅ **Primary Goal**: DM never auto-rolls dice, always requests player input
✅ **Player Agency**: Players control all their dice rolls
✅ **UI Feedback**: Clear visual indication of pending rolls
✅ **Flow Integrity**: Complete request → roll → narration cycle
✅ **Type Safety**: All TypeScript compilation passes
✅ **User Experience**: Intuitive and responsive roll interactions

## Test Results

To be filled during actual testing:

- [ ] All scenarios pass
- [ ] No TypeScript errors
- [ ] No runtime console errors  
- [ ] Performance is acceptable
- [ ] UI is responsive and intuitive

---

## Next Steps After Testing

1. **If tests pass**: Mark Phase 5 complete and document success
2. **If issues found**: Debug and fix specific problems
3. **Performance optimization**: Add roll animations/sounds if needed
4. **Documentation**: Update user guides with new roll system