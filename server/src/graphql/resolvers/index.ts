import { GraphQLDateTime, GraphQLJSON } from 'graphql-scalars';
import { GraphQLUpload } from 'graphql-upload-minimal';
import { Resolvers, GraphQLContext } from '../types';

// Import all resolver modules
import { aiMutationResolvers, aiSubscriptionResolvers } from './ai-resolvers';
import { memoryQueryResolvers, memoryMutationResolvers, memorySubscriptionResolvers } from './memory-resolvers';
import { campaignQueryResolvers, campaignMutationResolvers, campaignSubscriptionResolvers } from './campaign-resolvers';
import { characterQueryResolvers, characterMutationResolvers, characterSubscriptionResolvers } from './character-resolvers';
import { rulesQueryResolvers } from './rules-resolvers';

/**
 * Combined GraphQL Resolvers
 */
export const resolvers: Resolvers = {
  // Scalar resolvers
  DateTime: GraphQLDateTime,
  JSON: GraphQLJSON,
  Upload: GraphQLUpload,

  // Query resolvers
  Query: {
    // Health check
    health: () => 'GraphQL server is running!',

    // Memory queries
    ...memoryQueryResolvers,

    // Campaign queries
    ...campaignQueryResolvers,

    // Character queries
    ...characterQueryResolvers,

    // Rules queries
    ...rulesQueryResolvers,
  },

  // Mutation resolvers
  Mutation: {
    // AI operations
    ...aiMutationResolvers,

    // Memory operations
    ...memoryMutationResolvers,

    // Campaign operations
    ...campaignMutationResolvers,

    // Character operations
    ...characterMutationResolvers,
  },

  // Subscription resolvers
  Subscription: {
    // AI subscriptions
    ...aiSubscriptionResolvers,

    // Memory subscriptions
    ...memorySubscriptionResolvers,

    // Campaign subscriptions
    ...campaignSubscriptionResolvers,

    // Character subscriptions
    ...characterSubscriptionResolvers,
  },
};