import { normalizeDemoConfig, normalizeDemoDraftConfig } from './demo';
import type { DemoDraftConfig, SavedModification } from './types';
import { normalizeScopeUrl } from './url';

const MODIFICATIONS_KEY = 'savedModifications';
const DEMO_DRAFT_KEY = 'demoDraftConfig';

type StoredShape = {
  savedModifications?: SavedModification[];
  demoDraftConfig?: DemoDraftConfig;
};

export async function getSavedModifications(): Promise<SavedModification[]> {
  const result = (await chrome.storage.local.get(
    MODIFICATIONS_KEY
  )) as StoredShape;

  return Array.isArray(result.savedModifications)
    ? result.savedModifications.map(normalizeSavedModification).sort(sortNewestFirst)
    : [];
}

export async function saveModification(
  modification: SavedModification
): Promise<SavedModification[]> {
  const existing = await getSavedModifications();
  const next = [modification, ...existing.filter((rule) => rule.id !== modification.id)];
  await chrome.storage.local.set({ [MODIFICATIONS_KEY]: next });
  return next;
}

export async function removeModifications(ids: string[]): Promise<SavedModification[]> {
  const existing = await getSavedModifications();
  const remaining = existing.filter((rule) => !ids.includes(rule.id));
  await chrome.storage.local.set({ [MODIFICATIONS_KEY]: remaining });
  return remaining;
}

export async function getDemoDraftConfig(): Promise<DemoDraftConfig> {
  const result = (await chrome.storage.local.get(DEMO_DRAFT_KEY)) as StoredShape;
  return normalizeDemoDraftConfig(result.demoDraftConfig);
}

export async function saveDemoDraftConfig(
  config: DemoDraftConfig
): Promise<void> {
  await chrome.storage.local.set({
    [DEMO_DRAFT_KEY]: normalizeDemoDraftConfig(config)
  });
}

export function filterRulesForUrl(
  rules: SavedModification[],
  normalizedScopeUrl: string
): SavedModification[] {
  return rules.filter(
    (rule) => resolveRuleScopeUrl(rule) === normalizedScopeUrl
  );
}

export function resolveRuleScopeUrl(rule: SavedModification): string {
  return rule.scopeUrl ?? normalizeScopeUrl(rule.url);
}

function sortNewestFirst(a: SavedModification, b: SavedModification): number {
  return b.createdAt.localeCompare(a.createdAt);
}

function normalizeSavedModification(rule: SavedModification): SavedModification {
  const demoConfig = normalizeDemoConfig(rule.demoConfig);

  if (!demoConfig || demoConfig === rule.demoConfig) {
    return rule;
  }

  return {
    ...rule,
    demoConfig
  };
}
