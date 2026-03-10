export type ModificationAction = 'hide' | 'replace';

export type SupportedLanguage =
  | 'en'
  | 'de'
  | 'es'
  | 'fr'
  | 'it'
  | 'ja'
  | 'ko';

export type TrackAndTraceConfig = {
  userId: string;
  lang: SupportedLanguage;
  showArticleList: boolean;
};

export type SavedModification = {
  id: string;
  url: string;
  scopeUrl?: string;
  pageTitle?: string;
  selector: string;
  action: ModificationAction;
  html: string;
  demoConfig?: TrackAndTraceConfig;
  summary: string;
  createdAt: string;
};

export type ContentRequest =
  | { type: 'PING' }
  | {
      type: 'START_PICKER';
      action: ModificationAction;
      html: string;
      demoConfig?: TrackAndTraceConfig;
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
    };
