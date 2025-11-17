/**
 * TokenImage Component
 *
 * Loads and displays token images with fallback support and various visual effects.
 * Handles texture loading, caching, error states, and applies tinting/opacity.
 *
 * @module components/battle-map/TokenImage
 */

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { TokenType } from '@/types/token';
import logger from '@/lib/logger';

// ===========================
// Constants
// ===========================

/**
 * Default token images for each type
 * These are fallback images when no token image is provided
 */
const DEFAULT_TOKEN_IMAGES: Record<TokenType, string> = {
  [TokenType.CHARACTER]: '/assets/tokens/default-character.png',
  [TokenType.NPC]: '/assets/tokens/default-npc.png',
  [TokenType.MONSTER]: '/assets/tokens/default-monster.png',
  [TokenType.OBJECT]: '/assets/tokens/default-object.png',
};

/**
 * Texture cache to prevent reloading the same images
 */
const textureCache = new Map<string, THREE.Texture>();

// ===========================
// Props Interface
// ===========================

export interface TokenImageProps {
  /** Primary image URL */
  imageUrl: string;
  /** Fallback to character portrait if token image fails */
  portraitUrl?: string;
  /** Token type for default image selection */
  tokenType: TokenType;
  /** Size of the token image plane */
  size: number;
  /** Whether to use circular mask */
  circular?: boolean;
  /** Tint color to apply (hex string) */
  tintColor?: string;
  /** Opacity (0-1) */
  opacity?: number;
  /** Corner radius for rounded squares (0-0.5, only used if circular is false) */
  borderRadius?: number;
  /** Z-position offset */
  zOffset?: number;
  /** Callback when image loads successfully */
  onLoad?: () => void;
  /** Callback when image fails to load */
  onError?: (error: Error) => void;
}

// ===========================
// Component
// ===========================

/**
 * TokenImage Component
 *
 * Renders token image with texture loading, caching, and visual effects.
 * Supports circular and square tokens with optional masking.
 *
 * @example
 * ```tsx
 * <TokenImage
 *   imageUrl="https://example.com/token.png"
 *   tokenType={TokenType.CHARACTER}
 *   size={100}
 *   circular={true}
 *   opacity={1}
 * />
 * ```
 */
