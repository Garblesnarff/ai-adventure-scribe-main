# ADR 001: LLM Strategy Consolidation

**Date:** $(date +%Y-%m-%d)

## Status

Accepted

## Context

The project initially utilized multiple Large Language Models (LLMs) for different tasks, including OpenAI's GPT-4 for core Dungeon Master (DM) narrative generation and Google Gemini for chat functionalities. This distributed approach could lead to increased complexity in logic, potential cost inefficiencies, and fragmented development efforts. To streamline the AI strategy for the Minimum Viable Product (MVP), a decision was made to consolidate towards a single primary LLM for core DM tasks.

## Decision

Google Gemini (specifically `gemini-pro` or a similar suitable model from the Gemini family) will be the primary LLM for all core DM narrative generation and player chat interactions.

Other LLMs might still be used for highly specialized, non-core tasks if a strong justification exists (e.g., a specific model for embedding generation if Gemini doesn't meet the requirements), but the default for DM-related text generation will be Gemini.

## Reasoning

*   **Simplified Logic:** Consolidating to a single primary LLM for core tasks reduces the complexity of the codebase by removing the need to maintain multiple API integrations, request/response handling logic, and conditional paths for different models.
*   **Reduced Potential Costs:** Managing and optimizing costs with a single primary provider can be simpler. While cost structures vary, focusing on one API might allow for better volume discounts or more predictable spending.
*   **Focused Development Efforts:** Standardizing on Gemini allows the development team to deepen their expertise with a single API and model family, leading to more efficient prompt engineering, fine-tuning (if applicable), and overall integration.
*   **Alignment with Project Assessment:** This decision aligns with the project's goal to deliver an MVP efficiently by focusing resources and reducing unnecessary architectural complexity. Gemini has shown strong capabilities suitable for narrative generation and chat.

## Consequences

### Positive

*   Reduced code complexity in AI-related functions.
*   Potentially easier cost management for LLM usage.
*   More focused engineering effort on a single LLM API.
*   Consistent AI "voice" and capabilities for the core DM experience.

### Negative

*   If Gemini has limitations for certain specific DM tasks where another model (e.g., GPT-4) previously excelled, there might be a temporary dip in quality for those specific aspects until prompts or techniques are optimized for Gemini.
*   Reliance on a single LLM provider for core functionality introduces a vendor lock-in risk, though this is a common trade-off.

## Affected Files

The following key files were modified to implement this decision:

*   `supabase/functions/dm-agent-execute/index.ts`: Refactored to use Google Gemini for narrative generation, replacing OpenAI GPT-4.
*   `supabase/functions/chat-ai/index.ts` (and its handler `supabase/functions/chat-ai/ai-handler.ts`): Already used Gemini, so this decision reinforces its use. No code changes were needed here specifically for the consolidation, but it's a core part of the Gemini-centered strategy.
*   `supabase/functions/get-secret/index.ts`: While not directly modified in its logic (as it's a generic secret retriever), its usage pattern changes as `OPENAI_API_KEY` is no longer actively fetched by `dm-agent-execute`. It continues to fetch `GEMINI_API_KEY`.

## Alternatives Considered

*   **Continue with a Multi-LLM Strategy:** Maintain both OpenAI and Gemini (and potentially others) for different tasks. This was rejected for the MVP to reduce complexity.
*   **Consolidate on OpenAI GPT-4:** Choose GPT-4 as the primary LLM. While GPT-4 is powerful, the decision to go with Gemini was influenced by factors including its existing use in the `chat-ai` function, its strong general capabilities, and potentially favorable cost/performance characteristics for the project's needs.

---
*This ADR helps in tracking the architectural evolution of the project and ensures that decisions are documented and understood.*
