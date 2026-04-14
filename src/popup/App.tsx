import { startTransition, useEffect, useState } from 'react';
import {
  buildDemoConfigFromDraft,
  DEFAULT_DEMO_DRAFT_CONFIG,
  DEMO_PLUGIN_OPTIONS,
  formatDemoConfigSummary,
  formatLanguageLabel,
  LANGUAGE_OPTIONS,
  mergeDemoConfigIntoDraft,
  normalizeDemoDraftConfig,
  SELECTION_GUIDE_APPEARANCE_OPTIONS,
  SELECTION_GUIDE_DENSITY_OPTIONS,
  SELECTION_GUIDE_NOT_FOUND_OPTIONS,
  SELECTION_GUIDE_SAMPLES,
  SELECTION_GUIDE_SURFACE_OPTIONS,
  validateDemoDraftConfig
} from '../shared/demo';
import {
  getChatbotConfig,
  getDemoDraftConfig,
  getSavedModifications,
  removeModifications,
  resolveRuleScopeUrl,
  saveChatbotConfig,
  saveDemoDraftConfig,
  saveModification
} from '../shared/storage';
import {
  compactUrl,
  isWebUrl,
  normalizeScopeUrl,
  normalizeUrl
} from '../shared/url';
import type {
  AuthStatusResponse,
  ChatbotConfig,
  DemoConfig,
  DemoDraftConfig,
  DemoPluginKind,
  ContentResponse,
  ModificationAction,
  SavedModification,
  SelectionGuideAppearance,
  SelectionGuideDensity,
  SelectionGuideNotFoundMode,
  SelectionGuideSurface,
  SupportedLanguage
} from '../shared/types';

