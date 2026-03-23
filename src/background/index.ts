import { getValidAccessToken, getStoredTokens, isAuthenticated, login, logout } from '../shared/auth';
import { getSavedModifications, resolveRuleScopeUrl } from '../shared/storage';
import { toMatchPattern } from '../shared/url';
import type {
  AuthStatusResponse,
  BackgroundRequest,
  ChatbotConfig,
  ChatbotExecuteRequest,
  ChatbotResponse,
  ChatMessage,
  ReturnsPortalConfig,
  SelectionGuideConfig,
  TrackAndTraceConfig
} from '../shared/types';

const CONTENT_SCRIPT_ID = 'parcellab-demo-content-script';

chrome.runtime.onInstalled.addListener(() => {
  void syncRegisteredContentScript();
});

chrome.runtime.onStartup.addListener(() => {
  void syncRegisteredContentScript();
});

chrome.runtime.onMessage.addListener(
  (message: BackgroundRequest, sender, sendResponse) => {
    if (message?.type === 'SYNC_RULES') {
      void syncRegisteredContentScript()
        .then(() => sendResponse({ ok: true }))
        .catch((error: unknown) =>
          sendResponse({
            ok: false,
            error: error instanceof Error ? error.message : String(error)
          })
        );

      return true;
    }

    if (message?.type === 'RENDER_TRACK_AND_TRACE' && sender.tab?.id) {
      void renderTrackAndTrace(
        sender.tab.id,
        message.containerId,
        message.demoConfig
      )
        .then(() => sendResponse({ ok: true }))
        .catch((error: unknown) =>
          sendResponse({
            ok: false,
            error: error instanceof Error ? error.message : String(error)
          })
        );

      return true;
    }

    if (message?.type === 'RENDER_SELECTION_GUIDE' && sender.tab?.id) {
      void renderSelectionGuide(
        sender.tab.id,
        message.containerId,
        message.demoConfig
      )
        .then(() => sendResponse({ ok: true }))
        .catch((error: unknown) =>
          sendResponse({
            ok: false,
            error: error instanceof Error ? error.message : String(error)
          })
        );

      return true;
    }

    if (message?.type === 'RENDER_RETURNS_PORTAL' && sender.tab?.id) {
      void renderReturnsPortal(
        sender.tab.id,
        message.containerId,
        message.demoConfig
      )
        .then(() => sendResponse({ ok: true }))
        .catch((error: unknown) =>
          sendResponse({
            ok: false,
            error: error instanceof Error ? error.message : String(error)
          })
        );

      return true;
    }

    if (message?.type === 'CHATBOT_EXECUTE') {
      void handleChatbotExecute(message)
        .then((response) => sendResponse(response))
        .catch((error: unknown) =>
          sendResponse({
            ok: false,
            error: error instanceof Error ? error.message : String(error)
          } satisfies ChatbotResponse)
        );

      return true;
    }

    if (message?.type === 'AUTH_LOGIN') {
      void login()
        .then(() => sendResponse({ ok: true }))
        .catch((error: unknown) =>
          sendResponse({
            ok: false,
            error: error instanceof Error ? error.message : String(error)
          })
        );

      return true;
    }

    if (message?.type === 'AUTH_LOGOUT') {
      void logout()
        .then(() => sendResponse({ ok: true }))
        .catch((error: unknown) =>
          sendResponse({
            ok: false,
            error: error instanceof Error ? error.message : String(error)
          })
        );

      return true;
    }

    if (message?.type === 'AUTH_STATUS') {
      void getStoredTokens()
        .then((tokens) =>
          sendResponse({
            ok: true,
            authenticated: isAuthenticated(tokens)
          } satisfies AuthStatusResponse)
        )
        .catch(() =>
          sendResponse({ ok: true, authenticated: false } satisfies AuthStatusResponse)
        );

      return true;
    }

    return undefined;
  }
);

async function syncRegisteredContentScript(): Promise<void> {
  const rules = await getSavedModifications();
  const matches = Array.from(
    new Set(rules.map((rule) => toMatchPattern(resolveRuleScopeUrl(rule))))
  );

  const existing = await chrome.scripting.getRegisteredContentScripts({
    ids: [CONTENT_SCRIPT_ID]
  });

  if (existing.length > 0) {
    await chrome.scripting.unregisterContentScripts({ ids: [CONTENT_SCRIPT_ID] });
  }

  if (matches.length === 0) {
    return;
  }

  await chrome.scripting.registerContentScripts([
    {
      id: CONTENT_SCRIPT_ID,
      js: ['content.js'],
      matches,
      persistAcrossSessions: true,
      runAt: 'document_idle'
    }
  ]);
}

