import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { BackgroundPlaceholder } from './BackgroundPlaceholder';
import logger from '@/lib/logger';

export interface BackgroundImageProps {
  imageUrl: string;
  width: number;
  height: number;
  gridSize: number;
  lockAspectRatio?: boolean;
  opacity?: number;
}

/**
 * BackgroundImage component for battle map
 * Loads and displays a background image texture on a plane geometry
 * Handles loading states, errors, and proper texture disposal
 */
export const BackgroundImage: React.FC<BackgroundImageProps> = ({
  imageUrl,
  width,
  height,
  gridSize,
  lockAspectRatio = true,
  opacity = 1,
}) => {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [loadingState, setLoadingState] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const textureRef = useRef<THREE.Texture | null>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const { invalidate } = useThree();

  // Calculate actual dimensions in world space
  const worldWidth = useMemo(() => width * gridSize, [width, gridSize]);
  const worldHeight = useMemo(() => height * gridSize, [height, gridSize]);

  // Memoize geometry to prevent recreation on each render
  const geometry = useMemo(() => {
    return new THREE.PlaneGeometry(worldWidth, worldHeight);
  }, [worldWidth, worldHeight]);

  // Load texture with proper error handling
  const loadTexture = useCallback(async () => {
    if (!imageUrl) {
      setLoadingState('error');
      setErrorMessage('No image URL provided');
      return;
    }

    setLoadingState('loading');
    setErrorMessage('');

    const loader = new THREE.TextureLoader();

    try {
      // Load the texture
      const loadedTexture = await new Promise<THREE.Texture>((resolve, reject) => {
        loader.load(
          imageUrl,
          // onLoad
          (tex) => {
            resolve(tex);
          },
          // onProgress
          undefined,
          // onError
          (error) => {
            reject(error);
          }
        );
      });

      // Configure texture settings for optimal quality
      loadedTexture.colorSpace = THREE.SRGBColorSpace;
      loadedTexture.minFilter = THREE.LinearMipmapLinearFilter;
      loadedTexture.magFilter = THREE.LinearFilter;
      loadedTexture.generateMipmaps = true;
      loadedTexture.anisotropy = 16; // Maximum anisotropic filtering for better quality

      // Handle aspect ratio locking
      if (lockAspectRatio && loadedTexture.image) {
        const imageAspect = loadedTexture.image.width / loadedTexture.image.height;
        const gridAspect = worldWidth / worldHeight;

        if (Math.abs(imageAspect - gridAspect) > 0.01) {
          logger.info(
            `Background image aspect ratio (${imageAspect.toFixed(2)}) differs from grid aspect ratio (${gridAspect.toFixed(2)})`
          );
        }
      }

      // Dispose of old texture if it exists
      if (textureRef.current) {
        textureRef.current.dispose();
      }

      textureRef.current = loadedTexture;
      setTexture(loadedTexture);
      setLoadingState('success');
      invalidate(); // Trigger re-render

      logger.info('Background texture loaded successfully', {
        url: imageUrl,
        width: loadedTexture.image?.width,
        height: loadedTexture.image?.height,
      });
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : 'Failed to load background image';
      setLoadingState('error');
      setErrorMessage(errorMsg);
      logger.error('Failed to load background texture', { error, url: imageUrl });
    }
  }, [imageUrl, lockAspectRatio, worldWidth, worldHeight, invalidate]);

  // Load texture when imageUrl changes
  useEffect(() => {
    loadTexture();
  }, [loadTexture]);

  // Cleanup: Dispose texture on unmount
  useEffect(() => {
    return () => {
      if (textureRef.current) {
        textureRef.current.dispose();
        textureRef.current = null;
        logger.debug('Background texture disposed');
      }
    };
  }, []);

  // Dispose geometry on unmount
  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  // Show placeholder during loading
  if (loadingState === 'loading') {
    return <BackgroundPlaceholder width={worldWidth} height={worldHeight} />;
  }

  // Show error state
  if (loadingState === 'error') {
    return (
      <mesh position={[0, 0, -0.1]}>
        <planeGeometry args={[worldWidth, worldHeight]} />
        <meshBasicMaterial color="#ff6b6b" opacity={0.3} transparent />
        <mesh position={[0, 0, 0.01]}>
          <planeGeometry args={[worldWidth * 0.8, worldHeight * 0.1]} />
          <meshBasicMaterial color="#000000" opacity={0.7} transparent />
        </mesh>
      </mesh>
    );
  }

  // Render background image
  return (
    <mesh ref={meshRef} position={[0, 0, -0.1]} geometry={geometry}>
      <meshBasicMaterial
        map={texture}
        transparent={opacity < 1}
        opacity={opacity}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </mesh>
  );
};

/**
 * Hook to preload background images for better performance
 * @param urls Array of image URLs to preload
 * @returns Loading state
 */
export const usePreloadBackgroundImages = (urls: string[]) => {
  const [loadingCount, setLoadingCount] = useState(0);
  const [totalCount] = useState(urls.length);
  const texturesRef = useRef<Map<string, THREE.Texture>>(new Map());

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    let mounted = true;

    const loadImages = async () => {
      for (const url of urls) {
        if (!mounted) break;

        try {
          const texture = await new Promise<THREE.Texture>((resolve, reject) => {
            loader.load(url, resolve, undefined, reject);
          });

          if (mounted) {
            texturesRef.current.set(url, texture);
            setLoadingCount((prev) => prev + 1);
          }
        } catch (error) {
          logger.error('Failed to preload background image', { error, url });
          if (mounted) {
            setLoadingCount((prev) => prev + 1);
          }
        }
      }
    };

    loadImages();

    return () => {
      mounted = false;
      // Dispose all preloaded textures
      texturesRef.current.forEach((texture) => {
        texture.dispose();
      });
      texturesRef.current.clear();
    };
  }, [urls]);

  return {
    isLoading: loadingCount < totalCount,
    progress: totalCount > 0 ? loadingCount / totalCount : 1,
    loadedCount: loadingCount,
    totalCount,
  };
};
