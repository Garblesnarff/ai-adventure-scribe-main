const parseBoolean = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (value == null) return false;
  const normalized = String(value).trim().toLowerCase();
  return ['true', '1', 'yes', 'on', 'enabled'].includes(normalized);
};

const semanticMemoriesEnabled = parseBoolean(
  (import.meta as any)?.env?.VITE_ENABLE_SEMANTIC_MEMORIES,
);
const worldBuilderEnabled = parseBoolean((import.meta as any)?.env?.VITE_ENABLE_WORLD_BUILDER);
const campaignCharacterFlowEnabled = parseBoolean(
  (import.meta as any)?.env?.VITE_ENABLE_CAMPAIGN_CHARACTER_FLOW,
);

export const featureFlags = {
  semanticMemories: semanticMemoriesEnabled,
  worldBuilder: worldBuilderEnabled,
  campaignCharacterFlow: campaignCharacterFlowEnabled,
};

export const isSemanticMemoriesEnabled = (): boolean => featureFlags.semanticMemories;
export const isWorldBuilderEnabled = (): boolean => featureFlags.worldBuilder;
export const isCampaignCharacterFlowEnabled = (): boolean => featureFlags.campaignCharacterFlow;
