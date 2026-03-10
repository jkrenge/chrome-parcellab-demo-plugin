import type { SavedModification } from './types';
import { normalizeScopeUrl } from './url';

const MODIFICATIONS_KEY = 'savedModifications';

type StoredShape = {
  savedModifications?: SavedModification[];
};

export async function getSavedModifications(): Promise<SavedModification[]> {
  const result = (await chrome.storage.local.get(
    MODIFICATIONS_KEY
  )) as StoredShape;

  return Array.isArray(result.savedModifications)
    ? [...result.savedModifications].sort(sortNewestFirst)
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
