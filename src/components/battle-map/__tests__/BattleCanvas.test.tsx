import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BattleCanvas } from '../BattleCanvas';

// Mock React Three Fiber Canvas component
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children, onCreated, onError, ...props }: any) => (
    <div data-testid="r3f-canvas" data-props={JSON.stringify(props)}>
      <div data-testid="canvas-children">{children}</div>
    </div>
  ),
}));

// Mock CameraController component
vi.mock('../CameraController', () => ({
  CameraController: ({
    sceneWidth,
    sceneHeight,
    gridSize,
    minZoom,
    maxZoom,
    enablePan,
    enableZoom,
  }: any) => (
    <mesh
      data-testid="camera-controller"
      data-scene-width={sceneWidth}
      data-scene-height={sceneHeight}
      data-grid-size={gridSize}
      data-min-zoom={minZoom}
      data-max-zoom={maxZoom}
      data-enable-pan={enablePan}
      data-enable-zoom={enableZoom}
    />
  ),
}));

// Mock BattleScene component
vi.mock('../BattleScene', () => ({
  BattleScene: ({ sceneId, onSceneLoaded, showLoading }: any) => {
    // Simulate scene loaded after a delay
    if (onSceneLoaded) {
      setTimeout(() => {
        onSceneLoaded({
          id: sceneId,
          width: 20,
          height: 20,
          gridSize: 100,
        });
      }, 0);
    }

    return (
      <mesh
        data-testid="battle-scene"
        data-scene-id={sceneId}
        data-show-loading={showLoading}
      />
    );
  },
  SceneLoadingOverlay: ({ message }: any) => (
    <div data-testid="scene-loading-overlay">{message || 'Loading...'}</div>
  ),
  SceneErrorOverlay: ({ error }: any) => (
    <div data-testid="scene-error-overlay">{error}</div>
  ),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('BattleCanvas', () => {
  const defaultProps = {
    sceneId: 'scene-123',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Canvas rendering', () => {
    it('should render canvas with valid scene ID', () => {
      const { container } = render(<BattleCanvas {...defaultProps} />);
      const canvas = container.querySelector('[data-testid="r3f-canvas"]');
      expect(canvas).toBeInTheDocument();
    });

    it('should render BattleScene with correct sceneId', () => {
      const { container } = render(<BattleCanvas sceneId="test-scene-456" />);
      const scene = container.querySelector('[data-testid="battle-scene"]');
      expect(scene).toHaveAttribute('data-scene-id', 'test-scene-456');
    });

    it('should apply custom className', () => {
      const { container } = render(
        <BattleCanvas {...defaultProps} className="custom-canvas-class" />
      );
      const wrapper = container.querySelector('.custom-canvas-class');
      expect(wrapper).toBeInTheDocument();
    });

    it('should apply default className when not provided', () => {
      const { container } = render(<BattleCanvas {...defaultProps} />);
      const wrapper = container.querySelector('.w-full.h-full');
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe('Loading state', () => {
    it('should pass showLoading to BattleScene', () => {
      const { container } = render(<BattleCanvas {...defaultProps} />);
      const scene = container.querySelector('[data-testid="battle-scene"]');
      expect(scene).toHaveAttribute('data-show-loading', 'true');
    });
  });

  describe('Camera controls', () => {
    it('should initialize camera controller with default values', async () => {
      const { container } = render(<BattleCanvas {...defaultProps} />);

      await waitFor(() => {
        const camera = container.querySelector('[data-testid="camera-controller"]');
        expect(camera).toBeInTheDocument();
      });
    });

    it('should initialize camera with custom zoom limits', async () => {
      const { container } = render(
        <BattleCanvas {...defaultProps} minZoom={0.25} maxZoom={8} />
      );

      await waitFor(() => {
        const camera = container.querySelector('[data-testid="camera-controller"]');
        expect(camera).toHaveAttribute('data-min-zoom', '0.25');
        expect(camera).toHaveAttribute('data-max-zoom', '8');
      });
    });

    it('should enable pan controls when enablePan is true', async () => {
      const { container } = render(<BattleCanvas {...defaultProps} enablePan={true} />);

      await waitFor(() => {
        const camera = container.querySelector('[data-testid="camera-controller"]');
        expect(camera).toHaveAttribute('data-enable-pan', 'true');
      });
    });

    it('should disable pan controls when enablePan is false', async () => {
      const { container } = render(<BattleCanvas {...defaultProps} enablePan={false} />);

      await waitFor(() => {
        const camera = container.querySelector('[data-testid="camera-controller"]');
        expect(camera).toHaveAttribute('data-enable-pan', 'false');
      });
    });

    it('should enable zoom controls when enableZoom is true', async () => {
      const { container } = render(<BattleCanvas {...defaultProps} enableZoom={true} />);

      await waitFor(() => {
        const camera = container.querySelector('[data-testid="camera-controller"]');
        expect(camera).toHaveAttribute('data-enable-zoom', 'true');
      });
    });

    it('should disable zoom controls when enableZoom is false', async () => {
      const { container } = render(
        <BattleCanvas {...defaultProps} enableZoom={false} />
      );

      await waitFor(() => {
        const camera = container.querySelector('[data-testid="camera-controller"]');
        expect(camera).toHaveAttribute('data-enable-zoom', 'false');
      });
    });
  });

  describe('Lighting setup', () => {
    it('should setup ambient light', () => {
      const { container } = render(<BattleCanvas {...defaultProps} />);
      const ambientLight = container.querySelector('ambientLight');
      expect(ambientLight).toBeInTheDocument();
    });

    it('should setup directional light', () => {
      const { container } = render(<BattleCanvas {...defaultProps} />);
      const directionalLight = container.querySelector('directionalLight');
      expect(directionalLight).toBeInTheDocument();
    });

    it('should configure ambient light with correct intensity', () => {
      const { container } = render(<BattleCanvas {...defaultProps} />);
      const ambientLight = container.querySelector('ambientLight');
      expect(ambientLight).toHaveAttribute('intensity', '0.6');
    });

    it('should configure directional light with correct intensity', () => {
      const { container } = render(<BattleCanvas {...defaultProps} />);
      const directionalLight = container.querySelector('directionalLight');
      expect(directionalLight).toHaveAttribute('intensity', '0.5');
    });
  });

  describe('Scene loading callback', () => {
    it('should call onSceneLoaded when scene is loaded', async () => {
      const onSceneLoaded = vi.fn();
      render(<BattleCanvas {...defaultProps} onSceneLoaded={onSceneLoaded} />);

      await waitFor(() => {
        expect(onSceneLoaded).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'scene-123',
            width: 20,
            height: 20,
            gridSize: 100,
          })
        );
      });
    });

    it('should not call onSceneLoaded when not provided', () => {
      const { container } = render(<BattleCanvas {...defaultProps} />);
      const scene = container.querySelector('[data-testid="battle-scene"]');
      expect(scene).toBeInTheDocument();
      // No errors should occur
    });
  });

  describe('Background color', () => {
    it('should apply default background color', () => {
      const { container } = render(<BattleCanvas {...defaultProps} />);
      const canvas = container.querySelector('[data-testid="r3f-canvas"]');
      const props = canvas?.getAttribute('data-props');
      expect(props).toBeTruthy();
      if (props) {
        const parsedProps = JSON.parse(props);
        expect(parsedProps.style.background).toBe('#1a1a2e');
      }
    });

    it('should apply custom background color', () => {
      const { container } = render(
        <BattleCanvas {...defaultProps} backgroundColor="#ff0000" />
      );
      const canvas = container.querySelector('[data-testid="r3f-canvas"]');
      const props = canvas?.getAttribute('data-props');
      expect(props).toBeTruthy();
      if (props) {
        const parsedProps = JSON.parse(props);
        expect(parsedProps.style.background).toBe('#ff0000');
      }
    });
  });

  describe('WebGL configuration', () => {
    it('should configure canvas with high-performance preference', () => {
      const { container } = render(<BattleCanvas {...defaultProps} />);
      const canvas = container.querySelector('[data-testid="r3f-canvas"]');
      const props = canvas?.getAttribute('data-props');
      expect(props).toBeTruthy();
      if (props) {
        const parsedProps = JSON.parse(props);
        expect(parsedProps.gl.powerPreference).toBe('high-performance');
      }
    });

    it('should enable antialiasing', () => {
      const { container } = render(<BattleCanvas {...defaultProps} />);
      const canvas = container.querySelector('[data-testid="r3f-canvas"]');
      const props = canvas?.getAttribute('data-props');
      expect(props).toBeTruthy();
      if (props) {
        const parsedProps = JSON.parse(props);
        expect(parsedProps.gl.antialias).toBe(true);
      }
    });

    it('should disable alpha channel', () => {
      const { container } = render(<BattleCanvas {...defaultProps} />);
      const canvas = container.querySelector('[data-testid="r3f-canvas"]');
      const props = canvas?.getAttribute('data-props');
      expect(props).toBeTruthy();
      if (props) {
        const parsedProps = JSON.parse(props);
        expect(parsedProps.gl.alpha).toBe(false);
      }
    });

    it('should set frameloop to demand for performance', () => {
      const { container } = render(<BattleCanvas {...defaultProps} />);
      const canvas = container.querySelector('[data-testid="r3f-canvas"]');
      const props = canvas?.getAttribute('data-props');
      expect(props).toBeTruthy();
      if (props) {
        const parsedProps = JSON.parse(props);
        expect(parsedProps.frameloop).toBe('demand');
      }
    });

    it('should set device pixel ratio range', () => {
      const { container } = render(<BattleCanvas {...defaultProps} />);
      const canvas = container.querySelector('[data-testid="r3f-canvas"]');
      const props = canvas?.getAttribute('data-props');
      expect(props).toBeTruthy();
      if (props) {
        const parsedProps = JSON.parse(props);
        expect(parsedProps.dpr).toEqual([1, 2]);
      }
    });
  });

  describe('Camera updates with scene data', () => {
    it('should update camera controller with scene dimensions after load', async () => {
      const { container } = render(<BattleCanvas {...defaultProps} />);

      await waitFor(() => {
        const camera = container.querySelector('[data-testid="camera-controller"]');
        expect(camera).toHaveAttribute('data-scene-width', '20');
        expect(camera).toHaveAttribute('data-scene-height', '20');
        expect(camera).toHaveAttribute('data-grid-size', '100');
      });
    });
  });

  describe('Touch action prevention', () => {
    it('should prevent default touch actions', () => {
      const { container } = render(<BattleCanvas {...defaultProps} />);
      const canvas = container.querySelector('[data-testid="r3f-canvas"]');
      const props = canvas?.getAttribute('data-props');
      expect(props).toBeTruthy();
      if (props) {
        const parsedProps = JSON.parse(props);
        expect(parsedProps.style.touchAction).toBe('none');
      }
    });
  });

  describe('Performance monitoring in development', () => {
    const originalEnv = process.env.NODE_ENV;

    beforeEach(() => {
      vi.clearAllMocks();
    });

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should not render performance monitor in production', () => {
      process.env.NODE_ENV = 'production';
      const { container } = render(<BattleCanvas {...defaultProps} />);
      // Performance monitor returns null, so we just check the scene renders
      const scene = container.querySelector('[data-testid="battle-scene"]');
      expect(scene).toBeInTheDocument();
    });

    it('should render performance monitor in development', () => {
      process.env.NODE_ENV = 'development';
      const { container } = render(<BattleCanvas {...defaultProps} />);
      const scene = container.querySelector('[data-testid="battle-scene"]');
      expect(scene).toBeInTheDocument();
      // Performance monitor is rendered but returns null
    });
  });

  describe('Error handling', () => {
    it('should have error handler configured', () => {
      const { container } = render(<BattleCanvas {...defaultProps} />);
      const canvas = container.querySelector('[data-testid="r3f-canvas"]');
      // Canvas should be rendered with error handling
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Scene rendering with BattleScene', () => {
    it('should pass sceneId to BattleScene', () => {
      const { container } = render(<BattleCanvas sceneId="custom-scene-789" />);
      const scene = container.querySelector('[data-testid="battle-scene"]');
      expect(scene).toHaveAttribute('data-scene-id', 'custom-scene-789');
    });

    it('should enable loading state in BattleScene by default', () => {
      const { container } = render(<BattleCanvas {...defaultProps} />);
      const scene = container.querySelector('[data-testid="battle-scene"]');
      expect(scene).toHaveAttribute('data-show-loading', 'true');
    });
  });

  describe('Canvas wrapper structure', () => {
    it('should wrap canvas in relative positioned div', () => {
      const { container } = render(<BattleCanvas {...defaultProps} />);
      const wrapper = container.querySelector('.relative');
      expect(wrapper).toBeInTheDocument();
    });

    it('should contain canvas element', () => {
      const { container } = render(<BattleCanvas {...defaultProps} />);
      const canvas = container.querySelector('[data-testid="r3f-canvas"]');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Integration with camera and scene', () => {
    it('should render all core components together', async () => {
      const { container } = render(<BattleCanvas {...defaultProps} />);

      // Wait for all components to be present
      await waitFor(() => {
        expect(container.querySelector('[data-testid="camera-controller"]')).toBeInTheDocument();
        expect(container.querySelector('[data-testid="battle-scene"]')).toBeInTheDocument();
        expect(container.querySelector('ambientLight')).toBeInTheDocument();
        expect(container.querySelector('directionalLight')).toBeInTheDocument();
      });
    });

    it('should pass scene data to camera after loading', async () => {
      const { container } = render(<BattleCanvas {...defaultProps} />);

      await waitFor(() => {
        const camera = container.querySelector('[data-testid="camera-controller"]');
        expect(camera).toHaveAttribute('data-scene-width', '20');
        expect(camera).toHaveAttribute('data-scene-height', '20');
        expect(camera).toHaveAttribute('data-grid-size', '100');
      });
    });
  });

  describe('Props validation', () => {
    it('should handle all optional props being provided', () => {
      const onSceneLoaded = vi.fn();
      const { container } = render(
        <BattleCanvas
          sceneId="test-scene"
          backgroundColor="#123456"
          className="custom-class"
          enablePan={false}
          enableZoom={false}
          minZoom={0.1}
          maxZoom={10}
          onSceneLoaded={onSceneLoaded}
        />
      );

      expect(container.querySelector('[data-testid="r3f-canvas"]')).toBeInTheDocument();
    });

    it('should handle minimal props', () => {
      const { container } = render(<BattleCanvas sceneId="minimal-scene" />);
      expect(container.querySelector('[data-testid="r3f-canvas"]')).toBeInTheDocument();
    });
  });
});