async function renderTrackAndTrace(
  tabId: number,
  containerId: string,
  demoConfig: TrackAndTraceConfig
): Promise<void> {
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    world: 'MAIN',
    args: [containerId, demoConfig] as [string, TrackAndTraceConfig],
    func: (
      targetContainerId: string,
      config: TrackAndTraceConfig
    ) => {
      const SCRIPT_ID = 'pl-demo-track-and-trace-script';
      const STYLES_ID = 'pl-demo-track-and-trace-styles';
      const SCRIPT_SRC = 'https://cdn.parcellab.com/js/v5/main.min.js';
      const STYLES_SRC = 'https://cdn.parcellab.com/css/v5/main.min.css';

      type TrackAndTraceWindow = Window & {
        __plDemoTrackLoaderPromise__?: Promise<void>;
        parcelLabTrackAndTrace?: {
          initialize: (options: {
            plUserId: number;
            lang: string;
            show_searchForm: boolean;
            show_zipCodeInput: boolean;
            show_articleList: boolean;
            use_campaign_banners: boolean;
            containerId: string;
          }) => void;
        };
      };

      const scopedWindow = window as TrackAndTraceWindow;
      const container = document.getElementById(targetContainerId);
      if (!container) {
        return { ok: false, error: 'Track and trace container not found.' };
      }

      const showContainerError = (message: string) => {
        container.dataset.plDemoTrackRequested = 'false';
        container.dataset.plDemoTrackRendered = 'false';

        const wrapper = document.createElement('div');
        wrapper.style.margin = '24px auto';
        wrapper.style.maxWidth = '560px';
        wrapper.style.padding = '16px 18px';
        wrapper.style.border = '1px solid rgba(239, 68, 68, 0.25)';
        wrapper.style.borderRadius = '12px';
        wrapper.style.background = '#fef2f2';
        wrapper.style.color = '#991b1b';
        wrapper.style.font = '500 14px/1.5 system-ui, sans-serif';
        wrapper.textContent = message;
        container.replaceChildren(wrapper);
      };

      const renderKey = `${config.userId}:${config.lang}:${String(
        config.showArticleList
      )}`;
      if (
        container.dataset.plDemoTrackKey === renderKey &&
        container.dataset.plDemoTrackRendered === 'true'
      ) {
        return { ok: true };
      }

      container.dataset.plDemoTrackKey = renderKey;
      container.dataset.plDemoTrackRequested = 'running';
      container.dataset.plDemoTrackRendered = 'false';

      if (!document.getElementById(STYLES_ID)) {
        const linkTag = document.createElement('link');
        linkTag.id = STYLES_ID;
        linkTag.rel = 'stylesheet';
        linkTag.href = STYLES_SRC;
        document.head.appendChild(linkTag);
      }

      const ensureScript = async () => {
        if (typeof scopedWindow.parcelLabTrackAndTrace?.initialize === 'function') {
          return;
        }

        if (scopedWindow.__plDemoTrackLoaderPromise__) {
          return scopedWindow.__plDemoTrackLoaderPromise__;
        }

        scopedWindow.__plDemoTrackLoaderPromise__ = new Promise<void>(
          (resolve, reject) => {
            const existingScript = document.getElementById(
              SCRIPT_ID
            ) as HTMLScriptElement | null;

            if (existingScript) {
              if (existingScript.dataset.plDemoLoaded === 'true') {
                resolve();
                return;
              }

              existingScript.addEventListener('load', () => resolve(), {
                once: true
              });
              existingScript.addEventListener(
                'error',
                () => reject(new Error('Could not load parcelLab script.')),
                { once: true }
              );
              return;
            }

            const scriptTag = document.createElement('script');
            scriptTag.id = SCRIPT_ID;
            scriptTag.async = true;
            scriptTag.src = SCRIPT_SRC;
            scriptTag.onload = () => {
              scriptTag.dataset.plDemoLoaded = 'true';
              resolve();
            };
            scriptTag.onerror = () =>
              reject(new Error('Could not load parcelLab script.'));
            document.head.appendChild(scriptTag);
          }
        );

        return scopedWindow.__plDemoTrackLoaderPromise__.catch((error) => {
          scopedWindow.__plDemoTrackLoaderPromise__ = undefined;
          throw error;
        });
      };

      void ensureScript()
        .then(() => {
          const liveContainer = document.getElementById(targetContainerId);
          if (!liveContainer) {
            return;
          }

          if (typeof scopedWindow.parcelLabTrackAndTrace?.initialize !== 'function') {
            showContainerError(
              'parcelLab Track & Trace did not expose initialize().'
            );
            return;
          }

          scopedWindow.parcelLabTrackAndTrace.initialize({
            plUserId: Number(config.userId),
            lang: config.lang,
            show_searchForm: true,
            show_zipCodeInput: true,
            show_articleList: config.showArticleList,
            use_campaign_banners: true,
            containerId: targetContainerId
          });

          liveContainer.dataset.plDemoTrackRequested = 'true';
          liveContainer.dataset.plDemoTrackRendered = 'true';
        })
        .catch((error: unknown) => {
          showContainerError(
            error instanceof Error
              ? error.message
              : 'parcelLab Track & Trace failed to render.'
          );
        });

      return { ok: true };
    }
  });

  if (!result?.ok) {
    throw new Error(result?.error ?? 'Track and trace render failed.');
  }
}

