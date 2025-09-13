/**
 * Base REST Resource Class
 * 
 * Provides a foundation for all RESTful resources following Richardson Maturity Model Level 3
 * with full HATEOAS support, proper HTTP semantics, and comprehensive error handling.
 */

import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { HypermediaBuilder } from '../hypermedia/hypermedia-builder';
import { CacheManager } from '../cache/cache-manager';
import { ValidationError, NotFoundError, ConflictError } from './rest-errors';

export interface RestResourceOptions {
  resourceName: string;
  resourcePath: string;
  idField?: string;
  allowedMethods?: HttpMethod[];
  cacheTTL?: number;
  supportsPagination?: boolean;
  supportsFiltering?: boolean;
  supportsSorting?: boolean;
  supportsFieldSelection?: boolean;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export interface PaginationOptions {
  cursor?: string;
  limit?: number;
  offset?: number;
  page?: number;
}

export interface FilterOptions {
  [key: string]: any;
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

export interface FieldSelectionOptions {
  fields: string[];
  exclude?: string[];
}

export abstract class BaseRestResource {
  protected db: Pool;
  protected hypermedia: HypermediaBuilder;
  protected cache: CacheManager;
  protected options: RestResourceOptions;

  constructor(db: Pool, options: RestResourceOptions) {
    this.db = db;
    this.options = {
      idField: 'id',
      allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
      cacheTTL: 300, // 5 minutes default
      supportsPagination: true,
      supportsFiltering: true,
      supportsSorting: true,
      supportsFieldSelection: true,
      ...options
    };
    this.hypermedia = new HypermediaBuilder(this.options.resourcePath);
    this.cache = new CacheManager();
  }

  /**
   * Handle GET requests for resource collections
   */
  public async handleCollection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { pagination, filters, sort, fieldSelection } = this.parseQueryParams(req);
      
      const cacheKey = this.generateCacheKey('collection', req.query);
      const cached = await this.cache.get(cacheKey);
      
      if (cached) {
        this.sendCachedResponse(res, cached);
        return;
      }

      const data = await this.getCollection(pagination, filters, sort, fieldSelection);
      const totalCount = await this.getTotalCount(filters);
      
      const response = this.buildCollectionResponse(data, totalCount, req, pagination);
      
      await this.cache.set(cacheKey, response, this.options.cacheTTL);
      
