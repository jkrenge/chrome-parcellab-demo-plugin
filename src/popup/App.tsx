import { startTransition, useEffect, useState } from 'react';
import {
  getSavedModifications,
  removeModifications,
  resolveRuleScopeUrl
} from '../shared/storage';
import {
  compactUrl,
  isWebUrl,
  normalizeScopeUrl,
  normalizeUrl
} from '../shared/url';
import type {
  ContentResponse,
  ModificationAction,
  SavedModification,
  SupportedLanguage,
  TrackAndTraceConfig
} from '../shared/types';

type ActiveTabState = {
  id: number | null;
  title: string;
  url: string;
  normalizedUrl: string;
  normalizedScopeUrl: string;
  supported: boolean;
};

const EMPTY_TAB_STATE: ActiveTabState = {
  id: null,
  title: '',
  url: '',
  normalizedUrl: '',
  normalizedScopeUrl: '',
  supported: false
};

type RuleGroup = {
  scopeUrl: string;
  url: string;
  pageTitle: string;
  demoConfig?: TrackAndTraceConfig;
  rules: SavedModification[];
  isCurrentPage: boolean;
};

const DEFAULT_TRACK_AND_TRACE_CONFIG: TrackAndTraceConfig = {
  userId: '',
  lang: 'en',
  showArticleList: true
};

