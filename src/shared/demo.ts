import type {
  ChatbotDemoConfig,
  DemoConfig,
  DemoDraftConfig,
  DemoPluginKind,
  PromiseConfidence,
  PromiseDateFormat,
  PromiseDateMode,
  PromiseDemoConfig,
  PromiseIcon,
  PromiseLayout,
  PromiseSelectionPick,
  PromiseSelectionReferenceDate,
  PromiseShowCarrier,
  PromiseShowCutoff,
  PromiseZipPicker,
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
  promiseDestinationCountry: 'DEU',
  promisePostalCode: '',
  promiseLayout: 'card',
  promiseDateMode: 'range',
  promiseZipPicker: 'inline',
  promiseShowCutoff: 'always',
  promiseIcon: 'calendar',
  promiseConfidence: 'auto',
  promiseDateFormat: 'short',
  promiseShowCarrier: 'none',
  promiseRequireZip: false,
  promiseCourier: '',
  promiseServiceLevel: '',
  promiseWarehouse: '',
  promiseSelectionReferenceDate: 'mostLikely',
  promiseSelectionPick: 'earliest',
  promiseFallbackDays: '',
  textReplaceText: ''
};

export const DEMO_PLUGIN_OPTIONS: Array<{
  label: string;
  value: DemoPluginKind;
}> = [
  { label: 'Tracking', value: 'track-and-trace' },
  { label: 'Returns', value: 'returns-portal' },
  { label: 'Promise', value: 'promise' },
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

export const PROMISE_LAYOUT_OPTIONS: Array<{
  label: string;
  value: PromiseLayout;
}> = [
  { label: 'Text', value: 'text' },
  { label: 'Card', value: 'card' },
  { label: 'Badge', value: 'badge' }
];

export const PROMISE_DATE_MODE_OPTIONS: Array<{
  label: string;
  value: PromiseDateMode;
}> = [
  { label: 'as early as', value: 'from' },
  { label: 'on', value: 'on' },
  { label: 'by', value: 'by' },
  { label: 'range', value: 'range' }
];

export const PROMISE_ZIP_PICKER_OPTIONS: Array<{
  label: string;
  value: PromiseZipPicker;
}> = [
  { label: 'None', value: 'none' },
  { label: 'Inline', value: 'inline' },
  { label: 'Link', value: 'link' }
];

export const PROMISE_SHOW_CUTOFF_OPTIONS: Array<{
  label: string;
  value: PromiseShowCutoff;
}> = [
  { label: 'Auto', value: 'auto' },
  { label: 'Always', value: 'always' },
  { label: 'Never', value: 'never' },
  { label: 'Express only', value: 'express-only' }
];

export const PROMISE_ICON_OPTIONS: Array<{
  label: string;
  value: PromiseIcon;
}> = [
  { label: 'None', value: 'none' },
  { label: 'Truck', value: 'truck' },
  { label: 'Calendar', value: 'calendar' }
];

export const PROMISE_CONFIDENCE_OPTIONS: Array<{
  label: string;
  value: PromiseConfidence;
}> = [
  { label: 'Auto', value: 'auto' },
  { label: 'Estimated', value: 'estimated' },
  { label: 'Guaranteed', value: 'guaranteed' }
];

export const PROMISE_DATE_FORMAT_OPTIONS: Array<{
  label: string;
  value: PromiseDateFormat;
}> = [
  { label: 'Long', value: 'long' },
  { label: 'Long w/ year', value: 'longWithYear' },
  { label: 'Short', value: 'short' },
  { label: 'Short w/ year', value: 'shortWithYear' },
  { label: 'Relative', value: 'relative' }
];

export const PROMISE_SHOW_CARRIER_OPTIONS: Array<{
  label: string;
  value: PromiseShowCarrier;
}> = [
  { label: 'None', value: 'none' },
  { label: 'Inline', value: 'inline' }
];

export const PROMISE_SELECTION_REFERENCE_DATE_OPTIONS: Array<{
  label: string;
  value: PromiseSelectionReferenceDate;
}> = [
  { label: 'Most likely', value: 'mostLikely' },
  { label: 'Earliest', value: 'earliest' },
  { label: 'Latest', value: 'latest' }
];

export const PROMISE_SELECTION_PICK_OPTIONS: Array<{
  label: string;
  value: PromiseSelectionPick;
}> = [
  { label: 'Earliest', value: 'earliest' },
  { label: 'Latest', value: 'latest' }
];

export type PromiseSample = {
  label: string;
  destinationCountry: string;
  postalCode: string;
  locale: SupportedLanguage;
};

export const PROMISE_SAMPLES: PromiseSample[] = [
  { label: 'DE, no zip', destinationCountry: 'DEU', postalCode: '', locale: 'de' },
  { label: 'DE, w/ zip', destinationCountry: 'DEU', postalCode: '81371', locale: 'de' },
  { label: 'US, no zip', destinationCountry: 'USA', postalCode: '', locale: 'en' },
  { label: 'US, w/ zip', destinationCountry: 'USA', postalCode: '10038', locale: 'en' }
];

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

  if ('kind' in value && value.kind === 'promise') {
    const p = value as PromiseDemoConfig;
    return {
      kind: 'promise',
      accountId: p.accountId,
      destinationCountry: p.destinationCountry,
      postalCode: p.postalCode ?? '',
      locale: p.locale,
      layout: normalizePromiseLayout(p.layout),
      dateMode: normalizePromiseDateMode(p.dateMode),
      zipPicker: normalizePromiseZipPicker(p.zipPicker),
      showCutoff: normalizePromiseShowCutoff(p.showCutoff),
      icon: normalizePromiseIcon(p.icon),
      confidence: normalizePromiseConfidence(p.confidence),
      dateFormat: normalizePromiseDateFormat(p.dateFormat),
      showCarrier: normalizePromiseShowCarrier(p.showCarrier),
      requireZip: p.requireZip === true,
      courier: p.courier ?? '',
      serviceLevel: p.serviceLevel ?? '',
      warehouse: p.warehouse ?? '',
      selectionReferenceDate: normalizePromiseSelectionReferenceDate(p.selectionReferenceDate),
      selectionPick: normalizePromiseSelectionPick(p.selectionPick),
      fallbackDays: typeof p.fallbackDays === 'string' ? p.fallbackDays : ''
    } satisfies PromiseDemoConfig;
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
      : value?.plugin === 'promise'
        ? 'promise'
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
    promiseDestinationCountry:
      typeof value?.promiseDestinationCountry === 'string' && value.promiseDestinationCountry.trim()
        ? value.promiseDestinationCountry
        : DEFAULT_DEMO_DRAFT_CONFIG.promiseDestinationCountry,
    promisePostalCode:
      typeof value?.promisePostalCode === 'string' ? value.promisePostalCode : '',
    promiseLayout: normalizePromiseLayout(value?.promiseLayout),
    promiseDateMode: normalizePromiseDateMode(value?.promiseDateMode),
    promiseZipPicker: normalizePromiseZipPicker(value?.promiseZipPicker),
    promiseShowCutoff: normalizePromiseShowCutoff(value?.promiseShowCutoff),
    promiseIcon: normalizePromiseIcon(value?.promiseIcon),
    promiseConfidence: normalizePromiseConfidence(value?.promiseConfidence),
    promiseDateFormat: normalizePromiseDateFormat(value?.promiseDateFormat),
    promiseShowCarrier: normalizePromiseShowCarrier(value?.promiseShowCarrier),
    promiseRequireZip: value?.promiseRequireZip === true,
    promiseCourier: typeof value?.promiseCourier === 'string' ? value.promiseCourier : '',
    promiseServiceLevel:
      typeof value?.promiseServiceLevel === 'string' ? value.promiseServiceLevel : '',
    promiseWarehouse: typeof value?.promiseWarehouse === 'string' ? value.promiseWarehouse : '',
    promiseSelectionReferenceDate: normalizePromiseSelectionReferenceDate(
      value?.promiseSelectionReferenceDate
    ),
    promiseSelectionPick: normalizePromiseSelectionPick(value?.promiseSelectionPick),
    promiseFallbackDays:
      typeof value?.promiseFallbackDays === 'string' ? value.promiseFallbackDays : '',
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

  if (draft.plugin === 'promise') {
    return {
      kind: 'promise',
      accountId: draft.accountId.trim(),
      destinationCountry: draft.promiseDestinationCountry.trim().toUpperCase(),
      postalCode: draft.promisePostalCode.trim(),
      locale: draft.lang,
      layout: draft.promiseLayout,
      dateMode: draft.promiseDateMode,
      zipPicker: draft.promiseZipPicker,
      showCutoff: draft.promiseShowCutoff,
      icon: draft.promiseIcon,
      confidence: draft.promiseConfidence,
      dateFormat: draft.promiseDateFormat,
      showCarrier: draft.promiseShowCarrier,
      requireZip: draft.promiseRequireZip,
      courier: draft.promiseCourier.trim(),
      serviceLevel: draft.promiseServiceLevel.trim(),
      warehouse: draft.promiseWarehouse.trim(),
      selectionReferenceDate: draft.promiseSelectionReferenceDate,
      selectionPick: draft.promiseSelectionPick,
      fallbackDays: draft.promiseFallbackDays.trim()
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

  if (config.kind === 'promise') {
    return {
      ...draft,
      plugin: 'promise',
      accountId: config.accountId,
      lang: config.locale,
      promiseDestinationCountry: config.destinationCountry,
      promisePostalCode: config.postalCode,
      promiseLayout: config.layout,
      promiseDateMode: config.dateMode,
      promiseZipPicker: config.zipPicker,
      promiseShowCutoff: config.showCutoff,
      promiseIcon: config.icon,
      promiseConfidence: config.confidence,
      promiseDateFormat: config.dateFormat,
      promiseShowCarrier: config.showCarrier,
      promiseRequireZip: config.requireZip,
      promiseCourier: config.courier,
      promiseServiceLevel: config.serviceLevel,
      promiseWarehouse: config.warehouse,
      promiseSelectionReferenceDate: config.selectionReferenceDate,
      promiseSelectionPick: config.selectionPick,
      promiseFallbackDays: config.fallbackDays
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

  if (draft.plugin === 'promise') {
    if (!/^\d{1,7}$/.test(draft.accountId.trim())) {
      return 'Enter a numeric parcelLab account ID with up to 7 digits.';
    }

    const country = draft.promiseDestinationCountry.trim();
    if (!/^[A-Za-z]{3}$/.test(country)) {
      return 'Enter a 3-letter destination country (ISO 3166 alpha-3).';
    }

    if (draft.promiseFallbackDays.trim() && !isValidFallbackDays(draft.promiseFallbackDays)) {
      return 'Fallback days must be a number or a range like "2-3".';
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

  if (config.kind === 'promise') {
    const dest = config.postalCode
      ? `${config.destinationCountry} ${config.postalCode}`
      : config.destinationCountry;
    return `Promise · ${config.accountId} · ${dest}`;
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

function normalizePromiseLayout(value: unknown): PromiseLayout {
  return value === 'text' || value === 'badge' ? value : 'card';
}

function normalizePromiseDateMode(value: unknown): PromiseDateMode {
  return value === 'from' || value === 'on' || value === 'by' ? value : 'range';
}

function normalizePromiseZipPicker(value: unknown): PromiseZipPicker {
  return value === 'none' || value === 'link' ? value : 'inline';
}

function normalizePromiseShowCutoff(value: unknown): PromiseShowCutoff {
  return value === 'auto' || value === 'never' || value === 'express-only'
    ? value
    : 'always';
}

function normalizePromiseIcon(value: unknown): PromiseIcon {
  return value === 'none' || value === 'truck' ? value : 'calendar';
}

function normalizePromiseConfidence(value: unknown): PromiseConfidence {
  return value === 'estimated' || value === 'guaranteed' ? value : 'auto';
}

function normalizePromiseDateFormat(value: unknown): PromiseDateFormat {
  return value === 'long' ||
    value === 'longWithYear' ||
    value === 'shortWithYear' ||
    value === 'relative'
    ? value
    : 'short';
}

function normalizePromiseShowCarrier(value: unknown): PromiseShowCarrier {
  return value === 'inline' ? 'inline' : 'none';
}

function normalizePromiseSelectionReferenceDate(
  value: unknown
): PromiseSelectionReferenceDate {
  return value === 'earliest' || value === 'latest' ? value : 'mostLikely';
}

function normalizePromiseSelectionPick(value: unknown): PromiseSelectionPick {
  return value === 'latest' ? 'latest' : 'earliest';
}

function isValidFallbackDays(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return true;
  const range = trimmed.match(/^(\d+)\s*[-–]\s*(\d+)$/);
  if (range) {
    const min = Number(range[1]);
    const max = Number(range[2]);
    return Number.isFinite(min) && Number.isFinite(max) && min >= 0 && min <= max;
  }
  const single = Number(trimmed);
  return Number.isFinite(single) && single >= 0;
}