      this.sendResponse(res, 200, response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle GET requests for individual resources
   */
  public async handleResource(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id;
      const { fieldSelection } = this.parseQueryParams(req);
      
      const cacheKey = this.generateCacheKey('resource', { id, ...req.query });
      const cached = await this.cache.get(cacheKey);
      
      if (cached) {
        this.sendCachedResponse(res, cached);
        return;
      }

      const resource = await this.getResource(id, fieldSelection);
      
      if (!resource) {
        throw new NotFoundError(`${this.options.resourceName} not found`);
      }

      const response = this.buildResourceResponse(resource, req);
      
      await this.cache.set(cacheKey, response, this.options.cacheTTL);
      
      const etag = this.generateETag(resource);
      this.sendResponse(res, 200, response, { etag });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle POST requests to create new resources
   */
  public async handleCreate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = req.body;
      await this.validateCreateData(data);
      
      const resource = await this.createResource(data);
      const response = this.buildResourceResponse(resource, req);
      
      // Invalidate collection cache
      await this.cache.invalidatePattern(`${this.options.resourceName}:collection:*`);
      
      const location = `${req.protocol}://${req.get('host')}${this.options.resourcePath}/${resource[this.options.idField!]}`;
      
      this.sendResponse(res, 201, response, { 
        location,
        etag: this.generateETag(resource)
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle PUT requests to update entire resources
   */
  public async handleUpdate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id;
      const data = req.body;
      
      await this.validateUpdateData(data);
      
      const existingResource = await this.getResource(id);
      if (!existingResource) {
        throw new NotFoundError(`${this.options.resourceName} not found`);
      }

      // Check for conditional requests
      if (req.headers['if-match']) {
        const currentETag = this.generateETag(existingResource);
        if (req.headers['if-match'] !== currentETag) {
          throw new ConflictError('Resource has been modified');
        }
      }

      const updatedResource = await this.updateResource(id, data);
      const response = this.buildResourceResponse(updatedResource, req);
      
      // Invalidate caches
      await this.invalidateResourceCaches(id);
      
      this.sendResponse(res, 200, response, {
        etag: this.generateETag(updatedResource)
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle PATCH requests for partial updates
   */
  public async handlePartialUpdate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id;
      const data = req.body;
      
      await this.validatePatchData(data);
      
      const existingResource = await this.getResource(id);
      if (!existingResource) {
        throw new NotFoundError(`${this.options.resourceName} not found`);
      }

      // Check for conditional requests
      if (req.headers['if-match']) {
        const currentETag = this.generateETag(existingResource);
        if (req.headers['if-match'] !== currentETag) {
          throw new ConflictError('Resource has been modified');
        }
      }

      const updatedResource = await this.patchResource(id, data);
      const response = this.buildResourceResponse(updatedResource, req);
      
      // Invalidate caches
      await this.invalidateResourceCaches(id);
      
      this.sendResponse(res, 200, response, {
        etag: this.generateETag(updatedResource)
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle DELETE requests
   */
  public async handleDelete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id;
      
      const existingResource = await this.getResource(id);
      if (!existingResource) {
        throw new NotFoundError(`${this.options.resourceName} not found`);
      }

      // Check for conditional requests
      if (req.headers['if-match']) {
        const currentETag = this.generateETag(existingResource);
        if (req.headers['if-match'] !== currentETag) {
          throw new ConflictError('Resource has been modified');
        }
      }

      await this.deleteResource(id);
      
      // Invalidate caches
      await this.invalidateResourceCaches(id);
      
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle OPTIONS requests for CORS and method discovery
   */
  public async handleOptions(req: Request, res: Response): Promise<void> {
    const allowedMethods = this.options.allowedMethods!.join(', ');
    
    res.set({
      'Allow': allowedMethods,
      'Access-Control-Allow-Methods': allowedMethods,
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, If-Match, If-None-Match',
      'Access-Control-Max-Age': '86400'
    });
    
    res.status(200).end();
  }

  // Abstract methods to be implemented by concrete resources
  protected abstract getCollection(
    pagination?: PaginationOptions,
    filters?: FilterOptions,
    sort?: SortOptions[],
    fieldSelection?: FieldSelectionOptions
  ): Promise<any[]>;

  protected abstract getTotalCount(filters?: FilterOptions): Promise<number>;

  protected abstract getResource(id: string, fieldSelection?: FieldSelectionOptions): Promise<any>;

  protected abstract createResource(data: any): Promise<any>;

  protected abstract updateResource(id: string, data: any): Promise<any>;

  protected abstract patchResource(id: string, data: any): Promise<any>;

  protected abstract deleteResource(id: string): Promise<void>;

  protected abstract validateCreateData(data: any): Promise<void>;

  protected abstract validateUpdateData(data: any): Promise<void>;

  protected abstract validatePatchData(data: any): Promise<void>;

  // Utility methods
  protected parseQueryParams(req: Request) {
    return {
      pagination: this.parsePaginationParams(req.query),
      filters: this.parseFilterParams(req.query),
      sort: this.parseSortParams(req.query),
      fieldSelection: this.parseFieldSelectionParams(req.query)
    };
  }

  protected parsePaginationParams(query: any): PaginationOptions {
    return {
      cursor: query.cursor,
      limit: query.limit ? parseInt(query.limit, 10) : 20,
      offset: query.offset ? parseInt(query.offset, 10) : 0,
      page: query.page ? parseInt(query.page, 10) : 1
    };
  }

  protected parseFilterParams(query: any): FilterOptions {
    const filters: FilterOptions = {};
    
    Object.keys(query).forEach(key => {
      if (!['cursor', 'limit', 'offset', 'page', 'sort', 'fields', 'exclude'].includes(key)) {
        filters[key] = query[key];
      }
    });
    
    return filters;
  }

  protected parseSortParams(query: any): SortOptions[] {
    if (!query.sort) return [];
    
    const sorts = Array.isArray(query.sort) ? query.sort : [query.sort];
    
    return sorts.map((sort: string) => {
      if (sort.startsWith('-')) {
        return { field: sort.substring(1), direction: 'desc' as const };
      }
      return { field: sort, direction: 'asc' as const };
    });
  }

  protected parseFieldSelectionParams(query: any): FieldSelectionOptions | undefined {
    if (!query.fields && !query.exclude) return undefined;
    
    return {
      fields: query.fields ? query.fields.split(',') : [],
      exclude: query.exclude ? query.exclude.split(',') : []
    };
  }

  protected buildCollectionResponse(data: any[], totalCount: number, req: Request, pagination: PaginationOptions) {
    const response = {
      data,
      meta: {
        totalCount,
        count: data.length,
        pagination: this.buildPaginationMeta(totalCount, pagination, req)
      },
      _links: this.hypermedia.buildCollectionLinks(req, pagination, totalCount)
    };

    return response;
  }

  protected buildResourceResponse(resource: any, req: Request) {
    return {
      data: resource,
      _links: this.hypermedia.buildResourceLinks(resource, req)
    };
  }

  protected buildPaginationMeta(totalCount: number, pagination: PaginationOptions, req: Request) {
    const { limit = 20, offset = 0, page = 1 } = pagination;
    const totalPages = Math.ceil(totalCount / limit);
    
    return {
      current: page,
      limit,
      offset,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1
    };
  }

  protected generateCacheKey(type: string, params: any): string {
    const paramStr = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    
    return `${this.options.resourceName}:${type}:${paramStr}`;
  }

  protected generateETag(resource: any): string {
    const content = JSON.stringify(resource);
    return `"${Buffer.from(content).toString('base64').slice(0, 16)}"`;
  }

  protected sendResponse(res: Response, status: number, data: any, headers?: any) {
    if (headers) {
      res.set(headers);
    }
    
    res.set({
      'Content-Type': 'application/hal+json',
      'Cache-Control': `max-age=${this.options.cacheTTL}`,
      'Vary': 'Accept, Authorization'
    });
    
    res.status(status).json(data);
  }

  protected sendCachedResponse(res: Response, data: any) {
    res.set({
      'Content-Type': 'application/hal+json',
      'X-Cache': 'HIT'
    });
    
    res.json(data);
  }

  protected async invalidateResourceCaches(id: string) {
    await this.cache.invalidatePattern(`${this.options.resourceName}:resource:*id:${id}*`);
    await this.cache.invalidatePattern(`${this.options.resourceName}:collection:*`);
  }
}