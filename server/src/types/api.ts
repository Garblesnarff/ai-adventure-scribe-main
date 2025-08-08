export type ErrorResponse = { error: string };

export type User = { id: string; email: string; plan?: string | null };
export type AuthResponse = { token: string; user: User };

export type Campaign = {
  id: string;
  user_id: string | null;
  name: string;
  description?: string | null;
  genre?: string | null;
  difficulty_level?: string | null;
  campaign_length?: string | null;
  tone?: string | null;
  era?: string | null;
  location?: string | null;
  atmosphere?: string | null;
  setting_details?: Record<string, unknown> | null;
  thematic_elements?: Record<string, unknown> | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type Character = {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  race: string;
  class: string;
  level: number;
  created_at?: string | null;
  updated_at?: string | null;
};

export type GameSession = {
  id: string;
  campaign_id: string | null;
  character_id: string | null;
  session_number: number | null;
  status: string | null;
  start_time: string | null;
  end_time: string | null;
  summary?: string | null;
};

export type AIRespondRequest = {
  provider?: 'openai' | 'anthropic';
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  systemPrompt?: string;
};
export type AIRespondResponse = { response: string };

export type StripeCheckoutResponse = { id: string; url: string | null };
