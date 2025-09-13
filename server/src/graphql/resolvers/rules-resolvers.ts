import { GraphQLError } from 'graphql';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { 
  QueryResolvers,
  RuleQueryInput,
  RuleLookup,
  RuleValidation,
  GraphQLContext
} from '../types';

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new GraphQLError('Gemini API key not configured', {
      extensions: { code: 'CONFIGURATION_ERROR' }
    });
  }
  return new GoogleGenerativeAI(apiKey);
};

/**
 * Rules Query Resolvers
 */
export const rulesQueryResolvers: Partial<QueryResolvers> = {
  /**
   * Look up a D&D 5e rule
   */
  lookupRule: async (_, args, context: GraphQLContext): Promise<RuleLookup> => {
    try {
      const { input } = args;
      const { query, context: ruleContext, edition = '5e' } = input;

      console.log(`Looking up rule: "${query}" (${edition})`);

      const genAI = getGeminiClient();
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

      const prompt = `You are a D&D ${edition} rules expert with comprehensive knowledge of all official rulebooks. Look up the following rule or mechanic:

**Query**: ${query}
${ruleContext ? `**Context**: ${ruleContext}` : ''}

**Instructions:**
1. Provide the exact rule text or mechanic explanation
2. Cite the specific source book and page number if possible
3. Include any relevant subsections or related rules
4. Explain how this rule interacts with other mechanics
5. Provide examples of how this rule applies in gameplay

**Response Format** (return as JSON):
{
  "rule": "Brief rule name or title",
  "description": "Detailed explanation of the rule and how it works",
  "source": "Source book and page reference (e.g., 'Player's Handbook p. 123')",
  "details": {
    "mechanics": "How the rule mechanically functions",
    "examples": ["Example 1", "Example 2"],
    "related_rules": ["Related rule 1", "Related rule 2"],
    "clarifications": "Any important clarifications or edge cases"
  }
}

Focus on accuracy and cite official sources. If the rule is ambiguous or has multiple interpretations, mention that.`;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      try {
        // Try to parse as JSON first
        const cleanedResponse = text.trim()
          .replace(/^```(?:json)?\s*/, '')
          .replace(/\s*```$/, '');

        const parsedResponse = JSON.parse(cleanedResponse);
        
        return {
          rule: parsedResponse.rule || query,
          description: parsedResponse.description || text,
          source: parsedResponse.source,
          details: parsedResponse.details
        };
      } catch (parseError) {
        // If JSON parsing fails, return a structured response from the text
        return {
          rule: query,
          description: text,
          source: undefined,
          details: {
            mechanics: text,
            examples: [],
            related_rules: [],
            clarifications: undefined
          }
        };
      }
    } catch (error) {
      console.error('Error looking up rule:', error);
      throw new GraphQLError('Failed to look up rule', {
        extensions: { 
          code: 'RULE_LOOKUP_ERROR',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  },

  /**
   * Validate a rule interpretation or usage
   */
  validateRule: async (_, args, context: GraphQLContext): Promise<RuleValidation> => {
    try {
      const { input } = args;
      const { query, context: ruleContext, edition = '5e' } = input;

      console.log(`Validating rule interpretation: "${query}"`);

      const genAI = getGeminiClient();
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

      const prompt = `You are a D&D ${edition} rules expert and judge. Analyze the following rule interpretation or situation:

**Rule Interpretation/Situation**: ${query}
${ruleContext ? `**Game Context**: ${ruleContext}` : ''}

**Instructions:**
1. Determine if this interpretation is correct according to official ${edition} rules
2. Explain why it is or isn't valid
3. Provide the correct interpretation if needed
4. Suggest alternative approaches if applicable
5. Consider Rules as Intended (RAI) vs Rules as Written (RAW)

**Response Format** (return as JSON):
{
  "isValid": true/false,
  "rule": "The specific rule being interpreted",
  "explanation": "Detailed explanation of why this is valid or invalid",
  "suggestions": ["Alternative approach 1", "Alternative approach 2", "Correct interpretation"]
}

Be thorough but concise. Consider both strict rule interpretation and reasonable DM flexibility.`;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      try {
        // Try to parse as JSON
        const cleanedResponse = text.trim()
          .replace(/^```(?:json)?\s*/, '')
          .replace(/\s*```$/, '');

        const parsedResponse = JSON.parse(cleanedResponse);
        
        return {
          isValid: parsedResponse.isValid || false,
          rule: parsedResponse.rule,
          explanation: parsedResponse.explanation || text,
          suggestions: parsedResponse.suggestions || []
        };
      } catch (parseError) {
        // If JSON parsing fails, try to extract validation from text
        const isValid = text.toLowerCase().includes('valid') && 
                       !text.toLowerCase().includes('not valid') && 
                       !text.toLowerCase().includes('invalid');
        
        return {
          isValid,
          rule: query,
          explanation: text,
          suggestions: []
        };
      }
    } catch (error) {
      console.error('Error validating rule:', error);
      throw new GraphQLError('Failed to validate rule', {
        extensions: { 
          code: 'RULE_VALIDATION_ERROR',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }
};