export const TokenImage: React.FC<TokenImageProps> = ({
  imageUrl,
  portraitUrl,
  tokenType,
  size,
  circular = true,
  tintColor,
  opacity = 1,
  borderRadius = 0.1,
  zOffset = 0,
  onLoad,
  onError,
}) => {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [loadingState, setLoadingState] = useState<'loading' | 'success' | 'error'>('loading');
  const textureRef = useRef<THREE.Texture | null>(null);
  const { invalidate } = useThree();

  // Get the default image for this token type
  const defaultImageUrl = DEFAULT_TOKEN_IMAGES[tokenType] || DEFAULT_TOKEN_IMAGES[TokenType.CHARACTER];

  // Create material color from tint
  const materialColor = useMemo(() => {
    if (!tintColor) return new THREE.Color(0xffffff);
    return new THREE.Color(tintColor);
  }, [tintColor]);

  /**
   * Load texture with caching and fallback support
   */
  const loadTexture = useCallback(
    async (url: string, isFallback: boolean = false) => {
      // Check cache first
      if (textureCache.has(url)) {
        const cachedTexture = textureCache.get(url)!;
        setTexture(cachedTexture.clone());
        setLoadingState('success');
        if (onLoad) onLoad();
        invalidate();
        return;
      }

      const loader = new THREE.TextureLoader();

      try {
        const loadedTexture = await new Promise<THREE.Texture>((resolve, reject) => {
          loader.load(
            url,
            (tex) => resolve(tex),
            undefined,
            (error) => reject(error)
          );
        });

        // Configure texture
        loadedTexture.colorSpace = THREE.SRGBColorSpace;
        loadedTexture.minFilter = THREE.LinearMipmapLinearFilter;
        loadedTexture.magFilter = THREE.LinearFilter;
        loadedTexture.generateMipmaps = true;
        loadedTexture.anisotropy = 16;

        // Center the texture
        loadedTexture.offset.set(0.5, 0.5);
        loadedTexture.center.set(0.5, 0.5);

        // Cache the texture
        textureCache.set(url, loadedTexture);

        // Dispose old texture
        if (textureRef.current) {
          textureRef.current.dispose();
        }

        textureRef.current = loadedTexture.clone();
        setTexture(textureRef.current);
        setLoadingState('success');
        if (onLoad) onLoad();
        invalidate();

        logger.debug('Token texture loaded', { url, cached: false });
      } catch (error) {
        logger.error('Failed to load token texture', { error, url });

        // Try fallbacks
        if (!isFallback) {
          if (portraitUrl && portraitUrl !== url) {
            logger.info('Trying portrait fallback', { portraitUrl });
            await loadTexture(portraitUrl, true);
          } else if (defaultImageUrl !== url) {
            logger.info('Trying default token image', { defaultImageUrl });
            await loadTexture(defaultImageUrl, true);
          } else {
            setLoadingState('error');
            if (onError) {
              onError(error instanceof Error ? error : new Error('Failed to load texture'));
            }
          }
        } else {
          setLoadingState('error');
          if (onError) {
            onError(error instanceof Error ? error : new Error('Failed to load texture'));
          }
        }
      }
    },
    [portraitUrl, defaultImageUrl, onLoad, onError, invalidate]
  );

  // Load texture when imageUrl changes
  useEffect(() => {
    setLoadingState('loading');
    loadTexture(imageUrl);
  }, [imageUrl, loadTexture]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (textureRef.current) {
        textureRef.current.dispose();
        textureRef.current = null;
      }
    };
  }, []);

  // Create geometry based on shape
  const geometry = useMemo(() => {
    if (circular) {
      return new THREE.CircleGeometry(size / 2, 32);
    } else {
      return new THREE.PlaneGeometry(size, size);
    }
  }, [size, circular]);

  // Cleanup geometry on unmount
  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  // Loading state - show placeholder
  if (loadingState === 'loading' || !texture) {
    return (
      <mesh position={[0, 0, zOffset]} geometry={geometry}>
        <meshBasicMaterial color="#333333" opacity={0.5} transparent />
      </mesh>
    );
  }

  // Error state - show colored placeholder
  if (loadingState === 'error') {
    return (
      <mesh position={[0, 0, zOffset]} geometry={geometry}>
        <meshBasicMaterial color="#ff6b6b" opacity={0.6} transparent />
      </mesh>
    );
  }

  // Success - render token image
  return (
    <mesh position={[0, 0, zOffset]} geometry={geometry}>
      <meshBasicMaterial
        map={texture}
        color={materialColor}
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
        toneMapped={false}
        alphaTest={0.1}
      />
    </mesh>
  );
};

/**
 * Hook to preload token images for better performance
 *
 * @param urls Array of image URLs to preload
 * @returns Loading state and progress
 *
 * @example
 * ```tsx
 * const { isLoading, progress } = usePreloadTokenImages([
 *   'https://example.com/token1.png',
 *   'https://example.com/token2.png',
 * ]);
 * ```
 */
export const usePreloadTokenImages = (urls: string[]) => {
  const [loadingCount, setLoadingCount] = useState(0);
  const [totalCount] = useState(urls.length);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    let mounted = true;

    const loadImages = async () => {
      for (const url of urls) {
        if (!mounted) break;

        // Skip if already cached
        if (textureCache.has(url)) {
          setLoadingCount((prev) => prev + 1);
          continue;
        }

        try {
          const texture = await new Promise<THREE.Texture>((resolve, reject) => {
            loader.load(url, resolve, undefined, reject);
          });

          texture.colorSpace = THREE.SRGBColorSpace;
          texture.minFilter = THREE.LinearMipmapLinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.generateMipmaps = true;
          texture.anisotropy = 16;

          if (mounted) {
            textureCache.set(url, texture);
            setLoadingCount((prev) => prev + 1);
          }
        } catch (error) {
          logger.error('Failed to preload token image', { error, url });
          if (mounted) {
            setLoadingCount((prev) => prev + 1);
          }
        }
      }
    };

    loadImages();

    return () => {
      mounted = false;
    };
  }, [urls]);

  return {
    isLoading: loadingCount < totalCount,
    progress: totalCount > 0 ? loadingCount / totalCount : 1,
    loadedCount: loadingCount,
    totalCount,
  };
};

/**
 * Clear the texture cache
 * Useful for freeing memory when switching scenes
 */
export const clearTokenTextureCache = () => {
  textureCache.forEach((texture) => {
    texture.dispose();
  });
  textureCache.clear();
  logger.info('Token texture cache cleared');
};
