export interface AIExecutionStrategy {
  readonly name: string;
  readonly priority: number;
  canExecute(functionName: string): boolean;
  execute(functionName: string, payload?: Record<string, unknown>): Promise<any>;
}
