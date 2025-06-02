# Agent Error Handling Module

## Purpose

This directory provides a centralized system for error handling, tracking, and recovery mechanisms across all AI agents and their services. It aims to make the agent operations more resilient and debuggable.

## Structure and Important Files

- **`types.ts`**: Defines custom error types, categories (e.g., `NETWORK`, `LLM_API`, `STATE_ERROR`), and severity levels used throughout the error handling system.
- **`services/`**: Contains various services related to error management:
    - **`ErrorHandlingService.ts`**: The core service for reporting, processing, and managing errors. It often acts as a facade for other error-related services.
    - **`CircuitBreakerService.ts`**: Implements the circuit breaker pattern to prevent repeated calls to a failing service.
    - **`ErrorTrackingService.ts`**: (Conceptual) Could integrate with external error tracking platforms (e.g., Sentry).
    - **`RecoveryService.ts`**: Provides strategies for recovering from certain types of errors, such as retrying operations or falling back to default states.
    - **`RetryService.ts`**: A more specialized service for handling retry logic with backoff strategies.

## How Components Interact

- Other agent modules and services use `ErrorHandlingService.ts` to report errors they encounter.
- `ErrorHandlingService.ts` might then delegate to:
    - `RetryService.ts` to attempt the operation again.
    - `CircuitBreakerService.ts` to monitor the health of external services and potentially halt calls.
    - `RecoveryService.ts` to attempt a graceful recovery or state reset.
- Error types from `types.ts` are used to categorize and prioritize errors.

## Usage Example

```typescript
import { ErrorHandlingService } from './services/ErrorHandlingService';
import { ErrorCategory, ErrorSeverity } from './types';

const errorHandler = ErrorHandlingService.getInstance();

async function someAgentOperation() {
  try {
    // ... perform an operation that might fail ...
    throw new Error("Something went wrong with an LLM call!");
  } catch (error) {
    await errorHandler.handleOperation(
      () => { /* Potentially a retry of the operation */ },
      {
        errorInstance: error,
        category: ErrorCategory.LLM_API,
        severity: ErrorSeverity.HIGH,
        context: 'someAgentOperation.llmCall',
        customData: { input: "some_input" }
      }
    );
    // Or simply report:
    // errorHandler.reportError({ error, category: ..., severity: ... });
  }
}
```

## Notes

- This module is crucial for the stability and observability of the agent system.
- Proper error categorization and context logging are key to effective debugging.
- See the main `/src/agents/README.md` for the overall agent architecture.