async function renderReturnsPortal(
  tabId: number,
  containerId: string,
  demoConfig: ReturnsPortalConfig
): Promise<void> {
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    world: 'MAIN',
    args: [containerId, demoConfig] as [string, ReturnsPortalConfig],
    func: (
      targetContainerId: string,
      config: ReturnsPortalConfig
    ) => {
      const SCRIPT_ID = 'pl-demo-returns-portal-loader';
      const SCRIPT_SRC =
        'https://returns-app.parcellab.com/static/plugin/js/loader.mjs';

      type ReturnsPortalWindow = Window & {
        __plDemoReturnsLoaderPromise__?: Promise<void>;
      };

      const scopedWindow = window as ReturnsPortalWindow;
      const container = document.getElementById(targetContainerId);
      if (!container) {
        return { ok: false, error: 'Returns Portal container not found.' };
      }

      const showContainerError = (message: string) => {
        container.dataset.plDemoReturnsRequested = 'false';
        container.dataset.plDemoReturnsRendered = 'false';

        const wrapper = document.createElement('div');
        wrapper.style.margin = '24px auto';
        wrapper.style.maxWidth = '560px';
        wrapper.style.padding = '16px 18px';
        wrapper.style.border = '1px solid rgba(239, 68, 68, 0.25)';
        wrapper.style.borderRadius = '12px';
        wrapper.style.background = '#fef2f2';
        wrapper.style.color = '#991b1b';
        wrapper.style.font = '500 14px/1.5 system-ui, sans-serif';
        wrapper.textContent = message;
        container.replaceChildren(wrapper);
      };

      const renderKey = `${config.accountName}:${config.portalCode}:${config.lang}`;
      if (
        container.dataset.plDemoReturnsKey === renderKey &&
        container.dataset.plDemoReturnsRendered === 'true'
      ) {
        return { ok: true };
      }

      container.dataset.plDemoReturnsKey = renderKey;
      container.dataset.plDemoReturnsRequested = 'running';
      container.dataset.plDemoReturnsRendered = 'false';

      const ensurePortalNode = () => {
        let portal = container.querySelector(
          'pl-returns-portal'
        ) as HTMLElement | null;

        if (!portal) {
          container.replaceChildren();
          portal = document.createElement('pl-returns-portal');
          container.appendChild(portal);
        }

        portal.setAttribute('code', config.portalCode);
        portal.setAttribute('account-name', config.accountName);
        portal.setAttribute('lang', config.lang);
      };

      const ensureScript = async () => {
        if (customElements.get('pl-returns-portal')) {
          return;
        }

        if (scopedWindow.__plDemoReturnsLoaderPromise__) {
          return scopedWindow.__plDemoReturnsLoaderPromise__;
        }

        scopedWindow.__plDemoReturnsLoaderPromise__ = new Promise<void>(
          (resolve, reject) => {
            const existingScript = document.getElementById(
              SCRIPT_ID
            ) as HTMLScriptElement | null;

            if (existingScript) {
              existingScript.addEventListener('load', () => resolve(), {
                once: true
              });
              existingScript.addEventListener(
                'error',
                () =>
                  reject(
                    new Error(
                      'Could not load the Returns Portal loader. Check script-src and frame-src CSP rules.'
                    )
                  ),
                { once: true }
              );
              return;
            }

            const scriptTag = document.createElement('script');
            scriptTag.id = SCRIPT_ID;
            scriptTag.type = 'module';
            scriptTag.src = SCRIPT_SRC;
            scriptTag.onload = () => resolve();
            scriptTag.onerror = () =>
              reject(
                new Error(
                  'Could not load the Returns Portal loader. Check script-src and frame-src CSP rules.'
                )
              );
            document.body.appendChild(scriptTag);
          }
        );

        return scopedWindow.__plDemoReturnsLoaderPromise__.catch((error) => {
          scopedWindow.__plDemoReturnsLoaderPromise__ = undefined;
          throw error;
        });
      };

      ensurePortalNode();

      void ensureScript()
        .then(async () => {
          const liveContainer = document.getElementById(targetContainerId);
          if (!liveContainer) {
            return;
          }

          await customElements.whenDefined('pl-returns-portal');
          ensurePortalNode();
          liveContainer.dataset.plDemoReturnsRequested = 'true';
          liveContainer.dataset.plDemoReturnsRendered = 'true';
        })
        .catch((error: unknown) => {
          showContainerError(
            error instanceof Error
              ? error.message
              : 'parcelLab Returns Portal failed to render.'
          );
        });

      return { ok: true };
    }
  });

  if (!result?.ok) {
    throw new Error(result?.error ?? 'Returns Portal render failed.');
  }
}

