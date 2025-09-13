/**
 * React Hooks for RESTful API Integration
 * 
 * Provides React hooks that follow REST principles with HATEOAS support,
 * optimistic updates, and proper error handling.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { RestClient, RestResponse, CollectionResponse, RestError } from './rest-client';

export interface UseRestResourceOptions {
  enabled?: boolean;
  refetchOnWindowFocus?: boolean;
  refetchInterval?: number;
  staleTime?: number;
  cacheTime?: number;
  retry?: boolean | number;
  retryDelay?: number;
  suspense?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: RestError) => void;
}

export interface UseRestResourceResult<T> {
  data: T | null;
  isLoading: boolean;
  isError: boolean;
  error: RestError | null;
  isStale: boolean;
  refetch: () => Promise<void>;
  _links?: any;
  _embedded?: any;
}

export interface UseRestMutationOptions<TData, TVariables> {
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: RestError, variables: TVariables) => void;
  onMutate?: (variables: TVariables) => Promise<any> | any;
  onSettled?: (data: TData | undefined, error: RestError | null, variables: TVariables) => void;
  retry?: boolean | number;
}

export interface UseRestMutationResult<TData, TVariables> {
  mutate: (variables: TVariables) => Promise<TData>;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  data: TData | undefined;
  isLoading: boolean;
  isError: boolean;
  error: RestError | null;
  isSuccess: boolean;
  reset: () => void;
}

export interface UseRestCollectionOptions extends UseRestResourceOptions {
  keepPreviousData?: boolean;
  placeholderData?: any[];
}

export interface UseRestCollectionResult<T> extends UseRestResourceResult<T[]> {
  meta: {
    totalCount: number;
    count: number;
    pagination: any;
  } | null;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  fetchNextPage: () => Promise<void>;
  fetchPreviousPage: () => Promise<void>;
  isFetchingNextPage: boolean;
  isFetchingPreviousPage: boolean;
}

// Cache for storing resource data
const resourceCache = new Map<string, {
  data: any;
  timestamp: number;
  staleTime: number;
  links?: any;
  embedded?: any;
}>();

/**
 * Hook for fetching a single REST resource with caching and hypermedia support
 */
