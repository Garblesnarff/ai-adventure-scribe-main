# Error Boundary Components

React Error Boundaries for graceful error handling and recovery throughout the application.

## Components

### ErrorBoundary

Main error boundary class component that catches JavaScript errors in child components.

**Features:**
- Multiple boundary levels (app, route, feature, component)
- Custom fallback UI support
- Error logging with context
- Reset functionality
- Reload page option

**Usage:**
```tsx
import { ErrorBoundary } from '@/components/error/ErrorBoundary';

<ErrorBoundary level="app" onError={reportError}>
  <App />
</ErrorBoundary>
```

**Props:**
- `children`: ReactNode - Child components to protect
- `fallback?`: ReactNode - Custom fallback UI
- `onError?`: (error, errorInfo) => void - Custom error handler
- `level?`: 'app' | 'route' | 'feature' | 'component' - Boundary level for logging

### GameErrorFallback

Specialized error fallback UI for game session errors.

**Features:**
- Game-themed error messaging
- Multiple recovery options
- Navigation to safe states
- User-friendly descriptions

**Usage:**
```tsx
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { GameErrorFallback } from '@/components/error/GameErrorFallback';

<ErrorBoundary
  level="feature"
  fallback={<GameErrorFallback />}
>
  <GameContent />
</ErrorBoundary>
```

**Props:**
- `error?`: Error - The error object
- `reset?`: () => void - Function to reset error state

## Error Boundary Hierarchy

The application uses a three-level error boundary strategy:

### 1. App Level (App.tsx)
Catches critical errors that would crash the entire application.
```tsx
<ErrorBoundary level="app">
  <QueryClientProvider client={queryClient}>
    {/* ... */}
  </QueryClientProvider>
</ErrorBoundary>
```

### 2. Route Level (Router Configuration)
Catches errors in specific routes, allowing other routes to function.
```tsx
<Route
  path="/app/game/:id"
  element={
    <ErrorBoundary level="route" fallback={<GameErrorFallback />}>
      <GameContent />
    </ErrorBoundary>
  }
/>
```

### 3. Feature Level (Inside Components)
Catches errors in specific features while preserving surrounding UI.
```tsx
const GameContent: React.FC = () => {
  return (
    <ErrorBoundary level="feature">
      {/* Game features */}
    </ErrorBoundary>
  );
};
```

## Testing Error Boundaries

To test error boundaries, you can temporarily add a test component:

```tsx
const ErrorTest = () => {
  const [shouldError, setShouldError] = useState(false);

  if (shouldError) {
    throw new Error('Test error for error boundary');
  }

  return (
    <button onClick={() => setShouldError(true)}>
      Trigger Test Error
    </button>
  );
};
```

## Best Practices

1. **Multiple Levels**: Use error boundaries at multiple levels for granular error handling
2. **Custom Fallbacks**: Provide context-specific fallback UIs for better UX
3. **Error Logging**: Always log errors with sufficient context for debugging
4. **Recovery Options**: Provide users with clear recovery paths
5. **Development vs Production**: Show detailed errors in development, friendly messages in production

## Error Reporting

For production error tracking, integrate with error monitoring services:

```tsx
const reportError = (error: Error, errorInfo: ErrorInfo) => {
  // Send to Sentry, LogRocket, etc.
  logger.error('Error reported:', { error, errorInfo });
};

<ErrorBoundary onError={reportError}>
  {/* ... */}
</ErrorBoundary>
```

## Limitations

Error boundaries do NOT catch errors in:
- Event handlers (use try-catch)
- Asynchronous code (use try-catch)
- Server-side rendering
- Errors thrown in the error boundary itself

For these cases, use traditional try-catch blocks and error handling utilities.