async function renderSelectionGuide(
  tabId: number,
  containerId: string,
  demoConfig: SelectionGuideConfig
): Promise<void> {
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    world: 'MAIN',
    args: [containerId, demoConfig] as [string, SelectionGuideConfig],
    func: (
      targetContainerId: string,
      config: SelectionGuideConfig
    ) => {
      const SCRIPT_ID = 'pl-demo-selection-guide-script';
      const SCRIPT_SRC =
        'https://parcellab.github.io/selection-guide-ui/dist/size-recommender.iife.js';

      type SelectionGuideWindow = Window & {
        __plDemoSelectionGuideLoaderPromise__?: Promise<void>;
        SizeRecommender?: {
          init: (options: {
            target: string | HTMLElement;
            accountId: number | string;
            productId?: string;
            locale?: string;
            appearance?: string;
            density?: string;
            surface?: string;
            notFoundMode?: string;
          }) => { update: (options: Record<string, unknown>) => void; destroy: () => void };
        };
      };

      const scopedWindow = window as SelectionGuideWindow;
      const container = document.getElementById(targetContainerId);
      if (!container) {
        return { ok: false, error: 'Selection Guide container not found.' };
      }

      const showContainerError = (message: string) => {
        container.dataset.plDemoSgRequested = 'false';
        container.dataset.plDemoSgRendered = 'false';

        const wrapper = document.createElement('div');
        wrapper.style.margin = '24px auto';
        wrapper.style.maxWidth = '560px';
        wrapper.style.padding = '16px 18px';
        wrapper.style.border = '1px solid rgba(239, 68, 68, 0.25)';
        wrapper.style.borderRadius = '12px';
        wrapper.style.background = '#fef2f2';
        wrapper.style.color = '#991b1b';
        wrapper.style.font = '500 14px/1.5 system-ui, sans-serif';
        wrapper.textContent = message;
        container.replaceChildren(wrapper);
      };

      const renderKey = `${config.accountId}:${config.productId}:${config.locale}:${config.appearance}:${config.density}:${config.surface}:${config.notFoundMode}:${config.marginTop ?? 0}:${config.marginBottom ?? 0}`;
      if (
        container.dataset.plDemoSgKey === renderKey &&
        container.dataset.plDemoSgRendered === 'true'
      ) {
        return { ok: true };
      }

      container.dataset.plDemoSgKey = renderKey;
      container.dataset.plDemoSgRequested = 'running';
      container.dataset.plDemoSgRendered = 'false';

      const ensureScript = async () => {
        if (typeof scopedWindow.SizeRecommender?.init === 'function') {
          return;
        }

        if (scopedWindow.__plDemoSelectionGuideLoaderPromise__) {
          return scopedWindow.__plDemoSelectionGuideLoaderPromise__;
        }

        scopedWindow.__plDemoSelectionGuideLoaderPromise__ = new Promise<void>(
          (resolve, reject) => {
            const existingScript = document.getElementById(
              SCRIPT_ID
            ) as HTMLScriptElement | null;

            if (existingScript) {
              if (existingScript.dataset.plDemoLoaded === 'true') {
                resolve();
                return;
              }

              existingScript.addEventListener('load', () => resolve(), {
                once: true
              });
              existingScript.addEventListener(
                'error',
                () => reject(new Error('Could not load Selection Guide script.')),
                { once: true }
              );
              return;
            }

            const scriptTag = document.createElement('script');
            scriptTag.id = SCRIPT_ID;
            scriptTag.async = true;
            scriptTag.src = SCRIPT_SRC;
            scriptTag.onload = () => {
              scriptTag.dataset.plDemoLoaded = 'true';
              resolve();
            };
            scriptTag.onerror = () =>
              reject(new Error('Could not load Selection Guide script.'));
            document.head.appendChild(scriptTag);
          }
        );

        return scopedWindow.__plDemoSelectionGuideLoaderPromise__.catch((error) => {
          scopedWindow.__plDemoSelectionGuideLoaderPromise__ = undefined;
          throw error;
        });
      };

      void ensureScript()
        .then(() => {
          const liveContainer = document.getElementById(targetContainerId);
          if (!liveContainer) {
            return;
          }

          if (typeof scopedWindow.SizeRecommender?.init !== 'function') {
            showContainerError(
              'Selection Guide did not expose SizeRecommender.init().'
            );
            return;
          }

          liveContainer.replaceChildren();

          scopedWindow.SizeRecommender.init({
            target: liveContainer,
            accountId: config.accountId,
            productId: config.productId || undefined,
            locale: config.locale,
            appearance: config.appearance,
            density: config.density,
            surface: config.surface,
            notFoundMode: config.notFoundMode
          });

          liveContainer.dataset.plDemoSgRequested = 'true';
          liveContainer.dataset.plDemoSgRendered = 'true';
        })
        .catch((error: unknown) => {
          showContainerError(
            error instanceof Error
              ? error.message
              : 'Selection Guide failed to render.'
          );
        });

      return { ok: true };
    }
  });

  if (!result?.ok) {
    throw new Error(result?.error ?? 'Selection Guide render failed.');
  }
}
async function requireAccessToken(): Promise<string> {
  const token = await getValidAccessToken();
  if (!token) {
    throw new Error('Not authenticated. Please log in first.');
  }
  return token;
}

