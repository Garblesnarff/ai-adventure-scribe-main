// Vitest setup file

// Extend expect with jest-dom matchers
import '@testing-library/jest-dom/vitest';

// Silence noisy logs in test runs and filter React act() warnings
const originalError = console.error;
vi.spyOn(console, 'debug').mockImplementation(() => {});
vi.spyOn(console, 'info').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
  const msg = args[0];
  if (typeof msg === 'string' && msg.includes('not wrapped in act')) return;
  // Forward other errors
  originalError.apply(console, args as any);
});

// MSW setup - disabled due to missing dependency
// import { setupServer } from 'msw/node';
// import { handlers } from '../mocks/handlers';

// const server = setupServer(...handlers);

// beforeAll(() => server.listen());
// afterEach(() => server.resetHandlers());
// afterAll(() => server.close());

// Mock global objects that might be missing in jsdom or causing issues
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

if (!navigator.mediaDevices) {
  (navigator as any).mediaDevices = {};
}
Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
  writable: true,
  value: vi.fn().mockResolvedValue(null), // Mock it to resolve with null or a mock stream
});
