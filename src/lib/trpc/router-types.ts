/**
 * Temporary type stubs for tRPC AppRouter
 *
 * This file provides type definitions until the backend tRPC router is implemented.
 * Once Work Unit 3.1 is complete, import the actual AppRouter type from the server.
 *
 * TODO: Replace with actual import after backend implementation:
 * import type { AppRouter } from '../../../server/src/trpc/root';
 */

// Placeholder type - will be replaced with actual router from backend
export type AppRouter = {
  // Blog routes
  blog: {
    getPosts: {
      input: void;
      output: Array<{
        id: string;
        title: string;
        content: string;
        authorId: string;
        createdAt: string;
        updatedAt: string;
      }>;
    };
    getPost: {
      input: { id: string };
      output: {
        id: string;
        title: string;
        content: string;
        authorId: string;
        createdAt: string;
        updatedAt: string;
      } | null;
    };
    createPost: {
      input: {
        title: string;
        content: string;
      };
      output: {
        id: string;
        title: string;
        content: string;
        authorId: string;
        createdAt: string;
        updatedAt: string;
      };
    };
    updatePost: {
      input: {
        id: string;
        title?: string;
        content?: string;
      };
      output: {
        id: string;
        title: string;
        content: string;
        authorId: string;
        createdAt: string;
        updatedAt: string;
      };
    };
    deletePost: {
      input: { id: string };
      output: { success: boolean };
    };
  };
};