export function useRestResource<T = any>(
  client: RestClient,
  url: string | null,
  options: UseRestResourceOptions = {}
): UseRestResourceResult<T> {
  const {
    enabled = true,
    refetchOnWindowFocus = true,
    refetchInterval,
    staleTime = 5 * 60 * 1000, // 5 minutes
    cacheTime = 10 * 60 * 1000, // 10 minutes
    retry = 3,
    onSuccess,
    onError
  } = options;

  const [state, setState] = useState<{
    data: T | null;
    isLoading: boolean;
    isError: boolean;
    error: RestError | null;
    _links?: any;
    _embedded?: any;
  }>({
    data: null,
    isLoading: false,
    isError: false,
    error: null
  });

  const mountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const cacheKey = url ? `resource:${url}` : null;

  const isStale = useMemo(() => {
    if (!cacheKey) return false;
    const cached = resourceCache.get(cacheKey);
    if (!cached) return true;
    return Date.now() - cached.timestamp > cached.staleTime;
  }, [cacheKey, state.data]);

  const fetchResource = useCallback(async (forceRefetch = false) => {
    if (!url || !enabled) return;

    // Check cache first
    if (!forceRefetch && cacheKey) {
      const cached = resourceCache.get(cacheKey);
      if (cached && !isStale) {
        setState(prev => ({
          ...prev,
          data: cached.data,
          isLoading: false,
          isError: false,
          error: null,
          _links: cached.links,
          _embedded: cached.embedded
        }));
        return;
      }
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await client.get<T>(url);
      
      if (!mountedRef.current) return;

      // Cache the response
      if (cacheKey) {
        resourceCache.set(cacheKey, {
          data: response.data,
          timestamp: Date.now(),
          staleTime,
          links: response._links,
          embedded: response._embedded
        });
      }

      setState({
        data: response.data,
        isLoading: false,
        isError: false,
        error: null,
        _links: response._links,
        _embedded: response._embedded
      });

      onSuccess?.(response.data);
    } catch (error: any) {
      if (!mountedRef.current) return;

      setState(prev => ({
        ...prev,
        isLoading: false,
        isError: true,
        error: error as RestError
      }));

      onError?.(error as RestError);
    }
  }, [url, enabled, client, cacheKey, isStale, staleTime, onSuccess, onError]);

  const refetch = useCallback(() => fetchResource(true), [fetchResource]);

  // Initial fetch
  useEffect(() => {
    fetchResource();
  }, [fetchResource]);

  // Refetch on window focus
  useEffect(() => {
    if (!refetchOnWindowFocus) return;

    const handleFocus = () => {
      if (isStale) {
        fetchResource();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetchOnWindowFocus, isStale, fetchResource]);

  // Refetch interval
  useEffect(() => {
    if (!refetchInterval) return;

    const interval = setInterval(() => {
      fetchResource();
    }, refetchInterval);

    return () => clearInterval(interval);
  }, [refetchInterval, fetchResource]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    ...state,
    isStale,
    refetch
  };
}

/**
 * Hook for fetching collections with pagination support
 */
export function useRestCollection<T = any>(
  client: RestClient,
  url: string | null,
  params?: Record<string, any>,
  options: UseRestCollectionOptions = {}
): UseRestCollectionResult<T> {
  const {
    keepPreviousData = false,
    placeholderData
  } = options;

  const [paginationState, setPaginationState] = useState({
    isFetchingNextPage: false,
    isFetchingPreviousPage: false
  });

  const fullUrl = useMemo(() => {
    if (!url) return null;
    if (!params || Object.keys(params).length === 0) return url;
    
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.set(key, String(value));
      }
    });
    
    return `${url}?${searchParams.toString()}`;
  }, [url, params]);

  const resourceResult = useRestResource<T[]>(client, fullUrl, options);

  const collectionResponse = resourceResult.data as any as CollectionResponse<T> | null;
  
  const meta = collectionResponse?.meta || null;
  const hasNextPage = Boolean(resourceResult._links?.next);
  const hasPreviousPage = Boolean(resourceResult._links?.prev);

  const fetchNextPage = useCallback(async () => {
    if (!hasNextPage || paginationState.isFetchingNextPage) return;

    setPaginationState(prev => ({ ...prev, isFetchingNextPage: true }));
    
    try {
      await client.follow(resourceResult._links.next);
      // The useRestResource hook will handle the state update
    } finally {
      setPaginationState(prev => ({ ...prev, isFetchingNextPage: false }));
    }
  }, [hasNextPage, paginationState.isFetchingNextPage, client, resourceResult._links]);

  const fetchPreviousPage = useCallback(async () => {
    if (!hasPreviousPage || paginationState.isFetchingPreviousPage) return;

    setPaginationState(prev => ({ ...prev, isFetchingPreviousPage: true }));
    
    try {
      await client.follow(resourceResult._links.prev);
      // The useRestResource hook will handle the state update
    } finally {
      setPaginationState(prev => ({ ...prev, isFetchingPreviousPage: false }));
    }
  }, [hasPreviousPage, paginationState.isFetchingPreviousPage, client, resourceResult._links]);

  return {
    ...resourceResult,
    data: collectionResponse?.data || resourceResult.data || (placeholderData as T[]) || null,
    meta,
    hasNextPage,
    hasPreviousPage,
    fetchNextPage,
    fetchPreviousPage,
    isFetchingNextPage: paginationState.isFetchingNextPage,
    isFetchingPreviousPage: paginationState.isFetchingPreviousPage
  };
}

/**
 * Hook for REST mutations (POST, PUT, PATCH, DELETE) with optimistic updates
 */
