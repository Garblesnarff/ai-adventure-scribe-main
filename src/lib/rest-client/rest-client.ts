/**
 * RESTful Client Library with HATEOAS Support
 * 
 * A hypermedia-driven client that follows REST constraints and uses
 * hypermedia links for navigation rather than constructing URLs.
 */

import { HALLinks, HALResource } from '../../server/src/lib/hypermedia/hypermedia-builder';

export interface RestClientConfig {
  baseUrl: string;
  defaultHeaders?: Record<string, string>;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface RestResponse<T = any> {
  data: T;
  _links?: HALLinks;
  _embedded?: Record<string, any>;
  headers: Headers;
  status: number;
  statusText: string;
}

export interface CollectionResponse<T = any> extends RestResponse<T[]> {
  meta: {
    totalCount: number;
    count: number;
    pagination: {
      current: number;
      limit: number;
      offset: number;
      totalPages: number;
      hasNext: boolean;
      hasPrevious: boolean;
    };
  };
}

export interface RestError extends Error {
  status: number;
  type: string;
  title: string;
  detail: string;
  instance?: string;
  validationErrors?: Array<{
    field: string;
    message: string;
    value?: any;
    allowedValues?: any[];
  }>;
}

export class RestClient {
  private config: RestClientConfig;
  private cache: Map<string, { data: any; etag: string; timestamp: number; ttl: number }>;

  constructor(config: RestClientConfig) {
    this.config = {
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      ...config
    };
    
    this.cache = new Map();
  }

  /**
   * Discover API capabilities from the root endpoint
   */
  async discover(): Promise<HALResource> {
    const response = await this.request('GET', '/');
    return response;
  }

  /**
   * Follow a hypermedia link
   */
  async follow<T = any>(link: any, params?: Record<string, any>): Promise<RestResponse<T>> {
    if (typeof link === 'string') {
      return this.request('GET', link, undefined, params);
    }

    if (link.href) {
      let url = link.href;
      
      // Handle URI templates
      if (link.templated && params) {
        url = this.expandUriTemplate(url, params);
      }

      const method = link.method || 'GET';
      const headers = link.type ? { 'Content-Type': link.type } : undefined;
      
      return this.request(method, url, undefined, params, headers);
    }

    throw new Error('Invalid link format');
  }

  /**
   * Get a resource with caching and conditional requests
   */
  async get<T = any>(url: string, params?: Record<string, any>): Promise<RestResponse<T>> {
    const fullUrl = this.buildUrl(url, params);
    const cacheKey = `GET:${fullUrl}`;
    const cached = this.cache.get(cacheKey);
    
    const headers: Record<string, string> = {};
    
    // Add If-None-Match header for conditional requests
    if (cached && cached.etag) {
      headers['If-None-Match'] = cached.etag;
    }

    try {
      const response = await this.request<T>('GET', url, undefined, params, headers);
      
      // Cache successful responses
      if (response.headers.get('etag')) {
        this.cache.set(cacheKey, {
          data: response,
          etag: response.headers.get('etag')!,
          timestamp: Date.now(),
          ttl: this.parseCacheControl(response.headers.get('cache-control'))
        });
      }
      
      return response;
    } catch (error: any) {
      // Return cached data for 304 Not Modified
      if (error.status === 304 && cached) {
        return cached.data;
      }
      throw error;
    }
  }

  /**
   * Create a new resource
   */
  async post<T = any>(url: string, data: any): Promise<RestResponse<T>> {
    return this.request('POST', url, data);
  }

  /**
   * Update a resource (full replacement)
   */
  async put<T = any>(url: string, data: any, etag?: string): Promise<RestResponse<T>> {
    const headers: Record<string, string> = {};
    if (etag) {
      headers['If-Match'] = etag;
    }
    
    return this.request('PUT', url, data, undefined, headers);
  }

  /**
   * Partially update a resource
   */
  async patch<T = any>(url: string, data: any, etag?: string): Promise<RestResponse<T>> {
    const headers: Record<string, string> = {};
    if (etag) {
      headers['If-Match'] = etag;
    }
    
    return this.request('PATCH', url, data, undefined, headers);
  }

  /**
   * Delete a resource
   */
  async delete(url: string, etag?: string): Promise<void> {
    const headers: Record<string, string> = {};
    if (etag) {
      headers['If-Match'] = etag;
    }
    
    await this.request('DELETE', url, undefined, undefined, headers);
  }

  /**
   * Get available options for a resource
   */
  async options(url: string): Promise<{ allowedMethods: string[]; headers: Headers }> {
    const response = await this.fetch('OPTIONS', url);
    
    return {
      allowedMethods: (response.headers.get('allow') || '').split(',').map(m => m.trim()),
      headers: response.headers
    };
  }

  /**
   * Navigate through paginated collections
   */
  async navigateCollection<T = any>(
    initialUrl: string,
    callback: (items: T[], response: CollectionResponse<T>) => boolean | Promise<boolean>
  ): Promise<void> {
    let currentUrl: string | null = initialUrl;
    
    while (currentUrl) {
      const response = await this.get<T[]>(currentUrl) as CollectionResponse<T>;
      
      const shouldContinue = await callback(response.data, response);
      
      if (!shouldContinue) {
        break;
      }
      
      // Follow next link if available
      currentUrl = response._links?.next?.href || null;
    }
  }

