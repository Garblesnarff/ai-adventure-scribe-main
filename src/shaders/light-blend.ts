/**
 * Light Blending Shader
 *
 * Custom shader for combining multiple light sources with proper blending.
 * Implements additive blending for overlapping lights with smooth falloff.
 *
 * @module shaders/light-blend
 */

import * as THREE from 'three';

/**
 * Light source data for shader
 */
export interface ShaderLightSource {
  /** Position in world space */
  position: THREE.Vector2;
  /** Light color */
  color: THREE.Color;
  /** Bright light radius in pixels */
  brightRadius: number;
  /** Dim light radius in pixels (total = bright + dim) */
  dimRadius: number;
  /** Light intensity 0-1 */
  intensity: number;
  /** Color intensity (how much color vs white) */
  colorIntensity: number;
  /** For directional lights */
  angle?: number;
  /** Rotation for directional lights */
  rotation?: number;
}

/**
 * Uniforms for light blending shader
 */
export interface LightBlendUniforms {
  /** Array of light source positions */
  lightPositions: { value: THREE.Vector2[] };
  /** Array of light colors */
  lightColors: { value: THREE.Color[] };
  /** Array of bright radii */
  lightBrightRadii: { value: number[] };
  /** Array of dim radii */
  lightDimRadii: { value: number[] };
  /** Array of intensities */
  lightIntensities: { value: number[] };
  /** Array of color intensities */
  lightColorIntensities: { value: number[] };
  /** Number of active lights */
  numLights: { value: number };
  /** Global ambient light level */
  ambientLight: { value: number };
  /** Whether global light is enabled */
  globalLight: { value: boolean };
  /** Resolution for pixel-perfect rendering */
  resolution: { value: THREE.Vector2 };
}

/**
 * Create light blending shader material
 *
 * @param maxLights - Maximum number of lights to support
 * @returns Shader material for light blending
 */
export function createLightBlendMaterial(maxLights: number = 32): THREE.ShaderMaterial {
  const uniforms: LightBlendUniforms = {
    lightPositions: { value: new Array(maxLights).fill(new THREE.Vector2()) },
    lightColors: { value: new Array(maxLights).fill(new THREE.Color('#ffffff')) },
    lightBrightRadii: { value: new Array(maxLights).fill(0) },
    lightDimRadii: { value: new Array(maxLights).fill(0) },
    lightIntensities: { value: new Array(maxLights).fill(0) },
    lightColorIntensities: { value: new Array(maxLights).fill(0.5) },
    numLights: { value: 0 },
    ambientLight: { value: 0.0 },
    globalLight: { value: false },
    resolution: { value: new THREE.Vector2(1920, 1080) },
  };

  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader: lightBlendVertexShader,
    fragmentShader: lightBlendFragmentShader(maxLights),
    transparent: true,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
  });
}

/**
 * Vertex shader for light blending
 */
