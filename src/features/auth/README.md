# Auth Feature

Authentication and authorization components.

## Structure

```
auth/
├── components/
│   ├── AuthPage.tsx        # Login/signup page component
│   └── ProtectedRoute.tsx  # Route protection wrapper
└── index.ts                # Public API
```

## Components

### AuthPage
Full-page authentication component with login and signup functionality.

### ProtectedRoute
Higher-order component that wraps routes requiring authentication.

## Usage

### Protected Routes
```tsx
import { ProtectedRoute } from '@/features/auth';

<ProtectedRoute>
  <Dashboard />
</ProtectedRoute>
```

### Auth Page
```tsx
import { AuthPage } from '@/features/auth';

<Route path="/auth" element={<AuthPage />} />
```

## Integration
- Uses Supabase for authentication backend
- Manages user session state
- Redirects unauthenticated users to login
