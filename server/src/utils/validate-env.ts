/**
 * Environment Variable Validation
 *
 * SECURITY: Validates that all required environment variables are set before starting the server.
 * This prevents the application from starting with missing configuration that could cause
 * security issues or unexpected behavior.
 */

interface EnvConfig {
  name: string;
  required: boolean;
  description: string;
  validate?: (value: string) => boolean;
}

const ENV_VARIABLES: EnvConfig[] = [
  // Authentication & Security
  {
    name: 'JWT_SECRET',
    required: true,
    description: 'Secret key for signing JWT tokens (CRITICAL in production)',
    validate: (val) => val.length >= 32 // At least 32 characters
  },
  {
    name: 'SUPABASE_URL',
    required: true,
    description: 'Supabase project URL',
    validate: (val) => val.startsWith('https://') && val.includes('.supabase.co')
  },
  {
    name: 'SUPABASE_ANON_KEY',
    required: true,
    description: 'Supabase anonymous key for client-side access'
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    required: true,
    description: 'Supabase service role key for server-side admin access'
  },
  {
    name: 'SUPABASE_JWT_SECRET',
    required: true,
    description: 'Supabase JWT secret for token verification'
  },

  // Payment Processing
  {
    name: 'STRIPE_SECRET_KEY',
    required: false, // Optional if billing not enabled
    description: 'Stripe secret key for payment processing'
  },
  {
    name: 'STRIPE_WEBHOOK_SECRET',
    required: false, // Required if Stripe is used
    description: 'Stripe webhook signing secret'
  },

  // AI Services
  {
    name: 'OPENROUTER_API_KEY',
    required: false, // At least one AI service should be configured
    description: 'OpenRouter API key for AI text/image generation'
  },
  {
    name: 'OPENAI_API_KEY',
    required: false,
    description: 'OpenAI API key (alternative to OpenRouter)'
  },
  {
    name: 'ANTHROPIC_API_KEY',
    required: false,
    description: 'Anthropic API key (alternative to OpenRouter)'
  },

  // Database
  {
    name: 'DATABASE_URL',
    required: false, // Optional, used for additional database features
    description: 'PostgreSQL connection string for direct database access'
  },

  // Application
  {
    name: 'NODE_ENV',
    required: true,
    description: 'Application environment (production, development, test)',
    validate: (val) => ['production', 'development', 'test'].includes(val)
  },
  {
    name: 'PORT',
    required: false,
    description: 'Server port number (default: 3001)',
    validate: (val) => !isNaN(parseInt(val)) && parseInt(val) > 0 && parseInt(val) < 65536
  }
];

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates all environment variables
 * @param strict - If true, treat warnings as errors
 */
export function validateEnvironment(strict: boolean = false): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const config of ENV_VARIABLES) {
    const value = process.env[config.name];

    if (!value || value.trim() === '') {
      if (config.required) {
        errors.push(`❌ MISSING REQUIRED: ${config.name} - ${config.description}`);
      } else {
        warnings.push(`⚠️  MISSING OPTIONAL: ${config.name} - ${config.description}`);
      }
      continue;
    }

    // Run custom validation if provided
    if (config.validate && !config.validate(value)) {
      errors.push(`❌ INVALID VALUE: ${config.name} - ${config.description}`);
    }
  }

  // Check for at least one AI service
  const hasAIService = !!(
    process.env.OPENROUTER_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.ANTHROPIC_API_KEY
  );

  if (!hasAIService) {
    warnings.push('⚠️  NO AI SERVICE: At least one of OPENROUTER_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY should be set');
  }

  // Check Stripe webhook secret if Stripe key is set
  if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_WEBHOOK_SECRET) {
    warnings.push('⚠️  INCOMPLETE STRIPE CONFIG: STRIPE_WEBHOOK_SECRET should be set when STRIPE_SECRET_KEY is present');
  }

  const allErrors = strict ? [...errors, ...warnings] : errors;

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: strict ? [] : warnings
  };
}

/**
 * Validates environment and exits process if invalid in production
 */
export function validateEnvironmentOrExit(strict: boolean = false): void {
  const result = validateEnvironment(strict);

  console.log('\n🔍 Environment Variable Validation\n');

  if (result.errors.length > 0) {
    console.error('❌ VALIDATION FAILED:\n');
    result.errors.forEach(err => console.error(`  ${err}`));
    console.error('\n');

    if (process.env.NODE_ENV === 'production') {
      console.error('🚨 Cannot start server in production with invalid environment configuration!');
      process.exit(1);
    } else {
      console.error('⚠️  Starting server anyway (non-production environment)');
      console.error('⚠️  Some features may not work correctly!\n');
    }
  } else {
    console.log('✅ All required environment variables are set\n');
  }

  if (result.warnings.length > 0) {
    console.log('⚠️  WARNINGS:\n');
    result.warnings.forEach(warn => console.log(`  ${warn}`));
    console.log('\n');
  }
}
