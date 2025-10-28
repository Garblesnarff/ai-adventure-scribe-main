import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3"
import { ChatMessage } from './types.ts';

const DEFAULT_PRIMARY_MODEL = 'gemini-2.5-flash-lite';
const DEFAULT_FALLBACK_MODEL = 'gemini-2.0-flash-lite';

const GEMINI_PRIMARY_MODEL = (Deno.env.get('GEMINI_TEXT_MODEL') ?? DEFAULT_PRIMARY_MODEL).trim() || DEFAULT_PRIMARY_MODEL;
const GEMINI_FALLBACK_MODEL = (Deno.env.get('GEMINI_TEXT_FALLBACK') ?? DEFAULT_FALLBACK_MODEL).trim() || DEFAULT_FALLBACK_MODEL;
const GEMINI_VARIANT_MODELS = (Deno.env.get('GEMINI_MODEL_VARIANTS') ?? '')
  .split(',')
  .map((value) => value.trim())
  .filter((value) => value.length > 0);

const dedupeModels = (models: string[]): string[] => {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const model of models) {
    if (!model || seen.has(model)) continue;
    seen.add(model);
    ordered.push(model);
  }
  return ordered;
};

const buildModelCandidates = (preferred: string, variants: string[], fallback: string): string[] => {
  const autoVariants: string[] = [];
  if (/^gemini-2\.5-flash-lite$/i.test(preferred)) {
    autoVariants.push('gemini-2.5-flash-lite-001', 'gemini-2.5-flash-lite-preview');
  }
  return dedupeModels([preferred, ...variants, ...autoVariants, fallback]);
};

const GEMINI_MODEL_CANDIDATES = buildModelCandidates(GEMINI_PRIMARY_MODEL, GEMINI_VARIANT_MODELS, GEMINI_FALLBACK_MODEL);

const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY') || '');

/**
 * Maps our application roles to Gemini API roles
 */
export function mapRole(role: string): string {
  switch (role) {
    case 'player':
      return 'user';
    case 'dm':
    case 'system':
      return 'model';
    default:
      return 'user';
  }
}

/**
 * Handles the chat request and generates AI responses
 */
export async function generateAIResponse(
  messages: ChatMessage[],
  memoryContext: string
): Promise<string> {
  const baseHistory = messages.map(msg => ({
    role: mapRole(msg.sender),
    parts: [{ text: msg.text }],
  }));

  if (memoryContext) {
    baseHistory.unshift({
      role: 'model',
      parts: [{ text: `You are a Dungeon Master. Use this context to inform your responses:${memoryContext}` }],
    });
  }

  const generationConfig = {
    temperature: 0.9,
    topK: 1,
    topP: 1,
    maxOutputTokens: 2048,
  } as const;

  const attempts: string[] = [];
  let unavailableMessage: string | null = null;

  for (const candidate of GEMINI_MODEL_CANDIDATES) {
    attempts.push(candidate);
    try {
      const historyForAttempt = baseHistory.map(entry => ({
        role: entry.role,
        parts: entry.parts.map(part => ({ ...part })),
      }));

      const chat = genAI.getGenerativeModel({ model: candidate }).startChat({
        history: historyForAttempt,
        generationConfig: { ...generationConfig },
      });

      const result = await chat.sendMessage(messages[messages.length - 1].text);
      const response = await result.response;
      const text = response.text();
      if (!text) {
        throw new Error('Gemini API error: No text in response');
      }

      if (candidate !== GEMINI_PRIMARY_MODEL) {
        console.warn(`[Chat AI] Gemini model fallback engaged. Requested "${GEMINI_PRIMARY_MODEL}", using "${candidate}"`);
      }

      return text;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/not a valid model id|unsupported model|model \w+ has been disabled/i.test(message)) {
        console.warn(`[Chat AI] Gemini model "${candidate}" unavailable: ${message}`);
        unavailableMessage = message;
        continue;
      }
      console.error('Error generating AI response:', error);
      throw error;
    }
  }

  throw new Error(`Gemini models unavailable. Tried: ${attempts.join(', ')}${unavailableMessage ? ` (${unavailableMessage})` : ''}`);
}