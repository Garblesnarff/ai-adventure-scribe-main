export interface CrewAIRollRequest {
  type: 'check' | 'save' | 'attack' | 'damage' | 'initiative';
  formula?: string;
  purpose?: string;
  dc?: number;
  ac?: number;
  advantage?: boolean;
  disadvantage?: boolean;
}

export interface CrewAIResponse {
  text: string;
  narration_segments?: Array<{
    type: 'dm' | 'character' | 'transition';
    text: string;
    character?: string;
    voice_category?: string;
  }>;
  roll_requests?: CrewAIRollRequest[];
}

export class CrewAIClient {
  private static baseUrl(): string {
    return (import.meta.env.VITE_CREWAI_BASE_URL as string) || 'http://localhost:8000';
  }

  static async respond(sessionId: string, payload: Record<string, any>): Promise<CrewAIResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const res = await fetch(`${this.baseUrl()}/dm/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, ...payload }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`CrewAI HTTP ${res.status}`);
      const data = await res.json();
      return data as CrewAIResponse;
    } finally {
      clearTimeout(timeout);
    }
  }
}

export const crewAIClient = CrewAIClient;
