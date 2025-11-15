import { logger } from '@/lib/logger';

/**
 * Environment Variable Validation
 *
 * Validates that required environment variables are configured.
 * - In development: Shows helpful error messages
 * - In production: Warns but doesn't throw (to prevent app crashes)
 *
 * Required Variables:
 * - VITE_SUPABASE_URL: Supabase project URL
 * - VITE_SUPABASE_ANON_KEY: Supabase anonymous key
 * - VITE_GEMINI_API_KEYS: Gemini API key(s) for AI functionality
 *
 * @example
 * // Call early in application lifecycle (e.g., main.tsx)
 * validateEnvironment();
 */

interface EnvVariable {
  key: string;
  description: string;
  required: boolean;
  validator?: (value: string) => boolean;
}

const ENV_VARIABLES: EnvVariable[] = [
  {
    key: 'VITE_SUPABASE_URL',
    description: 'Supabase project URL',
    required: true,
    validator: (value) => value.startsWith('https://') && value.includes('supabase.co'),
  },
  {
    key: 'VITE_SUPABASE_ANON_KEY',
    description: 'Supabase anonymous key',
    required: true,
    validator: (value) => value.length > 20, // Basic length check
  },
  {
    key: 'VITE_GEMINI_API_KEYS',
    description: 'Gemini API key(s) for AI functionality',
    required: true,
    validator: (value) => value.length > 10, // Basic length check
  },
  {
    key: 'VITE_GA_MEASUREMENT_ID',
    description: 'Google Analytics measurement ID',
    required: false,
    validator: (value) => value.startsWith('G-'),
  },
];

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates all required environment variables
 * @returns ValidationResult with errors and warnings
 */
export function validateEnvironment(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const isDevelopment = import.meta.env.MODE !== 'production';
  const isProduction = import.meta.env.MODE === 'production';

  logger.info('Validating environment configuration', {
    mode: import.meta.env.MODE,
    dev: import.meta.env.DEV,
    prod: import.meta.env.PROD,
  });

  // Check each environment variable
  for (const envVar of ENV_VARIABLES) {
    const value = import.meta.env[envVar.key];

    // Missing variable
    if (!value || value === '' || value === 'undefined' || value === 'null') {
      if (envVar.required) {
        const message = `Missing required environment variable: ${envVar.key} (${envVar.description})`;
        errors.push(message);

        if (isDevelopment) {
          logger.error('Required environment variable not configured', {
            variable: envVar.key,
            description: envVar.description,
            hint: `Add ${envVar.key} to your .env file`,
          });
        } else {
          logger.warn('Required environment variable not configured in production', {
            variable: envVar.key,
            description: envVar.description,
          });
        }
      } else {
        const message = `Optional environment variable not set: ${envVar.key} (${envVar.description})`;
        warnings.push(message);

        logger.debug('Optional environment variable not set', {
          variable: envVar.key,
          description: envVar.description,
        });
      }
      continue;
    }

    // Validate format if validator is provided
    if (envVar.validator && !envVar.validator(value)) {
      const message = `Invalid format for ${envVar.key}: ${envVar.description}`;
      warnings.push(message);

      logger.warn('Environment variable has invalid format', {
        variable: envVar.key,
        description: envVar.description,
        valueLength: value.length,
      });
    } else {
      logger.debug('Environment variable validated', {
        variable: envVar.key,
        configured: true,
      });
    }
  }

  // Summary
  const result: ValidationResult = {
    isValid: errors.length === 0,
    errors,
    warnings,
  };

  if (errors.length > 0) {
    logger.error('Environment validation failed', {
      errorCount: errors.length,
      warningCount: warnings.length,
      errors: errors.slice(0, 3), // Limit to avoid log spam
    });

    if (isDevelopment) {
      // In development, show detailed error message
      console.error('\n=== Environment Configuration Error ===');
      console.error('Missing required environment variables:\n');
      errors.forEach((error) => console.error(`  - ${error}`));
      console.error('\nTo fix this:');
      console.error('  1. Copy .env.example to .env');
      console.error('  2. Fill in the required values');
      console.error('  3. Restart the development server\n');
    } else if (isProduction) {
      // In production, warn but don't throw
      logger.error('Production environment is missing required variables', {
        message: 'Application may not function correctly',
        errorCount: errors.length,
      });
    }
  } else if (warnings.length > 0) {
    logger.info('Environment validation completed with warnings', {
      warningCount: warnings.length,
      warnings: warnings.slice(0, 3),
    });
  } else {
    logger.info('Environment validation successful', {
      validatedVariables: ENV_VARIABLES.length,
    });
  }

  return result;
}

/**
 * Gets a required environment variable with validation
 * Throws in development if missing, warns in production
 *
 * @param key - The environment variable key
 * @param description - Human-readable description
 * @returns The environment variable value
 */
export function getRequiredEnv(key: string, description: string): string {
  const value = import.meta.env[key];

  if (!value || value === '' || value === 'undefined' || value === 'null') {
    const isDevelopment = import.meta.env.MODE !== 'production';
    const message = `Missing required environment variable: ${key} (${description})`;

    if (isDevelopment) {
      logger.error(message, { key, description });
      throw new Error(message);
    } else {
      logger.warn(message, { key, description, impact: 'Feature may not work' });
      return '';
    }
  }

  return value;
}

/**
 * Gets an optional environment variable with a default value
 *
 * @param key - The environment variable key
 * @param defaultValue - Default value if not set
 * @returns The environment variable value or default
 */
export function getOptionalEnv(key: string, defaultValue: string): string {
  const value = import.meta.env[key];

  if (!value || value === '' || value === 'undefined' || value === 'null') {
    logger.debug('Using default value for optional environment variable', {
      key,
      default: defaultValue,
    });
    return defaultValue;
  }

  return value;
}