  /**
   * Batch operations using hypermedia links
   */
  async batch(operations: Array<{
    link: any;
    data?: any;
    params?: Record<string, any>;
  }>): Promise<RestResponse[]> {
    const promises = operations.map(op => 
      this.follow(op.link, op.params).then(response => {
        if (op.data && response._links?.edit) {
          return this.follow(response._links.edit, op.data);
        }
        return response;
      })
    );

    return Promise.all(promises);
  }

  /**
   * Core request method with retry logic and error handling
   */
  private async request<T = any>(
    method: string,
    url: string,
    data?: any,
    params?: Record<string, any>,
    headers?: Record<string, string>
  ): Promise<RestResponse<T>> {
    let lastError: Error;
    
    for (let attempt = 0; attempt < this.config.retryAttempts!; attempt++) {
      try {
        return await this.fetch<T>(method, url, data, params, headers);
      } catch (error: any) {
        lastError = error;
        
        // Don't retry client errors (4xx) except 429
        if (error.status >= 400 && error.status < 500 && error.status !== 429) {
          break;
        }
        
        // Wait before retrying
        if (attempt < this.config.retryAttempts! - 1) {
          const delay = error.status === 429 
            ? this.parseRetryAfter(error.headers?.get('retry-after'))
            : this.config.retryDelay! * Math.pow(2, attempt); // Exponential backoff
            
          await this.sleep(delay);
        }
      }
    }
    
    throw lastError!;
  }

  /**
   * Low-level fetch wrapper
   */
  private async fetch<T = any>(
    method: string,
    url: string,
    data?: any,
    params?: Record<string, any>,
    headers?: Record<string, string>
  ): Promise<RestResponse<T>> {
    const fullUrl = this.buildUrl(url, params);
    const requestHeaders = new Headers({
      'Accept': 'application/hal+json, application/json',
      'Content-Type': 'application/json',
      ...this.config.defaultHeaders,
      ...headers
    });

    const requestInit: RequestInit = {
      method,
      headers: requestHeaders,
      signal: AbortSignal.timeout(this.config.timeout!)
    };

    if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
      requestInit.body = JSON.stringify(data);
    }

    const response = await fetch(fullUrl, requestInit);
    
    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    let responseData: any = null;
    
    if (response.status !== 204) { // No Content
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/json') || contentType?.includes('application/hal+json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }
    }

    return {
      data: responseData,
      _links: responseData?._links,
      _embedded: responseData?._embedded,
      headers: response.headers,
      status: response.status,
      statusText: response.statusText
    };
  }

  /**
   * Handle error responses
   */
  private async handleErrorResponse(response: Response): Promise<never> {
    let errorData: any = {};
    
    try {
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json') || contentType?.includes('application/problem+json')) {
        errorData = await response.json();
      }
    } catch {
      // Ignore JSON parsing errors
    }

    const error: RestError = Object.assign(new Error(errorData.detail || response.statusText), {
      status: response.status,
      type: errorData.type || `https://httpstatuses.com/${response.status}`,
      title: errorData.title || response.statusText,
      detail: errorData.detail || `HTTP ${response.status} error`,
      instance: errorData.instance,
      validationErrors: errorData.validationErrors,
      headers: response.headers
    });

    throw error;
  }

  /**
   * Build full URL with base URL and query parameters
   */
  private buildUrl(url: string, params?: Record<string, any>): string {
    let fullUrl = url.startsWith('http') ? url : `${this.config.baseUrl}${url}`;
    
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => searchParams.append(key, String(v)));
          } else {
            searchParams.set(key, String(value));
          }
        }
      });
      
      const queryString = searchParams.toString();
      if (queryString) {
        fullUrl += (fullUrl.includes('?') ? '&' : '?') + queryString;
      }
    }
    
    return fullUrl;
  }

  /**
   * Expand URI template with parameters
   */
  private expandUriTemplate(template: string, params: Record<string, any>): string {
    return template.replace(/\{([^}]+)\}/g, (match, key) => {
      const value = params[key];
      return value !== undefined ? encodeURIComponent(String(value)) : match;
    });
  }

  /**
   * Parse Cache-Control header to get TTL
   */
  private parseCacheControl(cacheControl: string | null): number {
    if (!cacheControl) return 0;
    
    const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
    return maxAgeMatch ? parseInt(maxAgeMatch[1], 10) * 1000 : 0;
  }

  /**
   * Parse Retry-After header
   */
  private parseRetryAfter(retryAfter: string | null): number {
    if (!retryAfter) return this.config.retryDelay!;
    
    const seconds = parseInt(retryAfter, 10);
    return isNaN(seconds) ? this.config.retryDelay! : seconds * 1000;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear cache (useful for testing or memory management)
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hits: number; misses: number } {
    return {
      size: this.cache.size,
      hits: 0, // Would need to track in a real implementation
      misses: 0
    };
  }
}