type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const enabledLevels: Record<LogLevel, boolean> = {
  debug: import.meta.env.MODE !== 'production',
  info: true,
  warn: true,
  error: true,
};

function format(prefix: string, args: unknown[]): unknown[] {
  return [prefix, ...args];
}

export const logger = {
  debug: (...args: unknown[]) => {
    if (enabledLevels.debug) console.debug(...format('[DEBUG]', args));
  },
  info: (...args: unknown[]) => {
    if (enabledLevels.info) console.info(...format('[INFO]', args));
  },
  warn: (...args: unknown[]) => {
    if (enabledLevels.warn) console.warn(...format('[WARN]', args));
  },
  error: (...args: unknown[]) => {
    if (enabledLevels.error) console.error(...format('[ERROR]', args));
  },
};

export default logger;
