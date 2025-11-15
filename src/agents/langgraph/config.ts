/**
 * LangGraph Configuration
 *
 * Configuration settings for LangGraph agent orchestration.
 * Controls API keys, tracing, performance limits, and state persistence.
 *
 * @module agents/langgraph/config
 */

/**
 * LangGraph and LangSmith configuration
 */
export const LANGGRAPH_CONFIG = {
  /**
   * LangChain API key for LangSmith tracing (optional)
   * Set via VITE_LANGCHAIN_API_KEY environment variable
   */
  apiKey: import.meta.env.VITE_LANGCHAIN_API_KEY || undefined,

  /**
   * LangSmith project name for tracing and debugging
   */
  langSmithProject: 'ai-adventure-scribe',

  /**
   * Enable LangSmith tracing in development mode
   * Disabled in production for performance
   */
  enableTracing: import.meta.env.DEV,

  /**
   * Maximum iterations before graph execution is halted
   * Prevents infinite loops in cyclic graphs
   */
  maxIterations: 10,

  /**
   * Save checkpoint every N messages for state recovery
   * Lower values = more frequent saves but higher overhead
   */
  checkpointInterval: 5,

  /**
   * Timeout for individual node execution (ms)
   */
  nodeTimeout: 30000, // 30 seconds

  /**
   * Timeout for entire graph execution (ms)
   */
  graphTimeout: 120000, // 2 minutes

  /**
   * Maximum retries for failed node executions
   */
  maxRetries: 3,

  /**
   * Delay between retries (ms)
   */
  retryDelay: 1000,
};

/**
 * Graph performance limits
 */
export const PERFORMANCE_LIMITS = {
  /**
   * Maximum messages in state before pruning
   */
  maxMessages: 50,

  /**
   * Maximum token budget per graph execution
   */
  maxTokens: 10000,

  /**
   * Warning threshold for execution time (ms)
   */
  slowExecutionWarning: 5000,
};

/**
 * Checkpointing configuration
 */
export const CHECKPOINT_CONFIG = {
  /**
   * Storage type for checkpoints
   * 'memory' - In-memory only (lost on reload)
   * 'localstorage' - Browser localStorage
   * 'supabase' - Supabase database (persistent, multi-device)
   */
  storageType: (import.meta.env.VITE_CHECKPOINT_STORAGE || 'memory') as
    | 'memory'
    | 'localstorage'
    | 'supabase',

  /**
   * Automatically save checkpoints
   */
  autoSave: true,

  /**
   * Compression for checkpoint data
   */
  compress: true,

  /**
   * TTL for checkpoints in storage (ms)
   * 24 hours by default
   */
  ttl: 24 * 60 * 60 * 1000,
};

/**
 * Node-specific timeouts
 *
 * Some nodes (like LLM calls) may need longer timeouts
 */
export const NODE_TIMEOUTS = {
  /** Intent detection (fast, uses simple prompts) */
  intentDetector: 5000,

  /** Rules validation (medium, requires SRD lookup) */
  rulesValidator: 15000,

  /** Response generation (slow, uses complex prompts) */
  responseGenerator: 30000,

  /** Memory retrieval (fast, vector search) */
  memoryRetrieval: 5000,

  /** Dice rolling (instant, local computation) */
  diceRoller: 1000,
};

/**
 * Validate configuration on module load
 */
function validateConfig() {
  if (LANGGRAPH_CONFIG.enableTracing && !LANGGRAPH_CONFIG.apiKey) {
    console.warn(
      '[LangGraph] Tracing enabled but VITE_LANGCHAIN_API_KEY not set. ' +
        'Tracing will be disabled.',
    );
  }

  if (LANGGRAPH_CONFIG.maxIterations < 1) {
    throw new Error('[LangGraph] maxIterations must be >= 1');
  }

  if (LANGGRAPH_CONFIG.checkpointInterval < 1) {
    throw new Error('[LangGraph] checkpointInterval must be >= 1');
  }
}

// Run validation
validateConfig();
