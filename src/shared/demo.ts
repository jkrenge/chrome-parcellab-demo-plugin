import type {
  DemoConfig,
  DemoDraftConfig,
  DemoPluginKind,
  ReturnsPortalConfig,
  SelectionGuideAppearance,
  SelectionGuideConfig,
  SelectionGuideDensity,
  SelectionGuideNotFoundMode,
  SelectionGuideSurface,
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
  showArticleList: true,
  productId: '',
  selectionGuideAppearance: 'neutral',
  selectionGuideDensity: 'compact',
  selectionGuideSurface: 'subtle',
  selectionGuideNotFoundMode: 'true-to-size'
};

export const DEMO_PLUGIN_OPTIONS: Array<{
  label: string;
  value: DemoPluginKind;
}> = [
  { label: 'Track & Trace', value: 'track-and-trace' },
  { label: 'Returns Portal', value: 'returns-portal' },
  { label: 'Selection Guide', value: 'selection-guide' }
];

export const SELECTION_GUIDE_APPEARANCE_OPTIONS: Array<{
  label: string;
  value: SelectionGuideAppearance;
}> = [
  { label: 'Neutral', value: 'neutral' },
  { label: 'Colored', value: 'colored' }
];

export const SELECTION_GUIDE_DENSITY_OPTIONS: Array<{
  label: string;
  value: SelectionGuideDensity;
}> = [
  { label: 'Compact', value: 'compact' },
  { label: 'Comfortable', value: 'comfortable' }
];

export const SELECTION_GUIDE_SURFACE_OPTIONS: Array<{
  label: string;
  value: SelectionGuideSurface;
}> = [
  { label: 'Card', value: 'subtle' },
  { label: 'Inline', value: 'plain' }
];

export const SELECTION_GUIDE_NOT_FOUND_OPTIONS: Array<{
  label: string;
  value: SelectionGuideNotFoundMode;
}> = [
  { label: 'True to Size', value: 'true-to-size' },
  { label: 'Empty', value: 'empty' }
];

export type SelectionGuideSample = {
  label: string;
  accountId: string;
  productId: string;
};

export const SELECTION_GUIDE_SAMPLES: SelectionGuideSample[] = [
  {
    label: 'Pants (tailored fit)',
    accountId: '1617954',
    productId: "Men's Iver Pants (tailored fit)"
  },
  {
    label: 'Oxford Shirt',
    accountId: '1617954',
    productId: "Men's Classic Oxford Shirt"
  }
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

  if ('kind' in value && value.kind === 'selection-guide') {
    const sg = value as SelectionGuideConfig;
    return {
      kind: 'selection-guide',
      accountId: sg.accountId,
      productId: sg.productId,
      locale: sg.locale,
      appearance: sg.appearance ?? 'neutral',
      density: sg.density ?? 'compact',
      surface: sg.surface ?? 'subtle',
      notFoundMode: sg.notFoundMode ?? 'true-to-size'
    } satisfies SelectionGuideConfig;
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
  const plugin: DemoPluginKind =
    value?.plugin === 'returns-portal'
      ? 'returns-portal'
      : value?.plugin === 'selection-guide'
        ? 'selection-guide'
        : 'track-and-trace';

  return {
    plugin,
    accountId:
      typeof value?.accountId === 'string'
        ? value.accountId
        : DEFAULT_DEMO_DRAFT_CONFIG.accountId,
    lang: isSupportedLanguage(value?.lang) ? value.lang : DEFAULT_DEMO_DRAFT_CONFIG.lang,
    portalCode: typeof value?.portalCode === 'string' ? value.portalCode : '',
    showArticleList: value?.showArticleList !== false,
    productId: typeof value?.productId === 'string' ? value.productId : '',
    selectionGuideAppearance:
      value?.selectionGuideAppearance === 'colored' ? 'colored' : 'neutral',
    selectionGuideDensity:
      value?.selectionGuideDensity === 'comfortable' ? 'comfortable' : 'compact',
    selectionGuideSurface:
      value?.selectionGuideSurface === 'plain' ? 'plain' : 'subtle',
    selectionGuideNotFoundMode:
      value?.selectionGuideNotFoundMode === 'empty' ? 'empty' : 'true-to-size'
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

  if (draft.plugin === 'selection-guide') {
    return {
      kind: 'selection-guide',
      accountId: draft.accountId.trim(),
      productId: draft.productId.trim(),
      locale: draft.lang,
      appearance: draft.selectionGuideAppearance,
      density: draft.selectionGuideDensity,
      surface: draft.selectionGuideSurface,
      notFoundMode: draft.selectionGuideNotFoundMode
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

  if (config.kind === 'selection-guide') {
    return {
      ...draft,
      plugin: 'selection-guide',
      accountId: config.accountId,
      productId: config.productId,
      lang: config.locale,
      selectionGuideAppearance: config.appearance,
      selectionGuideDensity: config.density,
      selectionGuideSurface: config.surface,
      selectionGuideNotFoundMode: config.notFoundMode
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

  if (draft.plugin === 'selection-guide') {
    if (!draft.accountId.trim()) {
      return 'Enter a parcelLab account ID.';
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

  if (config.kind === 'selection-guide') {
    const product = config.productId || 'no product';
    return `Selection Guide · ${config.accountId} · ${product}`;
  }

  return `Track & Trace · ${config.userId} · ${formatLanguageLabel(config.lang)}`;
}

function isSupportedLanguage(value: unknown): value is SupportedLanguage {
  return LANGUAGE_OPTIONS.some((option) => option.value === value);
}
