import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import depthLimit from 'graphql-depth-limit';
import costAnalysis from 'graphql-query-complexity';
import { createClient } from '@supabase/supabase-js';

// Import GraphQL schema and resolvers
import typeDefs from './schema';
import { resolvers } from './resolvers';
import { GraphQLContext } from './types';
import { createDataLoaders } from './loaders';
import { pubSub } from './subscriptions';

/**
 * Create and configure the GraphQL server
 */
export async function createGraphQLServer() {
  const app = express();
  const httpServer = createServer(app);

  // Create executable schema
  const schema = makeExecutableSchema({
    typeDefs,
    resolvers,
  });

  // Create WebSocket server for subscriptions
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  });

  // Setup WebSocket server for GraphQL subscriptions
  const serverCleanup = useServer(
    {
      schema,
      context: async (ctx, msg, args) => {
        // Create context for WebSocket connections
        const supabaseUrl = process.env.VITE_SUPABASE_URL;
        const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
        
        if (!supabaseUrl || !supabaseKey) {
          throw new Error('Supabase configuration missing');
        }

        const supabase = createClient(supabaseUrl, supabaseKey);
        const loaders = createDataLoaders(supabase);

        return {
          user: undefined, // TODO: Extract user from WebSocket context
          supabase,
          loaders,
          pubsub: pubSub,
        } as GraphQLContext;
      },
    },
    wsServer
  );

  // Create Apollo Server
  const server = new ApolloServer<GraphQLContext>({
    schema,
    plugins: [
      // Proper shutdown for WebSocket server
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
    ],

    // Query validation and security
    validationRules: [
      depthLimit(10), // Prevent deeply nested queries
      costAnalysis({
        maximumCost: 1000,
        defaultCost: 1,
        scalarCost: 1,
        objectCost: 1,
        listFactor: 10,
        introspectionCost: 1000,
        createError: (max, actual) => {
          return new Error(`Query complexity limit exceeded. Max: ${max}, Actual: ${actual}`);
        },
      }),
    ],

    // Error formatting
    formatError: (err) => {
      console.error('GraphQL Error:', err);
      
      // Don't expose internal error details in production
      if (process.env.NODE_ENV === 'production') {
        return {
          message: err.message,
          code: err.extensions?.code || 'INTERNAL_ERROR',
        };
      }
      
      return err;
    },
  });

  // Start the server
  await server.start();

  // Setup middleware
  app.use('/graphql', 
    cors({
      origin: process.env.NODE_ENV === 'development' 
        ? ['http://localhost:3000', 'http://localhost:5173'] 
        : process.env.ALLOWED_ORIGINS?.split(',') || [],
      credentials: true,
    }),
    express.json({ limit: '50mb' }),
    expressMiddleware(server, {
      context: async ({ req, res }) => {
        // Extract user from JWT token (if present)
        let user = undefined;
        const authHeader = req.headers.authorization;
        
        if (authHeader?.startsWith('Bearer ')) {
          try {
            // TODO: Implement JWT token verification
            // For now, just extract basic user info if available
          } catch (error) {
            console.warn('Invalid authorization token:', error);
          }
        }

        // Create Supabase client
        const supabaseUrl = process.env.VITE_SUPABASE_URL;
        const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
        
        if (!supabaseUrl || !supabaseKey) {
          throw new Error('Supabase configuration missing');
        }

        const supabase = createClient(supabaseUrl, supabaseKey, {
          global: {
            headers: authHeader ? { Authorization: authHeader } : {},
          },
        });

        // Create data loaders for this request
        const loaders = createDataLoaders(supabase);

        return {
          user,
          supabase,
          loaders,
          pubsub: pubSub,
        } as GraphQLContext;
      },
    })
  );

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      service: 'GraphQL API',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // GraphQL endpoint info
  app.get('/graphql', (req, res) => {
    if (process.env.NODE_ENV === 'development') {
      res.redirect('/graphql');
    } else {
      res.json({
        message: 'GraphQL endpoint',
        endpoint: '/graphql',
        subscriptions: 'ws://localhost:4000/graphql'
      });
    }
  });

  return { app, httpServer, server };
}

/**
 * Start the GraphQL server
 */
export async function startGraphQLServer(port: number = 4000) {
  try {
    const { app, httpServer } = await createGraphQLServer();

    return new Promise<void>((resolve, reject) => {
      httpServer.listen(port, () => {
        console.log(`🚀 GraphQL Server ready at http://localhost:${port}/graphql`);
        console.log(`🔗 GraphQL Subscriptions ready at ws://localhost:${port}/graphql`);
        console.log(`📊 Health check available at http://localhost:${port}/health`);
        resolve();
      });

      httpServer.on('error', (error) => {
        console.error('GraphQL Server error:', error);
        reject(error);
      });
    });
  } catch (error) {
    console.error('Failed to start GraphQL server:', error);
    throw error;
  }
}