export function useRestMutation<TData = any, TVariables = any>(
  client: RestClient,
  mutationFn: (variables: TVariables) => Promise<RestResponse<TData>>,
  options: UseRestMutationOptions<TData, TVariables> = {}
): UseRestMutationResult<TData, TVariables> {
  const {
    onSuccess,
    onError,
    onMutate,
    onSettled,
    retry = false
  } = options;

  const [state, setState] = useState<{
    data: TData | undefined;
    isLoading: boolean;
    isError: boolean;
    error: RestError | null;
    isSuccess: boolean;
  }>({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    isSuccess: false
  });

  const mutateAsync = useCallback(async (variables: TVariables): Promise<TData> => {
    setState({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      isSuccess: false
    });

    try {
      // Call onMutate for optimistic updates
      await onMutate?.(variables);

      const response = await mutationFn(variables);
      
      setState({
        data: response.data,
        isLoading: false,
        isError: false,
        error: null,
        isSuccess: true
      });

      onSuccess?.(response.data, variables);
      onSettled?.(response.data, null, variables);

      return response.data;
    } catch (error: any) {
      const restError = error as RestError;
      
      setState({
        data: undefined,
        isLoading: false,
        isError: true,
        error: restError,
        isSuccess: false
      });

      onError?.(restError, variables);
      onSettled?.(undefined, restError, variables);

      throw restError;
    }
  }, [mutationFn, onMutate, onSuccess, onError, onSettled]);

  const mutate = useCallback((variables: TVariables) => {
    mutateAsync(variables).catch(() => {
      // Error is already handled in mutateAsync
    });
    return Promise.resolve() as any; // For backward compatibility
  }, [mutateAsync]);

  const reset = useCallback(() => {
    setState({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
      isSuccess: false
    });
  }, []);

  return {
    ...state,
    mutate,
    mutateAsync,
    reset
  };
}

/**
 * Hook for creating REST resources
 */
export function useCreateResource<TData = any, TVariables = any>(
  client: RestClient,
  url: string,
  options?: UseRestMutationOptions<TData, TVariables>
) {
  return useRestMutation<TData, TVariables>(
    client,
    async (variables: TVariables) => client.post<TData>(url, variables),
    options
  );
}

/**
 * Hook for updating REST resources
 */
export function useUpdateResource<TData = any, TVariables = any>(
  client: RestClient,
  options?: UseRestMutationOptions<TData, TVariables>
) {
  return useRestMutation<TData, TVariables & { id: string; etag?: string }>(
    client,
    async (variables) => {
      const { id, etag, ...data } = variables as any;
      return client.put<TData>(`/${id}`, data, etag);
    },
    options
  );
}

/**
 * Hook for partially updating REST resources
 */
export function usePatchResource<TData = any, TVariables = any>(
  client: RestClient,
  options?: UseRestMutationOptions<TData, TVariables>
) {
  return useRestMutation<TData, TVariables & { id: string; etag?: string }>(
    client,
    async (variables) => {
      const { id, etag, ...data } = variables as any;
      return client.patch<TData>(`/${id}`, data, etag);
    },
    options
  );
}

/**
 * Hook for deleting REST resources
 */
export function useDeleteResource(
  client: RestClient,
  options?: UseRestMutationOptions<void, { id: string; etag?: string }>
) {
  return useRestMutation<void, { id: string; etag?: string }>(
    client,
    async ({ id, etag }) => {
      await client.delete(`/${id}`, etag);
      return { data: undefined } as any;
    },
    options
  );
}

/**
 * Hook for following hypermedia links
 */
export function useFollowLink<T = any>(
  client: RestClient,
  options: UseRestMutationOptions<T, { link: any; params?: Record<string, any> }> = {}
) {
  return useRestMutation<T, { link: any; params?: Record<string, any> }>(
    client,
    async ({ link, params }) => client.follow<T>(link, params),
    options
  );
}

/**
 * Clear the resource cache
 */
export function clearRestCache(): void {
  resourceCache.clear();
}

/**
 * Invalidate specific cache entries
 */
export function invalidateRestCache(pattern: string): void {
  for (const key of resourceCache.keys()) {
    if (key.includes(pattern)) {
      resourceCache.delete(key);
    }
  }
}