import { startGraphQLServer } from './graphql/server';

/**
 * Start the GraphQL server
 */
async function main() {
  try {
    const port = parseInt(process.env.GRAPHQL_PORT || '4000');
    
    console.log('🚀 Starting GraphQL server...');
    await startGraphQLServer(port);
    
    console.log('✅ GraphQL server started successfully');
  } catch (error) {
    console.error('❌ Failed to start GraphQL server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down GraphQL server...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down GraphQL server...');
  process.exit(0);
});

main();