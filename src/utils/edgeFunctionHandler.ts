import { toast } from '@/hooks/use-toast';
import logger from '@/lib/logger';
import { AIExecutionManager } from '@/services/ai-execution/AIExecutionManager';
import { EdgeFunctionStrategy } from '@/services/ai-execution/EdgeFunctionStrategy';
import { LocalFallbackStrategy } from '@/services/ai-execution/LocalFallbackStrategy';

/**
 * Check if we should use local AI services instead of edge functions
 */
function shouldUseLocalServices(): boolean {
  // Check environment variable for local mode
  const useLocal = import.meta.env.VITE_USE_LOCAL_AI;

  // Enable local mode if:
  // 1. Explicitly set to true
  // 2. In development mode
  return useLocal === 'true' || import.meta.env.DEV;
}

let cachedManager: AIExecutionManager | null = null;
let cachedLocalMode: boolean | null = null;

function getExecutionManager(): AIExecutionManager {
  const localFirst = shouldUseLocalServices();
  if (!cachedManager || cachedLocalMode !== localFirst) {
    const strategies = localFirst
      ? [new LocalFallbackStrategy(1), new EdgeFunctionStrategy(10)]
      : [new EdgeFunctionStrategy(1), new LocalFallbackStrategy(10)];

    cachedManager = new AIExecutionManager(strategies);
    cachedLocalMode = localFirst;
  }
  return cachedManager;
}

export async function callEdgeFunction<T = unknown>(
  functionName: string,
  payload?: Record<string, unknown>,
): Promise<T | null> {
  try {
    const manager = getExecutionManager();
    const data = await manager.execute(functionName, payload);
    return data as T;
  } catch (error) {
    logger.error(`[EdgeFunction] Failed to call ${functionName}:`, error);
    toast({
      title: 'Error',
      description: 'Failed to connect to server. Please try again.',
      variant: 'destructive',
    });
    return null;
  }
}
