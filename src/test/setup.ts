// Vitest setup file

// Example: Extend expect with jest-dom matchers if you install it
import '@testing-library/jest-dom/vitest';

// Add any global test setup here
// For example, mocking global objects or functions

console.log('Vitest setup file loaded.');

// MSW setup
import { setupServer } from 'msw/node';
import { handlers } from '../mocks/handlers';

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Mock global objects that might be missing in jsdom or causing issues
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
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
