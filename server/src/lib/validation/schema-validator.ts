/**
 * JSON Schema Validation for REST API
 * 
 * Comprehensive request/response validation using JSON Schema with
 * detailed error reporting and schema composition.
 */

import Ajv, { JSONSchemaType, ValidateFunction, ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import { ValidationError } from '../rest/rest-errors';

export interface ValidationResult {
  valid: boolean;
  errors?: ValidationErrorDetail[];
}

export interface ValidationErrorDetail {
  field: string;
  message: string;
  value?: any;
  allowedValues?: any[];
}

export class SchemaValidator {
  private ajv: Ajv;
  private compiledSchemas: Map<string, ValidateFunction>;

  constructor() {
    this.ajv = new Ajv({
      allErrors: true,
      removeAdditional: 'all', // Remove additional properties
      useDefaults: true,      // Fill in default values
      coerceTypes: true,      // Convert types when possible
      strict: false           // Don't be overly strict about schema format
    });

    // Add standard formats (date, email, uri, etc.)
    addFormats(this.ajv);

    // Add custom formats
    this.addCustomFormats();

    this.compiledSchemas = new Map();
  }

  /**
   * Register a schema for validation
   */
  public registerSchema(schemaId: string, schema: object): void {
    try {
      const validate = this.ajv.compile(schema);
      this.compiledSchemas.set(schemaId, validate);
    } catch (error) {
      throw new Error(`Failed to compile schema ${schemaId}: ${error}`);
    }
  }

  /**
   * Validate data against a registered schema
   */
  public validate(schemaId: string, data: any): ValidationResult {
    const validate = this.compiledSchemas.get(schemaId);
    
    if (!validate) {
      throw new Error(`Schema ${schemaId} not found`);
    }

    const valid = validate(data);
    
    if (!valid) {
      return {
        valid: false,
        errors: this.formatErrors(validate.errors || [])
      };
    }

    return { valid: true };
  }

  /**
   * Validate and throw ValidationError if invalid
   */
  public validateOrThrow(schemaId: string, data: any): void {
    const result = this.validate(schemaId, data);
    
    if (!result.valid) {
      throw new ValidationError(
        'Validation failed',
        result.errors?.map(err => ({ field: err.field, message: err.message }))
      );
    }
  }

  /**
   * Add a schema with automatic registration
   */
  public addSchema<T>(schemaId: string, schema: JSONSchemaType<T>): void {
    this.ajv.addSchema(schema, schemaId);
    const validate = this.ajv.getSchema(schemaId);
    
    if (validate) {
      this.compiledSchemas.set(schemaId, validate);
    }
  }

  /**
   * Get all registered schema IDs
   */
  public getRegisteredSchemas(): string[] {
    return Array.from(this.compiledSchemas.keys());
  }

  /**
   * Remove a schema
   */
  public removeSchema(schemaId: string): void {
    this.ajv.removeSchema(schemaId);
    this.compiledSchemas.delete(schemaId);
  }

  /**
   * Format AJV errors into our error format
   */
  private formatErrors(errors: ErrorObject[]): ValidationErrorDetail[] {
    return errors.map(error => {
      const field = this.getFieldPath(error);
      let message = error.message || 'Validation error';
      
      // Enhance error messages based on error type
      switch (error.keyword) {
        case 'required':
          message = `Missing required field: ${error.params?.missingProperty}`;
          break;
        case 'type':
          message = `Expected ${error.params?.type}, got ${typeof error.data}`;
          break;
        case 'format':
          message = `Invalid format. Expected ${error.params?.format} format`;
          break;
        case 'enum':
          return {
            field,
            message: `Invalid value. Allowed values: ${error.params?.allowedValues?.join(', ')}`,
            value: error.data,
            allowedValues: error.params?.allowedValues
          };
        case 'minimum':
          message = `Value must be >= ${error.params?.limit}`;
          break;
        case 'maximum':
          message = `Value must be <= ${error.params?.limit}`;
          break;
        case 'minLength':
          message = `Minimum length is ${error.params?.limit} characters`;
          break;
        case 'maxLength':
          message = `Maximum length is ${error.params?.limit} characters`;
          break;
        case 'pattern':
          message = `Value does not match required pattern`;
          break;
        default:
          message = error.message || 'Validation error';
      }

      return {
        field,
        message,
        value: error.data
      };
    });
  }

  /**
   * Get the field path from an AJV error
   */
  private getFieldPath(error: ErrorObject): string {
    if (error.instancePath) {
      return error.instancePath.replace(/^\//, '').replace(/\//g, '.');
    }
    
    if (error.keyword === 'required' && error.params?.missingProperty) {
      const basePath = error.instancePath?.replace(/^\//, '').replace(/\//g, '.') || '';
      return basePath ? `${basePath}.${error.params.missingProperty}` : error.params.missingProperty;
    }
    
    return 'root';
  }

  /**
   * Add custom formats for validation
   */
  private addCustomFormats(): void {
    // MongoDB ObjectId format
    this.ajv.addFormat('objectid', {
      type: 'string',
      validate: (str: string) => /^[0-9a-fA-F]{24}$/.test(str)
    });

    // UUID v4 format
    this.ajv.addFormat('uuid', {
      type: 'string',
      validate: (str: string) => 
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(str)
    });

    // Slug format (URL-friendly strings)
    this.ajv.addFormat('slug', {
      type: 'string',
      validate: (str: string) => /^[a-z0-9-_]+$/.test(str)
    });

    // Hex color format
    this.ajv.addFormat('hex-color', {
      type: 'string',
      validate: (str: string) => /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(str)
    });

    // Semantic version format
    this.ajv.addFormat('semver', {
      type: 'string',
      validate: (str: string) => 
        /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/.test(str)
    });

    // Base64 format
    this.ajv.addFormat('base64', {
      type: 'string',
      validate: (str: string) => {
        try {
          return Buffer.from(str, 'base64').toString('base64') === str;
        } catch {
          return false;
        }
      }
    });

    // JWT token format (basic check)
    this.ajv.addFormat('jwt', {
      type: 'string',
      validate: (str: string) => {
        const parts = str.split('.');
        return parts.length === 3 && parts.every(part => part.length > 0);
      }
    });

    // ISO 8601 duration format
    this.ajv.addFormat('duration', {
      type: 'string',
      validate: (str: string) => 
        /^P(?:\d+Y)?(?:\d+M)?(?:\d+W)?(?:\d+D)?(?:T(?:\d+H)?(?:\d+M)?(?:\d+(?:\.\d+)?S)?)?$/.test(str)
    });
  }

  /**
   * Create a middleware function for Express validation
   */
  public createMiddleware(schemaId: string, source: 'body' | 'query' | 'params' = 'body') {
    return (req: any, res: any, next: any) => {
      try {
        const data = source === 'body' ? req.body : 
                    source === 'query' ? req.query : 
                    req.params;
        
        this.validateOrThrow(schemaId, data);
        next();
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Generate OpenAPI schema from registered schemas
   */
  public getOpenAPISchemas(): Record<string, any> {
    const schemas: Record<string, any> = {};
    
    for (const [id, validate] of this.compiledSchemas) {
      // Note: This is a simplified version. In a real implementation,
      // you'd want to store the original schemas to convert to OpenAPI format
      schemas[id] = {
        type: 'object',
        description: `Schema for ${id}`,
        // Additional properties would be populated from the original schema
      };
    }
    
    return schemas;
  }
}

// Singleton instance
export const schemaValidator = new SchemaValidator();