const lightBlendVertexShader = `
  varying vec2 vUv;
  varying vec3 vPosition;

  void main() {
    vUv = uv;
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/**
 * Fragment shader for light blending
 * Dynamically generated based on max lights
 */
function lightBlendFragmentShader(maxLights: number): string {
  return `
    #define MAX_LIGHTS ${maxLights}

    uniform vec2 lightPositions[MAX_LIGHTS];
    uniform vec3 lightColors[MAX_LIGHTS];
    uniform float lightBrightRadii[MAX_LIGHTS];
    uniform float lightDimRadii[MAX_LIGHTS];
    uniform float lightIntensities[MAX_LIGHTS];
    uniform float lightColorIntensities[MAX_LIGHTS];
    uniform int numLights;
    uniform float ambientLight;
    uniform bool globalLight;
    uniform vec2 resolution;

    varying vec2 vUv;
    varying vec3 vPosition;

    /**
     * Calculate light contribution from a single source
     */
    vec4 calculateLightContribution(
      vec2 fragPos,
      vec2 lightPos,
      vec3 lightColor,
      float brightRadius,
      float dimRadius,
      float intensity,
      float colorIntensity
    ) {
      float distance = length(fragPos - lightPos);
      float totalRadius = brightRadius + dimRadius;

      // Outside light range
      if (distance > totalRadius) {
        return vec4(0.0);
      }

      float lightLevel = 0.0;
      vec3 finalColor = vec3(1.0);

      // Bright light zone
      if (distance <= brightRadius) {
        lightLevel = 1.0;
        // Smooth falloff from center
        float centerFalloff = distance / brightRadius;
        lightLevel = 1.0 - (centerFalloff * 0.2); // 20% falloff in bright zone

        // Apply color with intensity
        finalColor = mix(vec3(1.0), lightColor, colorIntensity);
      }
      // Dim light zone
      else {
        float dimDistance = distance - brightRadius;
        float dimFraction = dimDistance / dimRadius;

        // Smooth falloff in dim zone
        lightLevel = (1.0 - dimFraction) * 0.5; // Dim light is 50% max

        // Less color in dim zone
        finalColor = mix(vec3(1.0), lightColor, colorIntensity * 0.5);
      }

      // Apply intensity
      lightLevel *= intensity;

      return vec4(finalColor * lightLevel, lightLevel);
    }

    /**
     * Smooth step function for gradients
     */
    float smootherstep(float edge0, float edge1, float x) {
      float t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
      return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
    }

    void main() {
      // If global light, everything is fully lit
      if (globalLight) {
        gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
        return;
      }

      // Fragment position in world space
      vec2 fragPos = vPosition.xy;

      // Accumulated light
      vec3 totalColor = vec3(0.0);
      float totalIntensity = 0.0;
      float maxBrightness = 0.0;

      // Accumulate light from all sources
      for (int i = 0; i < MAX_LIGHTS; i++) {
        if (i >= numLights) break;

        vec4 lightContribution = calculateLightContribution(
          fragPos,
          lightPositions[i],
          lightColors[i],
          lightBrightRadii[i],
          lightDimRadii[i],
          lightIntensities[i],
          lightColorIntensities[i]
        );

        // Additive blending for overlapping lights
        totalColor += lightContribution.rgb;
        totalIntensity += lightContribution.a;
        maxBrightness = max(maxBrightness, lightContribution.a);
      }

      // Add ambient light
      totalIntensity = max(totalIntensity, ambientLight);
      totalColor = mix(totalColor, vec3(1.0), ambientLight);

      // Normalize to prevent over-brightening
      if (totalIntensity > 1.0) {
        totalColor /= totalIntensity;
        totalIntensity = 1.0;
      }

      // Clamp to reasonable values
      totalColor = clamp(totalColor, 0.0, 1.0);
      totalIntensity = clamp(totalIntensity, 0.0, 1.0);

      // Output with proper alpha for blending
      gl_FragColor = vec4(totalColor, totalIntensity);
    }
  `;
}

/**
 * Update light sources in shader material
 *
 * @param material - The shader material to update
 * @param lights - Array of light source data
 */
export function updateLightSources(
  material: THREE.ShaderMaterial,
  lights: ShaderLightSource[]
): void {
  const uniforms = material.uniforms as unknown as LightBlendUniforms;
  const maxLights = uniforms.lightPositions.value.length;
  const numLights = Math.min(lights.length, maxLights);

  // Update number of active lights
  uniforms.numLights.value = numLights;

  // Update each light's data
  for (let i = 0; i < numLights; i++) {
    const light = lights[i];
    uniforms.lightPositions.value[i] = light.position;
    uniforms.lightColors.value[i] = light.color;
    uniforms.lightBrightRadii.value[i] = light.brightRadius;
    uniforms.lightDimRadii.value[i] = light.dimRadius;
    uniforms.lightIntensities.value[i] = light.intensity;
    uniforms.lightColorIntensities.value[i] = light.colorIntensity;
  }

  // Clear unused lights
  for (let i = numLights; i < maxLights; i++) {
    uniforms.lightIntensities.value[i] = 0;
  }
}

/**
 * Set global lighting parameters
 *
 * @param material - The shader material
 * @param globalLight - Whether global light is enabled
 * @param ambientLight - Ambient light level (0-1)
 */
export function setGlobalLighting(
  material: THREE.ShaderMaterial,
  globalLight: boolean,
  ambientLight: number = 0.0
): void {
  const uniforms = material.uniforms as unknown as LightBlendUniforms;
  uniforms.globalLight.value = globalLight;
  uniforms.ambientLight.value = ambientLight;
}

/**
 * Set resolution for the shader
 *
 * @param material - The shader material
 * @param width - Viewport width
 * @param height - Viewport height
 */
export function setResolution(
  material: THREE.ShaderMaterial,
  width: number,
  height: number
): void {
  const uniforms = material.uniforms as unknown as LightBlendUniforms;
  uniforms.resolution.value.set(width, height);
}

/**
 * Convert token light data to shader format
 *
 * @param token - Token with light emission
 * @param gridSize - Grid size in pixels
 * @returns Shader light source data
 */
export function tokenToShaderLight(
  token: { x: number; y: number; light: any },
  gridSize: number
): ShaderLightSource | null {
  if (!token.light.emitsLight) {
    return null;
  }

  const brightRadius = ((token.light.lightRange || 0) / 5) * gridSize;
  const dimRadius = ((token.light.dimLightRange || 0) / 5) * gridSize;

  if (brightRadius === 0 && dimRadius === 0) {
    return null;
  }

  return {
    position: new THREE.Vector2(token.x, token.y),
    color: new THREE.Color(token.light.lightColor || '#ffffff'),
    brightRadius,
    dimRadius,
    intensity: token.light.luminosity ?? 0.5,
    colorIntensity: token.light.colorIntensity ?? 0.5,
    angle: token.light.lightAngle,
    rotation: token.light.lightRotation,
  };
}

/**
 * LightBlendPlane Component
 *
 * React component that renders a plane with light blending shader.
 * Place this above the background to apply lighting effects.
 */
export interface LightBlendPlaneProps {
  /** Width of the plane */
  width: number;
  /** Height of the plane */
  height: number;
  /** Array of light sources */
  lights: ShaderLightSource[];
  /** Global light enabled */
  globalLight?: boolean;
  /** Ambient light level */
  ambientLight?: number;
  /** Maximum lights to support */
  maxLights?: number;
}

export function LightBlendPlane({
  width,
  height,
  lights,
  globalLight = false,
  ambientLight = 0.0,
  maxLights = 32,
}: LightBlendPlaneProps) {
  const materialRef = React.useRef<THREE.ShaderMaterial>(null);

  // Create material
  const material = React.useMemo(
    () => createLightBlendMaterial(maxLights),
    [maxLights]
  );

  // Update lights when they change
  React.useEffect(() => {
    if (materialRef.current) {
      updateLightSources(materialRef.current, lights);
    }
  }, [lights]);

  // Update global lighting
  React.useEffect(() => {
    if (materialRef.current) {
      setGlobalLighting(materialRef.current, globalLight, ambientLight);
    }
  }, [globalLight, ambientLight]);

  // Update resolution
  React.useEffect(() => {
    if (materialRef.current) {
      setResolution(materialRef.current, width, height);
    }
  }, [width, height]);

  return (
    <mesh position={[width / 2, height / 2, 0.1]} renderOrder={10}>
      <planeGeometry args={[width, height]} />
      <primitive ref={materialRef} object={material} attach="material" />
    </mesh>
  );
}

// For non-React usage
import React from 'react';
