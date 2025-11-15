import { serviceMethodDuration, serviceErrorsTotal } from './metrics.js';
import { logger } from './logger.js';

/**
 * Decorator to instrument service methods with metrics and logging
 * Note: Requires experimentalDecorators in tsconfig.json
 */
export function instrument(serviceName: string, methodName: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const start = Date.now();

      try {
        const result = await originalMethod.apply(this, args);

        const duration = (Date.now() - start) / 1000;
        serviceMethodDuration.observe(
          { service: serviceName, method: methodName },
          duration
        );

        if (duration > 0.5) {
          logger.warn('Slow service method', {
            service: serviceName,
            method: methodName,
            duration: `${duration.toFixed(3)}s`,
          });
        }

        return result;
      } catch (error) {
        serviceErrorsTotal.inc({
          service: serviceName,
          error_type: (error as Error).constructor.name,
        });

        logger.error('Service method error', {
          service: serviceName,
          method: methodName,
          error: (error as Error).message,
          stack: (error as Error).stack,
        });

        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Wrapper function to instrument async functions with metrics and logging
 * Use this if decorators are not enabled or for standalone functions
 */
export function instrumentAsync<T extends (...args: any[]) => Promise<any>>(
  serviceName: string,
  methodName: string,
  fn: T
): T {
  return (async (...args: any[]) => {
    const start = Date.now();

    try {
      const result = await fn(...args);

      const duration = (Date.now() - start) / 1000;
      serviceMethodDuration.observe(
        { service: serviceName, method: methodName },
        duration
      );

      if (duration > 0.5) {
        logger.warn('Slow service method', {
          service: serviceName,
          method: methodName,
          duration: `${duration.toFixed(3)}s`,
        });
      }

      return result;
    } catch (error) {
      serviceErrorsTotal.inc({
        service: serviceName,
        error_type: (error as Error).constructor.name,
      });

      logger.error('Service method error', {
        service: serviceName,
        method: methodName,
        error: (error as Error).message,
        stack: (error as Error).stack,
      });

      throw error;
    }
  }) as T;
}
