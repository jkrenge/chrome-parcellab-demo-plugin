import type {
  ChatbotDemoConfig,
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
  TextReplaceConfig,
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
  selectionGuideAppearance: 'colored',
  selectionGuideDensity: 'comfortable',
  selectionGuideSurface: 'plain',
  selectionGuideNotFoundMode: 'true-to-size',
  selectionGuideShowPill: true,
  selectionGuideShowScale: true,
  selectionGuideShowRecommendation: true,
  selectionGuideShowSummary: true,
  selectionGuideMarginTop: 0,
  selectionGuideMarginBottom: 0,
  textReplaceText: ''
};

export const DEMO_PLUGIN_OPTIONS: Array<{
  label: string;
  value: DemoPluginKind;
}> = [
  { label: 'Tracking', value: 'track-and-trace' },
  { label: 'Returns', value: 'returns-portal' },
  { label: 'Size Guide', value: 'selection-guide' },
  { label: 'Chatbot', value: 'chatbot' },
  { label: 'Text', value: 'text-replace' }
];

export const SELECTION_GUIDE_APPEARANCE_OPTIONS: Array<{
  label: string;
  value: SelectionGuideAppearance;
}> = [
  { label: 'Neutral', value: 'neutral' },
  { label: 'Colored', value: 'colored' },
  { label: 'Alert', value: 'alert' }
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
  { label: 'Empty', value: 'empty' },
  { label: 'Hidden', value: 'hidden' }
];

export type SelectionGuideSample = {
  label: string;
  accountId: string;
  productId: string;
};

export const SELECTION_GUIDE_SAMPLES: SelectionGuideSample[] = [
  {
    label: 'Pants (tailored)',
    accountId: '1617954',
    productId: "Men's Iver Pants (tailored fit)"
  },
  {
    label: 'Shirt',
    accountId: '1619013',
    productId: '6792154579016'
  },
  {
    label: 'Pants (large)',
    accountId: '1617954',
    productId: "Men's Pro 3L 3.0 Pants"
  },
  {
    label: 'Pants (small)',
    accountId: '1617954',
    productId: "Men's Iver 5-Pocket Pants"
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
      appearance: sg.appearance ?? 'colored',
      density: sg.density ?? 'comfortable',
      surface: sg.surface ?? 'plain',
      notFoundMode: sg.notFoundMode ?? 'true-to-size',
      showPill: sg.showPill !== false,
      showScale: sg.showScale !== false,
      showRecommendation: sg.showRecommendation !== false,
      showSummary: sg.showSummary !== false,
      marginTop: sg.marginTop ?? 0,
      marginBottom: sg.marginBottom ?? 0
    } satisfies SelectionGuideConfig;
  }

  if ('kind' in value && value.kind === 'chatbot') {
    const cb = value as ChatbotDemoConfig;
    return {
      kind: 'chatbot',
      agentId: cb.agentId,
      account: cb.account ?? 1619884,
      baseUrl: cb.baseUrl
    } satisfies ChatbotDemoConfig;
  }

  if ('kind' in value && value.kind === 'track-and-trace') {
    return {
      kind: 'track-and-trace',
      userId: value.userId,
      lang: value.lang,
      showArticleList: value.showArticleList
    } satisfies TrackAndTraceConfig;
  }

  if ('kind' in value && value.kind === 'text-replace') {
    const tr = value as TextReplaceConfig;
    return {
      kind: 'text-replace',
      text: tr.text ?? ''
    } satisfies TextReplaceConfig;
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
        : value?.plugin === 'chatbot'
          ? 'chatbot'
          : value?.plugin === 'text-replace'
            ? 'text-replace'
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
      value?.selectionGuideAppearance === 'neutral'
        ? 'neutral'
        : value?.selectionGuideAppearance === 'alert'
          ? 'alert'
          : 'colored',
    selectionGuideDensity:
      value?.selectionGuideDensity === 'compact' ? 'compact' : 'comfortable',
    selectionGuideSurface:
      value?.selectionGuideSurface === 'subtle' ? 'subtle' : 'plain',
    selectionGuideNotFoundMode:
      value?.selectionGuideNotFoundMode === 'empty'
        ? 'empty'
        : value?.selectionGuideNotFoundMode === 'hidden'
          ? 'hidden'
          : 'true-to-size',
    selectionGuideShowPill: value?.selectionGuideShowPill !== false,
    selectionGuideShowScale: value?.selectionGuideShowScale !== false,
    selectionGuideShowRecommendation: value?.selectionGuideShowRecommendation !== false,
    selectionGuideShowSummary: value?.selectionGuideShowSummary !== false,
    selectionGuideMarginTop:
      typeof value?.selectionGuideMarginTop === 'number' ? value.selectionGuideMarginTop : 0,
    selectionGuideMarginBottom:
      typeof value?.selectionGuideMarginBottom === 'number' ? value.selectionGuideMarginBottom : 0,
    textReplaceText: typeof value?.textReplaceText === 'string' ? value.textReplaceText : ''
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
      notFoundMode: draft.selectionGuideNotFoundMode,
      showPill: draft.selectionGuideShowPill,
      showScale: draft.selectionGuideShowScale,
      showRecommendation: draft.selectionGuideShowRecommendation,
      showSummary: draft.selectionGuideShowSummary,
      marginTop: draft.selectionGuideMarginTop,
      marginBottom: draft.selectionGuideMarginBottom
    };
  }

  if (draft.plugin === 'text-replace') {
    return {
      kind: 'text-replace',
      text: draft.textReplaceText
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
      selectionGuideNotFoundMode: config.notFoundMode,
      selectionGuideShowPill: config.showPill,
      selectionGuideShowScale: config.showScale,
      selectionGuideShowRecommendation: config.showRecommendation,
      selectionGuideShowSummary: config.showSummary,
      selectionGuideMarginTop: config.marginTop,
      selectionGuideMarginBottom: config.marginBottom
    };
  }

  if (config.kind === 'chatbot') {
    return {
      ...draft,
      plugin: 'chatbot'
    };
  }

  if (config.kind === 'text-replace') {
    return {
      ...draft,
      plugin: 'text-replace',
      textReplaceText: config.text
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

  if (draft.plugin === 'chatbot') {
    return undefined;
  }

  if (draft.plugin === 'text-replace') {
    if (!draft.textReplaceText.trim()) {
      return 'Enter the replacement text.';
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

  if (config.kind === 'chatbot') {
    return `Chatbot · ${config.agentId}`;
  }

  if (config.kind === 'text-replace') {
    const preview = config.text.length > 40 ? `${config.text.slice(0, 40)}…` : config.text;
    return `Text Replace · "${preview}"`;
  }

  return `Track & Trace · ${config.userId} · ${formatLanguageLabel(config.lang)}`;
}

function isSupportedLanguage(value: unknown): value is SupportedLanguage {
  return LANGUAGE_OPTIONS.some((option) => option.value === value);
}
