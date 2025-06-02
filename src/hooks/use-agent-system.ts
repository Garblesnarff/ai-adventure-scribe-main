/**
 * useAgentSystem Hook
 * 
 * Provides an interface to interact with the Dungeon Master agent.
 * Manages task execution state and error handling.
 * 
 * Dependencies:
 * - React (useState)
 * - DungeonMasterAgent (src/agents/dungeon-master-agent.ts)
 * - Toast hook (src/components/ui/use-toast.ts)
 * - Agent types (src/agents/types.ts)
 * 
 * @author AI Dungeon Master Team
 */

import { useState } from 'react';
import { DungeonMasterAgent } from '@/agents/dungeon-master-agent';
import { AgentTask, AgentResult } from '@/agents/types';
import { useToast } from '@/components/ui/use-toast';

/**
 * React hook for interacting with the Dungeon Master agent.
 * 
 * @returns {{
 *   dmAgent: DungeonMasterAgent,
 *   executeTask: (task: AgentTask) => Promise<AgentResult>,
 *   isProcessing: boolean
 * }} Agent instance, task executor, and processing state
 */
export const useAgentSystem = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const dmAgent = new DungeonMasterAgent();

  /**
   * Executes a task using the DM agent.
   * 
   * @param {AgentTask} task - The task to execute
   * @returns {Promise<AgentResult>} The result of the task execution
   */
  const executeTask = async (task: AgentTask): Promise<AgentResult> => {
    setIsProcessing(true);
    try {
      const result = await dmAgent.executeTask(task);
      
      if (!result.success) {
        toast({
          title: "Task Execution Failed",
          description: result.message,
          variant: "destructive",
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error in useAgentSystem:', error);
      toast({
        title: "Error",
        description: "Failed to execute agent task",
        variant: "destructive",
      });
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    dmAgent,
    executeTask,
    isProcessing
  };
};
