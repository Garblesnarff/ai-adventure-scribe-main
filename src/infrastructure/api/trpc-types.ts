/**
 * tRPC Type Definitions
 *
 * This file provides type definitions for the tRPC API router.
 * These types ensure compile-time safety for all API calls.
 *
 * @module infrastructure/api/trpc-types
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
