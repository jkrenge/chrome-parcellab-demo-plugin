import type {
  DemoConfig,
  DemoDraftConfig,
  DemoPluginKind,
  ReturnsPortalConfig,
  SupportedLanguage,
  TrackAndTraceConfig
} from './types';

type LegacyTrackAndTraceConfig = {
  userId: string;
  lang: SupportedLanguage;
  showArticleList: boolean;
};

export const DEFAULT_DEMO_DRAFT_CONFIG: DemoDraftConfig = {
  plugin: 'track-and-trace',
  accountId: '1612197',
  lang: 'en',
  portalCode: '',
  showArticleList: true
};

export const DEMO_PLUGIN_OPTIONS: Array<{
  label: string;
  value: DemoPluginKind;
}> = [
  { label: 'Track & Trace', value: 'track-and-trace' },
  { label: 'Returns Portal', value: 'returns-portal' }
];

export const LANGUAGE_OPTIONS: Array<{
  label: string;
  value: SupportedLanguage;
}> = [
  { label: 'English', value: 'en' },
  { label: 'German', value: 'de' },
  { label: 'Spanish', value: 'es' },
  { label: 'French', value: 'fr' },
  { label: 'Italian', value: 'it' },
  { label: 'Japanese', value: 'ja' },
  { label: 'Korean', value: 'ko' }
];

export function normalizeDemoConfig(
  value?: DemoConfig | LegacyTrackAndTraceConfig | null
): DemoConfig | undefined {
  if (!value) {
    return undefined;
  }

  if ('kind' in value && value.kind === 'returns-portal') {
    return {
      kind: 'returns-portal',
      accountName: value.accountName,
      portalCode: value.portalCode,
      lang: value.lang
    } satisfies ReturnsPortalConfig;
  }

  if ('kind' in value && value.kind === 'track-and-trace') {
    return {
      kind: 'track-and-trace',
      userId: value.userId,
      lang: value.lang,
      showArticleList: value.showArticleList
    } satisfies TrackAndTraceConfig;
  }

  if ('userId' in value) {
    return {
      kind: 'track-and-trace',
      userId: value.userId,
      lang: value.lang,
      showArticleList: value.showArticleList
    } satisfies TrackAndTraceConfig;
  }

  return undefined;
}

export function normalizeDemoDraftConfig(
  value?: Partial<DemoDraftConfig> | null
): DemoDraftConfig {
  return {
    plugin:
      value?.plugin === 'returns-portal' ? 'returns-portal' : 'track-and-trace',
    accountId:
      typeof value?.accountId === 'string'
        ? value.accountId
        : DEFAULT_DEMO_DRAFT_CONFIG.accountId,
    lang: isSupportedLanguage(value?.lang) ? value.lang : DEFAULT_DEMO_DRAFT_CONFIG.lang,
    portalCode: typeof value?.portalCode === 'string' ? value.portalCode : '',
    showArticleList: value?.showArticleList !== false
  };
}

export function buildDemoConfigFromDraft(
  draft: DemoDraftConfig
): DemoConfig {
  if (draft.plugin === 'returns-portal') {
    return {
      kind: 'returns-portal',
      accountName: draft.accountId.trim(),
      portalCode: draft.portalCode.trim(),
      lang: draft.lang
    };
  }

  return {
    kind: 'track-and-trace',
    userId: draft.accountId.trim(),
    lang: draft.lang,
    showArticleList: draft.showArticleList
  };
}

export function mergeDemoConfigIntoDraft(
  draft: DemoDraftConfig,
  value?: DemoConfig
): DemoDraftConfig {
  const config = normalizeDemoConfig(value);
  if (!config) {
    return draft;
  }

  if (config.kind === 'returns-portal') {
    return {
      ...draft,
      plugin: 'returns-portal',
      accountId: config.accountName,
      portalCode: config.portalCode,
      lang: config.lang
    };
  }

  return {
    ...draft,
    plugin: 'track-and-trace',
    accountId: config.userId,
    lang: config.lang,
    showArticleList: config.showArticleList
  };
}

export function validateDemoDraftConfig(
  draft: DemoDraftConfig
): string | undefined {
  if (draft.plugin === 'returns-portal') {
    if (!draft.accountId.trim()) {
      return 'Enter a parcelLab account name.';
    }

    if (!draft.portalCode.trim()) {
      return 'Enter a Returns Portal code.';
    }

    return undefined;
  }

  if (!/^\d{1,7}$/.test(draft.accountId.trim())) {
    return 'Enter a numeric parcelLab user ID with up to 7 digits.';
  }

  return undefined;
}

export function formatLanguageLabel(language: SupportedLanguage): string {
  return LANGUAGE_OPTIONS.find((option) => option.value === language)?.label ?? language;
}

export function formatDemoConfigSummary(value?: DemoConfig): string | undefined {
  const config = normalizeDemoConfig(value);
  if (!config) {
    return undefined;
  }

  if (config.kind === 'returns-portal') {
    return `Returns Portal · ${config.portalCode} · ${config.accountName}`;
  }

  return `Track & Trace · ${config.userId} · ${formatLanguageLabel(config.lang)}`;
}

function isSupportedLanguage(value: unknown): value is SupportedLanguage {
  return LANGUAGE_OPTIONS.some((option) => option.value === value);
}
