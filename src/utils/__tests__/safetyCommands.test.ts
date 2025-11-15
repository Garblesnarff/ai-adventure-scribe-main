import { checkSafetyCommands, processSafetyCommand } from '../safetyCommands';

describe('Safety Commands', () => {
  const sessionId = 'test-session-1';

  describe('checkSafetyCommands', () => {
    describe('Explicit Commands', () => {
      it('detects /x command', async () => {
        const result = await checkSafetyCommands('/x', sessionId);
        expect(result.isSafetyCommand).toBe(true);
        expect(result.command?.type).toBe('x_card');
        expect(result.command?.triggeredBy).toBe('explicit_command');
        expect(result.response).toBeDefined();
      });

      it('detects /x command with context', async () => {
        const result = await checkSafetyCommands('/x this is too graphic', sessionId);
        expect(result.isSafetyCommand).toBe(true);
        expect(result.command?.type).toBe('x_card');
        expect(result.command?.context).toBe('/x this is too graphic');
      });

      it('detects /veil command', async () => {
        const result = await checkSafetyCommands('/veil', sessionId);
        expect(result.isSafetyCommand).toBe(true);
        expect(result.command?.type).toBe('veil');
        expect(result.command?.triggeredBy).toBe('explicit_command');
        expect(result.response).toBeDefined();
      });

      it('detects /pause command', async () => {
        const result = await checkSafetyCommands('/pause', sessionId);
        expect(result.isSafetyCommand).toBe(true);
        expect(result.command?.type).toBe('pause');
        expect(result.shouldPause).toBe(true);
      });

      it('detects /resume command', async () => {
        const result = await checkSafetyCommands('/resume', sessionId);
        expect(result.isSafetyCommand).toBe(true);
        expect(result.command?.type).toBe('resume');
        expect(result.shouldResume).toBe(true);
      });

      it('handles case sensitivity in commands', async () => {
        const result1 = await checkSafetyCommands('/X', sessionId);
        const result2 = await checkSafetyCommands('/PAUSE', sessionId);

        // Should work with toLowerCase conversion
        expect(result1.isSafetyCommand).toBe(true);
        expect(result2.isSafetyCommand).toBe(true);
      });
    });

    describe('Auto-triggered Commands', () => {
      it('detects x-card trigger words', async () => {
        const aiResponse = 'The scene contains graphic violence and blood.';
        const result = await checkSafetyCommands('This is uncomfortable', sessionId, aiResponse);

        expect(result.isSafetyCommand).toBe(true);
        expect(result.command?.type).toBe('x_card');
        expect(result.command?.autoTriggered).toBe(true);
        expect(result.command?.triggerWord).toBeDefined();
        expect(result.command?.triggeredBy).toBe('auto_detect');
        expect(result.shouldPause).toBe(true);
      });

      it('detects veil trigger words', async () => {
        const aiResponse = 'They engage in suggestive behavior.';
        const result = await checkSafetyCommands('This feels inappropriate', sessionId, aiResponse);

        expect(result.isSafetyCommand).toBe(true);
        expect(result.command?.type).toBe('veil');
        expect(result.command?.autoTriggered).toBe(true);
        expect(result.command?.triggerWord).toBeDefined();
      });

      it('detects pause trigger words', async () => {
        const aiResponse = 'Everything is overwhelming.';
        const result = await checkSafetyCommands('This is too much', sessionId, aiResponse);

        expect(result.isSafetyCommand).toBe(true);
        expect(result.command?.type).toBe('pause');
        expect(result.command?.autoTriggered).toBe(true);
        expect(result.shouldPause).toBe(true);
      });
    });

    describe('Non-safety messages', () => {
      it('allows normal messages through', async () => {
        const result = await checkSafetyCommands('I attack the goblin', sessionId);
        expect(result.isSafetyCommand).toBe(false);
        expect(result.shouldProcessNormal).toBe(true);
      });

      it('allows dice commands through', async () => {
        const result = await checkSafetyCommands('/roll d20+5 for attack', sessionId);
        expect(result.isSafetyCommand).toBe(false);
        expect(result.shouldProcessNormal).toBe(true);
      });

      it('allows normal AI responses through', async () => {
        const aiResponse = 'You see a beautiful forest and a clear stream.';
        const result = await checkSafetyCommands('This is nice', sessionId, aiResponse);
        expect(result.isSafetyCommand).toBe(false);
        expect(result.shouldProcessNormal).toBe(true);
      });
    });
  });

  describe('processSafetyCommand', () => {
    it('processes x-card command correctly', async () => {
      const command = {
        type: 'x_card' as const,
        triggeredBy: 'explicit_command',
        timestamp: '2025-10-08T12:00:00Z',
        context: '/x',
      };

      const response = await processSafetyCommand(command, sessionId);

      expect(response.sender).toBe('system');
      expect(response.context?.intent).toBe('safety_x_card');
      expect(response.text).toContain('X-CARD ACTIVATED');
      expect(response.text).toContain('immediately stopped');
    });

    it('processes veil command correctly', async () => {
      const command = {
        type: 'veil' as const,
        triggeredBy: 'explicit_command',
        timestamp: '2025-10-08T12:00:00Z',
        context: '/veil',
      };

      const response = await processSafetyCommand(command, sessionId);

      expect(response.sender).toBe('system');
      expect(response.context?.intent).toBe('safety_veil');
      expect(response.text).toContain('VEIL ACTIVATED');
      expect(response.text).toContain('sensitive content has been faded');
    });

    it('processes pause command correctly', async () => {
      const command = {
        type: 'pause' as const,
        triggeredBy: 'explicit_command',
        timestamp: '2025-10-08T12:00:00Z',
        context: '/pause',
      };

      const response = await processSafetyCommand(command, sessionId);

      expect(response.sender).toBe('system');
      expect(response.context?.intent).toBe('safety_pause');
      expect(response.text).toContain('GAME PAUSED');
      expect(response.text).toContain("Use /resume when you're ready");
    });

    it('processes resume command correctly', async () => {
      const command = {
        type: 'resume' as const,
        triggeredBy: 'explicit_command',
        timestamp: '2025-10-08T12:00:00Z',
        context: '/resume',
      };

      const response = await processSafetyCommand(command, sessionId);

      expect(response.sender).toBe('system');
      expect(response.context?.intent).toBe('safety_resume');
      expect(response.text).toContain('GAME RESUMED');
      expect(response.text).toContain('Welcome back');
    });

    it('handles auto-triggered commands with appropriate context', async () => {
      const command = {
        type: 'x_card' as const,
        triggeredBy: 'auto_detect',
        timestamp: '2025-10-08T12:00:00Z',
        context: 'Auto-triggered by: violence',
        autoTriggered: true,
        triggerWord: 'violence',
      };

      const response = await processSafetyCommand(command, sessionId);

      expect(response.sender).toBe('system');
      expect(response.context?.autoTriggered).toBe(true);
      expect(response.context?.triggerWord).toBe('violence');
      expect(response.context?.urgency).toBe('immediate');
    });
  });
});