async function handleChatbotExecute(
  request: ChatbotExecuteRequest
): Promise<ChatbotResponse> {
  const { query, config, threadId } = request;

  if (!config.agentId) {
    return { ok: false, error: 'Agent ID is required.' };
  }

  try {
    const token = await requireAccessToken();
    let data: V3ThreadResponse;

    if (threadId) {
      data = await sendFollowUp(config, token, threadId, query);
    } else {
      data = await createThread(config, token, query);
    }

    const activeThreadId = String(data.id);
    const messages = extractV3Messages(data);
    return { ok: true, threadId: activeThreadId, messages };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Chatbot request failed.'
    };
  }
}

type V3Message = {
  id?: string;
  type: string;
  query?: string;
  text?: string;
  response?: string;
  data?: { answer?: string };
};

type V3ThreadResponse = {
  id: number;
  executionStatus?: string;
  messages?: V3Message[];
};

async function createThread(
  config: ChatbotConfig,
  token: string,
  query: string
): Promise<V3ThreadResponse> {
  const url = `${config.baseUrl}/v3/agents/simple-agent-threads/`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      account: config.account,
      agent: config.agentId,
      query,
      context: {}
    })
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Create thread failed (${response.status}): ${text || response.statusText}`);
  }

  return (await response.json()) as V3ThreadResponse;
}

async function sendFollowUp(
  config: ChatbotConfig,
  token: string,
  threadId: string,
  query: string
): Promise<V3ThreadResponse> {
  const url = `${config.baseUrl}/v3/agents/simple-agent-threads/${encodeURIComponent(threadId)}/`;
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query,
      context: {}
    })
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Follow-up message failed (${response.status}): ${text || response.statusText}`);
  }

  return (await response.json()) as V3ThreadResponse;
}

function extractV3Messages(data: V3ThreadResponse): ChatMessage[] {
  if (!Array.isArray(data.messages)) {
    return [];
  }

  const result: ChatMessage[] = [];

  for (const msg of data.messages) {
    if (msg.type === 'input_message' && typeof msg.query === 'string') {
      result.push({
        id: msg.id ?? crypto.randomUUID(),
        role: 'user',
        content: msg.query,
        timestamp: new Date().toISOString()
      });
    } else if (msg.type === 'response') {
      const content = msg.response ?? msg.data?.answer ?? '';
      if (content) {
        result.push({
          id: msg.id ?? crypto.randomUUID(),
          role: 'assistant',
          content,
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  return result;
}
