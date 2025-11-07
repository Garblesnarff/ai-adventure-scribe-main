# Example Components

This directory contains example components demonstrating various features and patterns used in the application.

## TRPCExample.tsx

Demonstrates type-safe API calls using tRPC:
- Query patterns with loading states
- Mutations with optimistic updates
- Cache invalidation and management
- Error handling
- Integration with React Query

### Usage

To view the tRPC example:

1. Ensure the backend tRPC server is running (Work Unit 3.1)
2. Add a route to `App.tsx`:
   ```tsx
   import { TRPCExample } from './components/examples/TRPCExample';
   // ...
   <Route path="/examples/trpc" element={<TRPCExample />} />
   ```
3. Navigate to `/app/examples/trpc`

### Key Patterns Demonstrated

1. **Basic Query**:
   ```tsx
   const { data, isLoading, error } = trpc.blog.getPosts.useQuery();
   ```

2. **Mutation with Optimistic Update**:
   ```tsx
   const createPost = trpc.blog.createPost.useMutation({
     onMutate: async (newPost) => {
       await utils.blog.getPosts.cancel();
       const previous = utils.blog.getPosts.getData();
       utils.blog.getPosts.setData(undefined, (old) => [...old, newPost]);
       return { previous };
     },
     onError: (err, newPost, context) => {
       utils.blog.getPosts.setData(undefined, context.previous);
     },
     onSettled: () => {
       utils.blog.getPosts.invalidate();
     },
   });
   ```

3. **Cache Invalidation**:
   ```tsx
   const utils = trpc.useUtils();
   utils.blog.getPosts.invalidate(); // Refetch posts
   ```

## Adding New Examples

When adding new example components:

1. Create a new file in this directory
2. Follow the naming convention: `[Feature]Example.tsx`
3. Include comprehensive JSDoc comments
4. Demonstrate both basic and advanced usage
5. Add error handling examples
6. Update this README with usage instructions
