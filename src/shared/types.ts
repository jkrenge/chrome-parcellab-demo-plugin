export type ModificationAction = 'hide' | 'replace';
export type DemoPluginKind = 'track-and-trace' | 'returns-portal' | 'selection-guide';

export type SelectionGuideAppearance = 'neutral' | 'colored';
export type SelectionGuideDensity = 'compact' | 'comfortable';
export type SelectionGuideSurface = 'subtle' | 'plain';
export type SelectionGuideNotFoundMode = 'empty' | 'true-to-size';

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

export type SelectionGuideConfig = {
  kind: 'selection-guide';
  accountId: string;
  productId: string;
  locale: SupportedLanguage;
  appearance: SelectionGuideAppearance;
  density: SelectionGuideDensity;
  surface: SelectionGuideSurface;
  notFoundMode: SelectionGuideNotFoundMode;
};

export type DemoConfig = TrackAndTraceConfig | ReturnsPortalConfig | SelectionGuideConfig;

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
  | { type: 'RESTORE_RULES'; ruleIds: string[] };

export type ContentResponse =
  | { ok: true }
  | { ok: false; error: string };

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
      type: 'RENDER_SELECTION_GUIDE';
      containerId: string;
      demoConfig: SelectionGuideConfig;
    };
