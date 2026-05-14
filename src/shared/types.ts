export type ModificationAction = 'hide' | 'replace';
export type DemoPluginKind = 'track-and-trace' | 'returns-portal' | 'promise' | 'selection-guide' | 'chatbot' | 'text-replace';

export type SelectionGuideAppearance = 'neutral' | 'colored' | 'alert';
export type SelectionGuideDensity = 'compact' | 'comfortable';
export type SelectionGuideSurface = 'subtle' | 'plain';
export type SelectionGuideNotFoundMode = 'empty' | 'true-to-size' | 'hidden';

export type PromiseLayout = 'text' | 'card' | 'badge';
export type PromiseDateMode = 'from' | 'on' | 'by' | 'range';
export type PromiseZipPicker = 'none' | 'inline' | 'link';
export type PromiseShowCutoff = 'auto' | 'always' | 'never' | 'express-only';
export type PromiseIcon = 'none' | 'truck' | 'calendar';
export type PromiseConfidence = 'auto' | 'estimated' | 'guaranteed';
export type PromiseDateFormat =
  | 'long'
  | 'longWithYear'
  | 'short'
  | 'shortWithYear'
  | 'relative';
export type PromiseShowCarrier = 'none' | 'inline';
export type PromiseSelectionReferenceDate = 'earliest' | 'latest' | 'mostLikely';
export type PromiseSelectionPick = 'earliest' | 'latest';

export type SupportedLanguage =
  | 'en'
  | 'de'
  | 'es'
  | 'fr'
  | 'it'
  | 'ja'
  | 'ko';

export type TrackAndTraceConfig = {
  kind: 'track-and-trace';
  userId: string;
  lang: SupportedLanguage;
  showArticleList: boolean;
};

export type ReturnsPortalConfig = {
  kind: 'returns-portal';
  accountName: string;
  portalCode: string;
  lang: SupportedLanguage;
};

export type PromiseDemoConfig = {
  kind: 'promise';
  accountId: string;
  destinationCountry: string;
  postalCode: string;
  locale: SupportedLanguage;
  layout: PromiseLayout;
  dateMode: PromiseDateMode;
  zipPicker: PromiseZipPicker;
  showCutoff: PromiseShowCutoff;
  icon: PromiseIcon;
  confidence: PromiseConfidence;
  dateFormat: PromiseDateFormat;
  showCarrier: PromiseShowCarrier;
  requireZip: boolean;
  courier: string;
  serviceLevel: string;
  warehouse: string;
  selectionReferenceDate: PromiseSelectionReferenceDate;
  selectionPick: PromiseSelectionPick;
  fallbackDays: string;
};

export type SelectionGuideConfig = {
  kind: 'selection-guide';
  accountId: string;
  productId: string;
  locale: SupportedLanguage;
  appearance: SelectionGuideAppearance;
  density: SelectionGuideDensity;
  surface: SelectionGuideSurface;
  notFoundMode: SelectionGuideNotFoundMode;
  showPill: boolean;
  showScale: boolean;
  showRecommendation: boolean;
  showSummary: boolean;
  marginTop: number;
  marginBottom: number;
};

export type ChatbotDemoConfig = {
  kind: 'chatbot';
  agentId: string;
  account: number;
  baseUrl: string;
};

export type TextReplaceConfig = {
  kind: 'text-replace';
  text: string;
};

export type DemoConfig =
  | TrackAndTraceConfig
  | ReturnsPortalConfig
  | PromiseDemoConfig
  | SelectionGuideConfig
  | ChatbotDemoConfig
  | TextReplaceConfig;

export type DemoDraftConfig = {
  plugin: DemoPluginKind;
  accountId: string;
  lang: SupportedLanguage;
  portalCode: string;
  showArticleList: boolean;
  productId: string;
  selectionGuideAppearance: SelectionGuideAppearance;
  selectionGuideDensity: SelectionGuideDensity;
  selectionGuideSurface: SelectionGuideSurface;
  selectionGuideNotFoundMode: SelectionGuideNotFoundMode;
  selectionGuideShowPill: boolean;
  selectionGuideShowScale: boolean;
  selectionGuideShowRecommendation: boolean;
  selectionGuideShowSummary: boolean;
  selectionGuideMarginTop: number;
  selectionGuideMarginBottom: number;
  promiseDestinationCountry: string;
  promisePostalCode: string;
  promiseLayout: PromiseLayout;
  promiseDateMode: PromiseDateMode;
  promiseZipPicker: PromiseZipPicker;
  promiseShowCutoff: PromiseShowCutoff;
  promiseIcon: PromiseIcon;
  promiseConfidence: PromiseConfidence;
  promiseDateFormat: PromiseDateFormat;
  promiseShowCarrier: PromiseShowCarrier;
  promiseRequireZip: boolean;
  promiseCourier: string;
  promiseServiceLevel: string;
  promiseWarehouse: string;
  promiseSelectionReferenceDate: PromiseSelectionReferenceDate;
  promiseSelectionPick: PromiseSelectionPick;
  promiseFallbackDays: string;
  textReplaceText: string;
};

export type SavedModification = {
  id: string;
  url: string;
  scopeUrl?: string;
  pageTitle?: string;
  selector: string;
  action: ModificationAction;
  html: string;
  demoConfig?: DemoConfig;
  summary: string;
  createdAt: string;
};

export type ContentRequest =
  | { type: 'PING' }
  | {
      type: 'START_PICKER';
      action: ModificationAction;
      html: string;
      demoConfig?: DemoConfig;
    }
  | { type: 'RESTORE_RULES'; ruleIds: string[] }
  | { type: 'INJECT_CHATBOT'; config: ChatbotConfig }
  | { type: 'REMOVE_CHATBOT' };

export type ContentResponse =
  | { ok: true }
  | { ok: false; error: string };

export type ChatbotConfig = {
  agentId: string;
  account: number;
  baseUrl: string;
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
};

export type ChatbotExecuteRequest = {
  type: 'CHATBOT_EXECUTE';
  query: string;
  config: ChatbotConfig;
  threadId?: string;
};

export type ChatbotResponse =
  | { ok: true; threadId: string; messages: ChatMessage[] }
  | { ok: false; error: string };

export type AuthStatusResponse = {
  ok: true;
  authenticated: boolean;
};

export type BackgroundRequest =
  | { type: 'SYNC_RULES' }
  | {
      type: 'RENDER_TRACK_AND_TRACE';
      containerId: string;
      demoConfig: TrackAndTraceConfig;
    }
  | {
      type: 'RENDER_RETURNS_PORTAL';
      containerId: string;
      demoConfig: ReturnsPortalConfig;
    }
  | {
      type: 'RENDER_PROMISE';
      containerId: string;
      demoConfig: PromiseDemoConfig;
    }
  | {
      type: 'RENDER_SELECTION_GUIDE';
      containerId: string;
      demoConfig: SelectionGuideConfig;
    }
  | ChatbotExecuteRequest
  | { type: 'AUTH_LOGIN' }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'AUTH_STATUS' };