const PLUGIN_DOCS_URLS: Partial<Record<DemoPluginKind, string>> = {
  'track-and-trace': 'https://docs.parcellab.com/docs/developers/status-updates/order-status-page-configuration',
  'returns-portal': 'https://docs.parcellab.com/docs/developers/returns/v2',
  'selection-guide': 'https://docs.parcellab.com/docs/developers/size-recommender/size-recommender/ui-plugin',
  'chatbot': 'https://docs.parcellab.com/docs/developers/agents/agents'
};

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
  demoConfig?: DemoConfig;
  rules: SavedModification[];
  isCurrentPage: boolean;
};

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTabState>(EMPTY_TAB_STATE);
  const [allRules, setAllRules] = useState<SavedModification[]>([]);
  const [draftConfig, setDraftConfig] = useState<DemoDraftConfig>(
    DEFAULT_DEMO_DRAFT_CONFIG
  );
  const [chatbotConfig, setChatbotConfig] = useState<ChatbotConfig>({
    agentId: '58e65ace-932b-4f9d-adec-f14778fab334',
    account: 1619884,
    baseUrl: 'https://product-api.parcellab.com'
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isHydrating, setIsHydrating] = useState(true);
  const [statusMessage, setStatusMessage] = useState('Loading…');
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [updateInfo, setUpdateInfo] = useState<{
    latestVersion: string;
    releaseUrl: string;
  } | null>(null);
  const canStartReplaceSelection =
    !isHydrating &&
    activeTab.supported &&
    busyAction === null &&
    validateDemoDraftConfig(draftConfig) === undefined;

  const groupedRules = groupRulesByPage(allRules, activeTab);

  useEffect(() => {
    void hydrate();
  }, []);

  async function hydrate(): Promise<void> {
    try {
      const [[tab], rules, persistedDraft, persistedChatbot, authStatus, storedUpdate] = await Promise.all([
        chrome.tabs.query({
          active: true,
          currentWindow: true
        }),
        getSavedModifications(),
        getDemoDraftConfig(),
        getChatbotConfig(),
        chrome.runtime.sendMessage({ type: 'AUTH_STATUS' }) as Promise<AuthStatusResponse>,
        chrome.storage.local.get('updateInfo') as Promise<{
          updateInfo?: { latestVersion: string; releaseUrl: string };
        }>
      ]);

      if (storedUpdate?.updateInfo?.latestVersion) {
        setUpdateInfo(storedUpdate.updateInfo);
      }

      // Also do a live check in case the background alarm hasn't fired yet
      void fetchUpdateInfo();

      const url = tab?.url ?? '';
      const supported = isWebUrl(url);
      const normalizedUrl = supported ? normalizeUrl(url) : '';
      const normalizedScopeUrl = supported ? normalizeScopeUrl(url) : '';
      const currentPageConfig = findPageDemoConfig(rules, normalizedScopeUrl);
      const nextDraftConfig = currentPageConfig
        ? mergeDemoConfigIntoDraft(persistedDraft, currentPageConfig)
        : normalizeDemoDraftConfig(persistedDraft);

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
        setDraftConfig(nextDraftConfig);
        setChatbotConfig(persistedChatbot);
        setIsAuthenticated(authStatus?.authenticated ?? false);
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

  async function fetchUpdateInfo(): Promise<void> {
    try {
      const res = await fetch(
        'https://api.github.com/repos/jkrenge/chrome-parcellab-demo-plugin/releases/latest',
        { headers: { 'Accept': 'application/vnd.github.v3+json' } }
      );
      if (!res.ok) return;
      const data = (await res.json()) as { tag_name?: string; html_url?: string };
      const latest = data.tag_name?.replace(/^v/, '') ?? '';
      const current = chrome.runtime.getManifest().version;
      if (latest && isNewerVersion(latest, current)) {
        setUpdateInfo({ latestVersion: latest, releaseUrl: data.html_url ?? '' });
      }
    } catch {
      // Offline or rate-limited — ignore.
    }
  }

  function isNewerVersion(latest: string, current: string): boolean {
    const l = latest.split('.').map(Number);
    const c = current.split('.').map(Number);
    for (let i = 0; i < Math.max(l.length, c.length); i++) {
      if ((l[i] ?? 0) > (c[i] ?? 0)) return true;
      if ((l[i] ?? 0) < (c[i] ?? 0)) return false;
    }
    return false;
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

    const replaceValidationMessage =
      action === 'replace' ? validateDemoDraftConfig(draftConfig) : undefined;
    if (replaceValidationMessage) {
      setStatusMessage(replaceValidationMessage);
      return;
    }

    const demoConfig =
      action === 'replace' ? buildDemoConfigFromDraft(draftConfig) : undefined;
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
        demoConfig
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

  function updateDraftConfig(
    update: (current: DemoDraftConfig) => DemoDraftConfig
  ): void {
    setDraftConfig((current) => {
      const next = normalizeDemoDraftConfig(update(current));
      void saveDemoDraftConfig(next);

      if (next.plugin === 'selection-guide') {
        void refreshSelectionGuideRules(next);
      }

      return next;
    });
  }

  async function refreshSelectionGuideRules(
    draft: DemoDraftConfig
  ): Promise<void> {
    const selectionGuideRules = allRules.filter(
      (rule) =>
        rule.demoConfig?.kind === 'selection-guide' &&
        resolveRuleScopeUrl(rule) === activeTab.normalizedScopeUrl
    );

    if (selectionGuideRules.length === 0 || !activeTab.id) {
      return;
    }

    const newConfig = buildDemoConfigFromDraft(draft);
    const updatedRules: SavedModification[] = [];

    for (const rule of selectionGuideRules) {
      const updated = { ...rule, demoConfig: newConfig };
      await saveModification(updated);
      updatedRules.push(updated);
    }

    setAllRules((current) =>
      current.map((rule) => {
        const updated = updatedRules.find((u) => u.id === rule.id);
        return updated ?? rule;
      })
    );

    try {
      await chrome.tabs.sendMessage(activeTab.id, {
        type: 'RESTORE_RULES',
        ruleIds: selectionGuideRules.map((r) => r.id)
      });
    } catch {
      // Content script may not be loaded.
    }
  }

  function updateChatbotConfig(
    update: (current: ChatbotConfig) => ChatbotConfig
  ): void {
    setChatbotConfig((current) => {
      const next = update(current);
      void saveChatbotConfig(next);
      return next;
    });
  }

  const canAddChatbot =
    !isHydrating &&
    activeTab.supported &&
    busyAction === null &&
    isAuthenticated &&
    chatbotConfig.agentId.trim() !== '';

  async function handleLogin(): Promise<void> {
    setBusyAction('auth-login');
    setStatusMessage('Logging in…');

    try {
      const response = (await chrome.runtime.sendMessage({
        type: 'AUTH_LOGIN'
      })) as ContentResponse;

      if (!response?.ok) {
        throw new Error(response?.error ?? 'Login failed.');
      }

      setIsAuthenticated(true);
      setStatusMessage('Logged in successfully.');
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : 'Login failed.'
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function handleLogout(): Promise<void> {
    setBusyAction('auth-logout');

    try {
      await chrome.runtime.sendMessage({ type: 'AUTH_LOGOUT' });
      setIsAuthenticated(false);
      setStatusMessage('Logged out.');
    } catch {
      setStatusMessage('Logout failed.');
    } finally {
      setBusyAction(null);
    }
  }

  async function copyPageDebugData(): Promise<void> {
    const pageRules = activeTab.normalizedScopeUrl
      ? allRules.filter(
          (rule) => resolveRuleScopeUrl(rule) === activeTab.normalizedScopeUrl
        )
      : allRules;

    const payload = {
      url: activeTab.url,
      normalizedScopeUrl: activeTab.normalizedScopeUrl,
      rules: pageRules
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setStatusMessage('Debug data copied to clipboard.');
    } catch {
      setStatusMessage('Could not copy to clipboard.');
    }
  }

  async function addChatbot(): Promise<void> {
    if (!activeTab.supported || !activeTab.id) {
      setStatusMessage('This page does not support the chatbot.');
      return;
    }

    if (!chatbotConfig.agentId.trim()) {
      setStatusMessage('Agent ID is required.');
      return;
    }

    setBusyAction('add-chatbot');
    setStatusMessage('Injecting chatbot…');

    try {
      await ensureInjected(activeTab.id);
      const response = (await chrome.tabs.sendMessage(activeTab.id, {
        type: 'INJECT_CHATBOT',
        config: chatbotConfig
      })) as ContentResponse;

      if (!response?.ok) {
        throw new Error(response?.error ?? 'Could not inject chatbot.');
      }

      const rule: SavedModification = {
        id: crypto.randomUUID(),
        url: activeTab.normalizedUrl,
        scopeUrl: activeTab.normalizedScopeUrl,
        pageTitle: activeTab.title || new URL(activeTab.url).hostname,
        selector: 'body',
        action: 'replace',
        html: '',
        demoConfig: {
          kind: 'chatbot',
          agentId: chatbotConfig.agentId.trim(),
          account: chatbotConfig.account,
          baseUrl: chatbotConfig.baseUrl
        },
        summary: 'Chatbot widget',
        createdAt: new Date().toISOString()
      };

      const updatedRules = await saveModification(rule);
      setAllRules(updatedRules);

      try {
        await chrome.runtime.sendMessage({ type: 'SYNC_RULES' });
      } catch {
        // Storage is already updated locally.
      }

      setStatusMessage('Chatbot added to page.');
      window.close();
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : 'Could not inject chatbot.'
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

        {updateInfo ? (
          <a
            href={updateInfo.releaseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 transition hover:bg-amber-100"
          >
            <span>
              v{updateInfo.latestVersion} available — you're on v{chrome.runtime.getManifest().version}
            </span>
            <span className="font-semibold">Download &rarr;</span>
          </a>
        ) : null}

        {/* Plugin tabs */}
        <nav className="flex gap-1">
          {DEMO_PLUGIN_OPTIONS.map((option) => (
            <button
              key={option.value}
              className={`h-7 flex-1 rounded-full px-2 text-[11px] font-medium transition ${
                draftConfig.plugin === option.value
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'border border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
              }`}
              onClick={() =>
                updateDraftConfig((current) => ({
                  ...current,
                  plugin: option.value as DemoPluginKind
                }))
              }
            >
              {option.label}
            </button>
          ))}
        </nav>

        {PLUGIN_DOCS_URLS[draftConfig.plugin] ? (
          <a
            href={PLUGIN_DOCS_URLS[draftConfig.plugin]}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] font-medium text-slate-400 transition hover:text-blue-600"
          >
            <svg aria-hidden="true" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
            </svg>
            Documentation
          </a>
        ) : null}

        {/* Track & Trace */}
        {draftConfig.plugin === 'track-and-trace' ? (
          <section className="space-y-2.5 rounded-lg border border-slate-200 bg-white p-3">
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1">
                <span className="text-[11px] font-medium text-slate-500">User ID</span>
                <input
                  className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  inputMode="numeric"
                  maxLength={7}
                  placeholder="1612197"
                  value={draftConfig.accountId}
                  onChange={(event) =>
                    updateDraftConfig((current) => ({
                      ...current,
                      accountId: event.target.value.replace(/\D+/g, '').slice(0, 7)
                    }))
                  }
                />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] font-medium text-slate-500">Language</span>
                <div className="relative">
                  <select
                    className="h-8 w-full appearance-none rounded-md border border-slate-300 bg-white px-2 pr-7 text-xs text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    value={draftConfig.lang}
                    onChange={(event) =>
                      updateDraftConfig((current) => ({
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
                  <SelectChevronSmall />
                </div>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                className="inline-flex h-9 w-full items-center justify-center whitespace-nowrap rounded-md bg-blue-600 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-default disabled:bg-blue-300"
                disabled={!canStartReplaceSelection}
                onClick={() => void beginSelection('replace')}
              >
                {busyAction === 'replace-selection' ? 'Starting…' : 'Pick Element'}
              </button>
              <button
                className="inline-flex h-9 w-full items-center justify-center whitespace-nowrap rounded-md border border-blue-200 bg-blue-50 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-default disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                disabled={isHydrating || !activeTab.supported || busyAction !== null}
                onClick={() => void beginSelection('hide')}
              >
                {busyAction === 'hide-selection' ? 'Starting…' : 'Hide Element'}
              </button>
            </div>
          </section>
        ) : null}

        {/* Returns Portal */}
        {draftConfig.plugin === 'returns-portal' ? (
          <section className="space-y-2.5 rounded-lg border border-slate-200 bg-white p-3">
            <div className="grid grid-cols-3 gap-2">
              <label className="space-y-1">
                <span className="text-[11px] font-medium text-slate-500">Account Name or ID</span>
                <input
                  className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="parcellab-account-name"
                  value={draftConfig.accountId}
                  onChange={(event) =>
                    updateDraftConfig((current) => ({
                      ...current,
                      accountId: event.target.value
                    }))
                  }
                />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] font-medium text-slate-500">Portal Code</span>
                <input
                  className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="xt-de"
                  value={draftConfig.portalCode}
                  onChange={(event) =>
                    updateDraftConfig((current) => ({
                      ...current,
                      portalCode: event.target.value.trimStart()
                    }))
                  }
                />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] font-medium text-slate-500">Language</span>
                <div className="relative">
                  <select
                    className="h-8 w-full appearance-none rounded-md border border-slate-300 bg-white px-2 pr-7 text-xs text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    value={draftConfig.lang}
                    onChange={(event) =>
                      updateDraftConfig((current) => ({
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
                  <SelectChevronSmall />
                </div>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                className="inline-flex h-9 w-full items-center justify-center whitespace-nowrap rounded-md bg-blue-600 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-default disabled:bg-blue-300"
                disabled={!canStartReplaceSelection}
                onClick={() => void beginSelection('replace')}
              >
                {busyAction === 'replace-selection' ? 'Starting…' : 'Pick Element'}
              </button>
              <button
                className="inline-flex h-9 w-full items-center justify-center whitespace-nowrap rounded-md border border-blue-200 bg-blue-50 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-default disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                disabled={isHydrating || !activeTab.supported || busyAction !== null}
                onClick={() => void beginSelection('hide')}
              >
                {busyAction === 'hide-selection' ? 'Starting…' : 'Hide Element'}
              </button>
            </div>
          </section>
        ) : null}

        {/* Selection Guide */}
        {draftConfig.plugin === 'selection-guide' ? (
          <>
            <section className="space-y-2.5 rounded-lg border border-slate-200 bg-white p-3">
              <div className="grid grid-cols-3 gap-2">
                <label className="space-y-1">
                  <span className="text-[11px] font-medium text-slate-500">Account ID</span>
                  <input
                    className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="1617954"
                    value={draftConfig.accountId}
                    onChange={(event) =>
                      updateDraftConfig((current) => ({
                        ...current,
                        accountId: event.target.value
                      }))
                    }
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] font-medium text-slate-500">Product ID</span>
                  <input
                    className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="Men's Iver Pants (tailored fit)"
                    value={draftConfig.productId}
                    onChange={(event) =>
                      updateDraftConfig((current) => ({
                        ...current,
                        productId: event.target.value
                      }))
                    }
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] font-medium text-slate-500">Language</span>
                  <div className="relative">
                    <select
                      className="h-8 w-full appearance-none rounded-md border border-slate-300 bg-white px-2 pr-7 text-xs text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      value={draftConfig.lang}
                      onChange={(event) =>
                        updateDraftConfig((current) => ({
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
                    <SelectChevronSmall />
                  </div>
                </label>
              </div>
              <div className="flex gap-2">
                {SELECTION_GUIDE_SAMPLES.map((sample) => (
                  <button
                    key={sample.productId}
                    className="inline-flex h-7 items-center rounded-md border border-slate-300 bg-slate-50 px-2.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-100"
                    onClick={() =>
                      updateDraftConfig((current) => ({
                        ...current,
                        accountId: sample.accountId,
                        productId: sample.productId
                      }))
                    }
                  >
                    {sample.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="grid grid-cols-4 gap-2 rounded-lg border border-slate-200 bg-white p-3">
              <label className="space-y-1">
                <span className="text-[11px] font-medium text-slate-500">Appearance</span>
                <div className="relative">
                  <select
                    className="h-8 w-full appearance-none rounded-md border border-slate-300 bg-white px-2 pr-7 text-xs text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    value={draftConfig.selectionGuideAppearance}
                    onChange={(event) =>
                      updateDraftConfig((current) => ({
                        ...current,
                        selectionGuideAppearance: event.target.value as SelectionGuideAppearance
                      }))
                    }
                  >
                    {SELECTION_GUIDE_APPEARANCE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <SelectChevronSmall />
                </div>
              </label>
              <label className="space-y-1">
                <span className="text-[11px] font-medium text-slate-500">Density</span>
                <div className="relative">
                  <select
                    className="h-8 w-full appearance-none rounded-md border border-slate-300 bg-white px-2 pr-7 text-xs text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    value={draftConfig.selectionGuideDensity}
                    onChange={(event) =>
                      updateDraftConfig((current) => ({
                        ...current,
                        selectionGuideDensity: event.target.value as SelectionGuideDensity
                      }))
                    }
                  >
                    {SELECTION_GUIDE_DENSITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <SelectChevronSmall />
                </div>
              </label>
              <label className="space-y-1">
                <span className="text-[11px] font-medium text-slate-500">Surface</span>
                <div className="relative">
                  <select
                    className="h-8 w-full appearance-none rounded-md border border-slate-300 bg-white px-2 pr-7 text-xs text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    value={draftConfig.selectionGuideSurface}
                    onChange={(event) =>
                      updateDraftConfig((current) => ({
                        ...current,
                        selectionGuideSurface: event.target.value as SelectionGuideSurface
                      }))
                    }
                  >
                    {SELECTION_GUIDE_SURFACE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <SelectChevronSmall />
                </div>
              </label>
              <label className="space-y-1">
                <span className="text-[11px] font-medium text-slate-500">Not Found</span>
                <div className="relative">
                  <select
                    className="h-8 w-full appearance-none rounded-md border border-slate-300 bg-white px-2 pr-7 text-xs text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    value={draftConfig.selectionGuideNotFoundMode}
                    onChange={(event) =>
                      updateDraftConfig((current) => ({
                        ...current,
                        selectionGuideNotFoundMode: event.target.value as SelectionGuideNotFoundMode
                      }))
                    }
                  >
                    {SELECTION_GUIDE_NOT_FOUND_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <SelectChevronSmall />
                </div>
              </label>
            </section>

            <section className="grid grid-cols-4 gap-x-3 gap-y-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  checked={draftConfig.selectionGuideShowPill}
                  onChange={(event) =>
                    updateDraftConfig((current) => ({
                      ...current,
                      selectionGuideShowPill: event.target.checked
                    }))
                  }
                />
                <span className="text-[11px] font-medium text-slate-600">Pill</span>
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  checked={draftConfig.selectionGuideShowScale}
                  onChange={(event) =>
                    updateDraftConfig((current) => ({
                      ...current,
                      selectionGuideShowScale: event.target.checked
                    }))
                  }
                />
                <span className="text-[11px] font-medium text-slate-600">Scale</span>
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  checked={draftConfig.selectionGuideShowRecommendation}
                  onChange={(event) =>
                    updateDraftConfig((current) => ({
                      ...current,
                      selectionGuideShowRecommendation: event.target.checked
                    }))
                  }
                />
                <span className="text-[11px] font-medium text-slate-600">Reco</span>
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  checked={draftConfig.selectionGuideShowSummary}
                  onChange={(event) =>
                    updateDraftConfig((current) => ({
                      ...current,
                      selectionGuideShowSummary: event.target.checked
                    }))
                  }
                />
                <span className="text-[11px] font-medium text-slate-600">Summary</span>
              </label>
            </section>

            <section className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 bg-white p-3">
              <label className="space-y-1">
                <span className="text-[11px] font-medium text-slate-500">Margin top (px)</span>
                <input
                  className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={draftConfig.selectionGuideMarginTop}
                  onChange={(event) =>
                    updateDraftConfig((current) => ({
                      ...current,
                      selectionGuideMarginTop: Math.max(0, parseInt(event.target.value, 10) || 0)
                    }))
                  }
                />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] font-medium text-slate-500">Margin bottom (px)</span>
                <input
                  className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={draftConfig.selectionGuideMarginBottom}
                  onChange={(event) =>
                    updateDraftConfig((current) => ({
                      ...current,
                      selectionGuideMarginBottom: Math.max(0, parseInt(event.target.value, 10) || 0)
                    }))
                  }
                />
              </label>
            </section>

            <div className="grid grid-cols-2 gap-2">
              <button
                className="inline-flex h-9 w-full items-center justify-center whitespace-nowrap rounded-md bg-blue-600 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-default disabled:bg-blue-300"
                disabled={!canStartReplaceSelection}
                onClick={() => void beginSelection('replace')}
              >
                {busyAction === 'replace-selection' ? 'Starting…' : 'Pick Element'}
              </button>
              <button
                className="inline-flex h-9 w-full items-center justify-center whitespace-nowrap rounded-md border border-blue-200 bg-blue-50 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-default disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                disabled={isHydrating || !activeTab.supported || busyAction !== null}
                onClick={() => void beginSelection('hide')}
              >
                {busyAction === 'hide-selection' ? 'Starting…' : 'Hide Element'}
              </button>
            </div>
          </>
        ) : null}

        {/* Text Replace */}
        {draftConfig.plugin === 'text-replace' ? (
          <section className="space-y-2.5 rounded-lg border border-slate-200 bg-white p-3">
            <textarea
              className="w-full resize-none rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              rows={3}
              placeholder="The text that will replace the selected element's content…"
              value={draftConfig.textReplaceText}
              onChange={(event) =>
                updateDraftConfig((current) => ({
                  ...current,
                  textReplaceText: event.target.value
                }))
              }
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                className="inline-flex h-9 w-full items-center justify-center whitespace-nowrap rounded-md bg-blue-600 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-default disabled:bg-blue-300"
                disabled={!canStartReplaceSelection}
                onClick={() => void beginSelection('replace')}
              >
                {busyAction === 'replace-selection' ? 'Starting…' : 'Pick Element'}
              </button>
              <button
                className="inline-flex h-9 w-full items-center justify-center whitespace-nowrap rounded-md border border-blue-200 bg-blue-50 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-default disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                disabled={isHydrating || !activeTab.supported || busyAction !== null}
                onClick={() => void beginSelection('hide')}
              >
                {busyAction === 'hide-selection' ? 'Starting…' : 'Hide Element'}
              </button>
            </div>
          </section>
        ) : null}

        {/* Chatbot */}
        {draftConfig.plugin === 'chatbot' ? (
          <section className="space-y-2.5 rounded-lg border border-slate-200 bg-white p-3">
            {!isAuthenticated ? (
              <>
                <button
                  className="inline-flex h-9 w-full items-center justify-center whitespace-nowrap rounded-md border border-blue-200 bg-blue-50 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-default disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                  disabled={isHydrating || busyAction !== null}
                  onClick={() => void handleLogin()}
                >
                  {busyAction === 'auth-login' ? 'Logging in…' : 'Log in with parcelLab'}
                </button>
              </>
            ) : (
              <>
                <div className="flex items-end gap-2">
                  <label className="min-w-0 flex-1 space-y-1">
                    <span className="text-[11px] font-medium text-slate-500">Account</span>
                    <input
                      className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      placeholder="1619884"
                      inputMode="numeric"
                      value={chatbotConfig.account}
                      onChange={(event) =>
                        updateChatbotConfig((current) => ({
                          ...current,
                          account: parseInt(event.target.value, 10) || 0
                        }))
                      }
                    />
                  </label>
                  <label className="min-w-0 flex-[2] space-y-1">
                    <span className="text-[11px] font-medium text-slate-500">Agent ID</span>
                    <input
                      className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      placeholder="58e65ace-932b-4f9d-…"
                      value={chatbotConfig.agentId}
                      onChange={(event) =>
                        updateChatbotConfig((current) => ({
                          ...current,
                          agentId: event.target.value
                        }))
                      }
                    />
                  </label>
                  <button
                    className="inline-flex h-8 shrink-0 items-center justify-center whitespace-nowrap rounded-md bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-default disabled:bg-blue-300"
                    disabled={!canAddChatbot}
                    onClick={() => void addChatbot()}
                  >
                    {busyAction === 'add-chatbot' ? 'Adding…' : 'Add Chatbot'}
                  </button>
                </div>
                <div className="flex justify-end">
                  <button
                    className="text-[11px] font-medium text-slate-400 transition hover:text-slate-600 disabled:text-slate-300"
                    disabled={busyAction !== null}
                    onClick={() => void handleLogout()}
                  >
                    {busyAction === 'auth-logout' ? 'Logging out…' : 'Log out'}
                  </button>
                </div>
              </>
            )}
          </section>
        ) : null}

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

        {!isHydrating && activeTab.supported ? (
          <div className="flex justify-end">
            <button
              className="text-[11px] font-medium text-slate-400 transition hover:text-slate-600"
              onClick={() => void copyPageDebugData()}
              title="Copy stored rules for this page as JSON"
            >
              Copy page debug data
            </button>
          </div>
        ) : null}
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
              {formatDemoConfigSummary(group.demoConfig)}
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
            <th className="w-32 px-4 py-1.5 font-medium">Type</th>
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
                    resolveRuleTypeLabel(rule) !== 'Hide'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {resolveRuleTypeLabel(rule)}
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
): DemoConfig | undefined {
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
): DemoConfig | undefined {
  return rules.find((rule) => rule.demoConfig)?.demoConfig;
}

function resolveRuleTypeLabel(rule: SavedModification): string {
  if (rule.action === 'hide') {
    return 'Hide';
  }

  if (rule.demoConfig?.kind === 'returns-portal') {
    return 'Returns';
  }

  if (rule.demoConfig?.kind === 'track-and-trace') {
    return 'Tracking';
  }

  if (rule.demoConfig?.kind === 'selection-guide') {
    return 'Size Guide';
  }

  if (rule.demoConfig?.kind === 'chatbot') {
    return 'Chatbot';
  }

  if (rule.demoConfig?.kind === 'text-replace') {
    return 'Text';
  }

  return 'Replace';
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

function SelectChevron() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-700"
      fill="none"
      viewBox="0 0 20 20"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m5 7 5 5 5-5"
      />
    </svg>
  );
}

function SelectChevronSmall() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-500"
      fill="none"
      viewBox="0 0 20 20"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m5 7 5 5 5-5"
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