const LANGUAGE_OPTIONS: Array<{ label: string; value: SupportedLanguage }> = [
  { label: 'English', value: 'en' },
  { label: 'German', value: 'de' },
  { label: 'Spanish', value: 'es' },
  { label: 'French', value: 'fr' },
  { label: 'Italian', value: 'it' },
  { label: 'Japanese', value: 'ja' },
  { label: 'Korean', value: 'ko' }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTabState>(EMPTY_TAB_STATE);
  const [allRules, setAllRules] = useState<SavedModification[]>([]);
  const [replaceConfig, setReplaceConfig] = useState<TrackAndTraceConfig>(
    DEFAULT_TRACK_AND_TRACE_CONFIG
  );
  const [isHydrating, setIsHydrating] = useState(true);
  const [statusMessage, setStatusMessage] = useState('Loading…');
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const groupedRules = groupRulesByPage(allRules, activeTab);

  useEffect(() => {
    void hydrate();
  }, []);

  async function hydrate(): Promise<void> {
    try {
      const [[tab], rules] = await Promise.all([
        chrome.tabs.query({
          active: true,
          currentWindow: true
        }),
        getSavedModifications()
      ]);

      const url = tab?.url ?? '';
      const supported = isWebUrl(url);
      const normalizedUrl = supported ? normalizeUrl(url) : '';
      const normalizedScopeUrl = supported ? normalizeScopeUrl(url) : '';
      const currentPageConfig = findPageDemoConfig(rules, normalizedScopeUrl);

      startTransition(() => {
        setActiveTab({
          id: tab?.id ?? null,
          title: tab?.title?.trim() ?? '',
          url,
          normalizedUrl,
          normalizedScopeUrl,
          supported
        });
        setAllRules(rules);
        setReplaceConfig(currentPageConfig ?? DEFAULT_TRACK_AND_TRACE_CONFIG);
      });

      if (!supported) {
        setStatusMessage('Open a normal web page first.');
      } else {
        setStatusMessage('Pick an element to add or remove demo content.');
      }
    } finally {
      setIsHydrating(false);
    }
  }

  async function ensureInjected(tabId: number): Promise<void> {
    try {
      const response = (await chrome.tabs.sendMessage(tabId, {
        type: 'PING'
      })) as ContentResponse;

      if (response?.ok) {
        return;
      }
    } catch {
      // The content script is not present yet for this tab.
    }

    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js']
    });
  }

  async function beginSelection(action: ModificationAction): Promise<void> {
    if (!activeTab.supported || !activeTab.id) {
      setStatusMessage('This page does not support the overlay.');
      return;
    }

    if (action === 'replace' && !/^\d{1,7}$/.test(replaceConfig.userId)) {
      setStatusMessage('Enter a numeric parcelLab user ID with up to 7 digits.');
      return;
    }

    const actionKey = `${action}-selection`;
    setBusyAction(actionKey);
    setStatusMessage(
      action === 'replace'
        ? 'Starting demo content selector…'
        : 'Starting hide selector…'
    );

    try {
      await ensureInjected(activeTab.id);
      const response = (await chrome.tabs.sendMessage(activeTab.id, {
        type: 'START_PICKER',
        action,
        html: '',
        demoConfig: action === 'replace' ? replaceConfig : undefined
      })) as ContentResponse;

      if (!response?.ok) {
        throw new Error(response?.error ?? 'Could not start selection mode.');
      }

      window.close();
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : 'Could not start selection mode.'
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function deleteRules(ruleIds: string[]): Promise<void> {
    if (ruleIds.length === 0) {
      return;
    }

    setBusyAction(ruleIds.join(','));

    try {
      const remaining = await removeModifications(ruleIds);
      setAllRules(remaining);

      try {
        await chrome.runtime.sendMessage({ type: 'SYNC_RULES' });
      } catch {
        // Storage is already updated locally.
      }

      if (activeTab.id) {
        try {
          await chrome.tabs.sendMessage(activeTab.id, {
            type: 'RESTORE_RULES',
            ruleIds
          });
        } catch {
          // The current tab may not have the script loaded, which is fine.
        }
      }

      setStatusMessage(
        ruleIds.length === 1 ? 'Rule deleted.' : `${ruleIds.length} rules deleted.`
      );
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 text-slate-900">
      <div className="space-y-4">
        <header>
          <h1 className="text-[24px] font-semibold tracking-tight text-slate-950">
            parcelLab Demo Layer
          </h1>
        </header>

        <section className="grid grid-cols-2 gap-3">
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-slate-500">User ID</span>
            <input
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              inputMode="numeric"
              maxLength={7}
              placeholder="1234567"
              value={replaceConfig.userId}
              onChange={(event) =>
                setReplaceConfig((current) => ({
                  ...current,
                  userId: event.target.value.replace(/\D+/g, '').slice(0, 7)
                }))
              }
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-slate-500">Language</span>
            <select
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 pr-10 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              value={replaceConfig.lang}
              onChange={(event) =>
                setReplaceConfig((current) => ({
                  ...current,
                  lang: event.target.value as SupportedLanguage
                }))
              }
            >
              {LANGUAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section>
          <div className="grid grid-cols-2 gap-3">
            <button
              className="inline-flex min-h-12 w-full items-center justify-center whitespace-nowrap rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-default disabled:bg-blue-300"
              disabled={isHydrating || !activeTab.supported || busyAction !== null}
              onClick={() => void beginSelection('replace')}
            >
              {busyAction === 'replace-selection'
                ? 'Starting…'
                : 'Pick Demo Content Element'}
            </button>
            <button
              className="inline-flex min-h-12 w-full items-center justify-center whitespace-nowrap rounded-lg border border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-default disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
              disabled={isHydrating || !activeTab.supported || busyAction !== null}
              onClick={() => void beginSelection('hide')}
            >
              {busyAction === 'hide-selection' ? 'Starting…' : 'Pick Element To Hide'}
            </button>
          </div>
        </section>

        {groupedRules.length === 0 ? <EmptyState copy="No saved pages yet." /> : null}

        {groupedRules.map((group) => (
          <PageRulesPanel
            activeAction={busyAction}
            group={group}
            key={group.url}
            onDeletePage={() => void deleteRules(group.rules.map((rule) => rule.id))}
            onDeleteRule={(ruleId) => void deleteRules([ruleId])}
          />
        ))}
      </div>
    </main>
  );
}

function PageRulesPanel({
  activeAction,
  group,
  onDeletePage,
  onDeleteRule
}: {
  activeAction: string | null;
  group: RuleGroup;
  onDeletePage: () => void;
  onDeleteRule: (ruleId: string) => void;
}) {
  return (
    <section
      className={`overflow-hidden rounded-lg border bg-white ${
        group.isCurrentPage ? 'border-blue-200' : 'border-slate-200'
      }`}
    >
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-slate-900">
            {group.pageTitle}
          </h2>
          {group.demoConfig ? (
            <p className="mt-1 truncate text-xs text-slate-600">
              User ID {group.demoConfig.userId} ·{' '}
              {formatLanguageLabel(group.demoConfig.lang)}
            </p>
          ) : null}
          <p className="mt-1 truncate text-xs text-slate-500">
            {compactUrl(group.url)}
          </p>
        </div>
        <button
          className="shrink-0 text-xs font-medium text-slate-500 transition hover:text-slate-800 disabled:cursor-default disabled:text-slate-300"
          disabled={activeAction !== null}
          onClick={onDeletePage}
        >
          Delete page
        </button>
      </div>
      <table className="w-full table-fixed text-left text-sm">
        <thead className="text-slate-500">
          <tr>
            <th className="w-24 px-4 py-1.5 font-medium">Type</th>
            <th className="px-3 py-2 font-medium">Title</th>
            <th className="w-12 px-4 py-1.5" aria-label="Delete rule" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {group.rules.map((rule) => (
            <tr className="bg-white" key={rule.id}>
              <td className="px-4 py-2">
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    rule.action === 'replace'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {rule.action === 'replace' ? 'Replace' : 'Hide'}
                </span>
              </td>
              <td className="px-3 py-2">
                <div className="truncate font-medium text-slate-800">
                  {rule.summary}
                </div>
              </td>
              <td className="px-4 py-2">
                <button
                  aria-label={`Delete ${rule.summary}`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-default disabled:text-slate-300"
                  disabled={activeAction !== null}
                  onClick={() => onDeleteRule(rule.id)}
                  title="Delete rule"
                >
                  {activeAction === rule.id ? (
                    <span className="text-xs font-semibold">…</span>
                  ) : (
                    <TrashIcon />
                  )}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function groupRulesByPage(
  rules: SavedModification[],
  activeTab: ActiveTabState
): RuleGroup[] {
  const groups = new Map<string, SavedModification[]>();

  for (const rule of rules) {
    const scopeUrl = resolveRuleScopeUrl(rule);
    const group = groups.get(scopeUrl);
    if (group) {
      group.push(rule);
    } else {
      groups.set(scopeUrl, [rule]);
    }
  }

  return Array.from(groups.entries())
    .map(([scopeUrl, pageRules]) => {
      pageRules.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
      const representativeUrl = pageRules[0]?.url ?? scopeUrl;

      return {
        scopeUrl,
        url: representativeUrl,
        pageTitle: resolvePageTitle(scopeUrl, pageRules, activeTab),
        demoConfig: findFirstDemoConfig(pageRules),
        rules: pageRules,
        isCurrentPage: scopeUrl === activeTab.normalizedScopeUrl
      };
    })
    .sort((left, right) => {
      if (left.isCurrentPage && !right.isCurrentPage) {
        return -1;
      }

      if (!left.isCurrentPage && right.isCurrentPage) {
        return 1;
      }

      return right.rules[0].createdAt.localeCompare(left.rules[0].createdAt);
    });
}

function resolvePageTitle(
  scopeUrl: string,
  rules: SavedModification[],
  activeTab: ActiveTabState
): string {
  if (scopeUrl === activeTab.normalizedScopeUrl && activeTab.title) {
    return activeTab.title;
  }

  const titledRule = rules.find((rule) => rule.pageTitle?.trim());
  if (titledRule?.pageTitle) {
    return titledRule.pageTitle;
  }

  return compactUrl(scopeUrl);
}

function findPageDemoConfig(
  rules: SavedModification[],
  normalizedScopeUrl: string
): TrackAndTraceConfig | undefined {
  return findFirstDemoConfig(
    rules.filter(
      (rule) =>
        resolveRuleScopeUrl(rule) === normalizedScopeUrl &&
        rule.action === 'replace'
    )
  );
}

function findFirstDemoConfig(
  rules: SavedModification[]
): TrackAndTraceConfig | undefined {
  return rules.find((rule) => rule.demoConfig)?.demoConfig;
}

function formatLanguageLabel(language: SupportedLanguage): string {
  return LANGUAGE_OPTIONS.find((option) => option.value === language)?.label ?? language;
}

function TrashIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10 11v6m4-6v6M4 7h16m-2 0-.7 10.1A2 2 0 0 1 15.3 19H8.7a2 2 0 0 1-2-1.9L6 7m3-3h6a1 1 0 0 1 1 1v2H8V5a1 1 0 0 1 1-1Z"
      />
    </svg>
  );
}

function EmptyState({ copy }: { copy: string }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white px-4 py-6">
      <p className="text-sm text-slate-500">{copy}</p>
    </section>
  );
}
