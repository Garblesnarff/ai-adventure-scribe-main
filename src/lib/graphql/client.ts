import { ApolloClient, InMemoryCache, createHttpLink, split, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { getMainDefinition } from '@apollo/client/utilities';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { supabase } from '@/integrations/supabase/client';

// GraphQL endpoint configuration
const GRAPHQL_HTTP_ENDPOINT = import.meta.env.VITE_GRAPHQL_ENDPOINT || 'http://localhost:4000/graphql';
const GRAPHQL_WS_ENDPOINT = import.meta.env.VITE_GRAPHQL_WS_ENDPOINT || 'ws://localhost:4000/graphql';

// Create HTTP link
const httpLink = createHttpLink({
  uri: GRAPHQL_HTTP_ENDPOINT,
});

// Create WebSocket link for subscriptions
const wsLink = new GraphQLWsLink(
  createClient({
    url: GRAPHQL_WS_ENDPOINT,
    connectionParams: async () => {
      // Get the current session token if available
      const { data: { session } } = await supabase.auth.getSession();
      
      return {
        Authorization: session?.access_token ? `Bearer ${session.access_token}` : '',
      };
    },
    retryAttempts: 5,
    shouldRetry: (error) => {
      // Retry on network errors but not on authentication errors
      return !error.message?.includes('Unauthorized');
    },
    onError: (error) => {
      console.error('GraphQL WebSocket error:', error);
    },
  })
);

// Authentication link - adds JWT token to requests
const authLink = setContext(async (_, { headers }) => {
  const { data: { session } } = await supabase.auth.getSession();
  
  return {
    headers: {
      ...headers,
      authorization: session?.access_token ? `Bearer ${session.access_token}` : '',
    },
  };
});

// Error handling link
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path, extensions }) => {
      console.error(
        `GraphQL error: Message: ${message}, Location: ${locations}, Path: ${path}`
      );
      
      // Handle specific error types
      if (extensions?.code === 'UNAUTHENTICATED') {
        // Redirect to login or refresh token
        console.warn('Authentication required, redirecting to login');
      } else if (extensions?.code === 'FORBIDDEN') {
        console.warn('Access denied for operation:', operation.operationName);
      }
    });
  }
  
  if (networkError) {
    console.error('GraphQL network error:', networkError);
    
    // Handle offline/network errors
    if (networkError.message?.includes('NetworkError')) {
      console.warn('Network error, please check your connection');
    }
  }
});

// Split link to route queries/mutations via HTTP and subscriptions via WebSocket
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  from([errorLink, authLink, httpLink])
);

// Create Apollo Client
export const apolloClient = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          // Memory pagination and caching
          searchMemories: {
            keyArgs: ['input', ['query', 'sessionId']],
            merge(existing, incoming) {
              return incoming; // Replace with new results for searches
            },
          },
          getMemories: {
            keyArgs: ['sessionId'],
            merge(existing = [], incoming = [], { args }) {
              const offset = args?.offset || 0;
              const merged = existing.slice();
              for (let i = 0; i < incoming.length; i++) {
                merged[offset + i] = incoming[i];
              }
              return merged;
            },
          },
          
          // Campaign caching
          getCampaigns: {
            keyArgs: ['userId'],
            merge(existing = [], incoming = []) {
              return incoming; // Replace with fresh data
            },
          },
          
          // Character caching
          getCharacters: {
            keyArgs: ['userId'],
            merge(existing = [], incoming = []) {
              return incoming; // Replace with fresh data
            },
          },
        },
      },
      
      // Memory entity caching
      Memory: {
        fields: {
          metadata: {
            merge: true, // Deep merge metadata objects
          },
        },
      },
      
      // Campaign entity caching
      Campaign: {
        fields: {
          thematic_elements: {
            merge: true, // Deep merge thematic elements
          },
        },
      },
      
      // Character entity caching
      Character: {
        fields: {
          stats: {
            merge: true, // Deep merge character stats
          },
          equipment: {
            merge: true, // Deep merge equipment
          },
          spells: {
            merge: true, // Deep merge spells
          },
        },
      },
    },
  }),
  
  // Apollo Client configuration
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'all', // Return partial data on error
      fetchPolicy: 'cache-and-network', // Use cache but refresh from network
    },
    query: {
      errorPolicy: 'all',
      fetchPolicy: 'cache-first',
    },
    mutate: {
      errorPolicy: 'all',
    },
  },
  
  // Enable dev tools in development
  connectToDevTools: import.meta.env.DEV,
});

// Helper function to reset Apollo cache (useful for logout)
export const resetApolloCache = () => {
  return apolloClient.resetStore();
};

// Helper function to refetch queries (useful for authentication state changes)
export const refetchQueries = (includeStandby = false) => {
  return apolloClient.refetchQueries({
    include: includeStandby ? 'all' : 'active',
  });
};