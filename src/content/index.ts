import {
  filterRulesForUrl,
  getSavedModifications,
  resolveRuleScopeUrl,
  saveModification
} from '../shared/storage';
import { isWebUrl, normalizeScopeUrl, normalizeUrl } from '../shared/url';
import type {
  ContentRequest,
  ContentResponse,
  ModificationAction,
  SavedModification,
  TrackAndTraceConfig
} from '../shared/types';

type HideState = {
  action: 'hide';
  element: HTMLElement;
  displayValue: string;
  displayPriority: string;
};

type ReplaceState = {
  action: 'replace';
  element: HTMLElement;
  originalHtml: string;
};

type AppliedState = HideState | ReplaceState;

type PickerState = {
  action: ModificationAction;
  html: string;
  demoConfig?: TrackAndTraceConfig;
  hoveredElement: HTMLElement | null;
};

type Controller = {
  init(): Promise<void>;
};

declare global {
  interface Window {
    __PL_DEMO_CONTROLLER__?: Controller;
  }
}

const OVERLAY_ID = 'pl-demo-picker-overlay';
const TOAST_ID = 'pl-demo-picker-toast';
const TOOLTIP_ID = 'pl-demo-picker-tooltip';
const INTERNAL_PREFIX = 'pl-demo-picker-';
const appliedStates = new Map<string, AppliedState>();

if (!window.__PL_DEMO_CONTROLLER__) {
  window.__PL_DEMO_CONTROLLER__ = createController();
  void window.__PL_DEMO_CONTROLLER__.init();
}

function createController(): Controller {
  let pickerState: PickerState | null = null;
  let observer: MutationObserver | null = null;
  let applyTimer = 0;
  let lastKnownScopeUrl = normalizeCurrentScopeUrl();
  let hasInstalledNavigationHooks = false;

  async function init(): Promise<void> {
    chrome.runtime.onMessage.addListener(
      (message: ContentRequest, _sender, sendResponse) => {
        void handleMessage(message)
          .then((response) => sendResponse(response))
          .catch((error: unknown) =>
            sendResponse({
              ok: false,
              error: error instanceof Error ? error.message : String(error)
            })
          );

        return true;
      }
    );

    installNavigationHooks();
    installObserver();
    await applyRulesForCurrentUrl();
  }

  async function handleMessage(
    message: ContentRequest
  ): Promise<ContentResponse> {
    switch (message.type) {
      case 'PING':
        return { ok: true };
      case 'START_PICKER':
        startPicker(message.action, message.html, message.demoConfig);
        return { ok: true };
      case 'RESTORE_RULES':
        restoreRules(message.ruleIds);
        await applyRulesForCurrentUrl();
        return { ok: true };
      default:
        return { ok: false, error: 'Unsupported request' };
    }
  }

  function installObserver(): void {
    if (observer) {
      return;
    }

    observer = new MutationObserver(() => {
      if (applyTimer) {
        window.clearTimeout(applyTimer);
      }

      applyTimer = window.setTimeout(() => {
        void applyRulesForCurrentUrl();
      }, 120);
    });

    const root = document.documentElement ?? document.body;

    if (!root) {
      return;
    }

    observer.observe(root, {
      childList: true,
      subtree: true
    });
  }

  function installNavigationHooks(): void {
    if (hasInstalledNavigationHooks) {
      return;
    }

    hasInstalledNavigationHooks = true;

    const onLocationChange = () => {
      const currentScopeUrl = normalizeCurrentScopeUrl();
      if (currentScopeUrl === lastKnownScopeUrl) {
        return;
      }

      lastKnownScopeUrl = currentScopeUrl;
      restoreRules(Array.from(appliedStates.keys()));
      void applyRulesForCurrentUrl();
    };

    const originalPushState = history.pushState;
    history.pushState = function pushState(...args) {
      const result = originalPushState.apply(this, args);
      window.dispatchEvent(new Event('pl-demo-url-change'));
      return result;
    };

    const originalReplaceState = history.replaceState;
    history.replaceState = function replaceState(...args) {
      const result = originalReplaceState.apply(this, args);
      window.dispatchEvent(new Event('pl-demo-url-change'));
      return result;
    };

    window.addEventListener('popstate', onLocationChange);
    window.addEventListener('hashchange', onLocationChange);
    window.addEventListener('pl-demo-url-change', onLocationChange);
  }

  async function applyRulesForCurrentUrl(): Promise<void> {
    const normalizedScopeUrl = normalizeCurrentScopeUrl();
    if (!normalizedScopeUrl) {
      return;
    }

    const rules = filterRulesForUrl(
      await getSavedModifications(),
      normalizedScopeUrl
    );
    const activeRuleIds = new Set(rules.map((rule) => rule.id));

    for (const ruleId of Array.from(appliedStates.keys())) {
      if (!activeRuleIds.has(ruleId)) {
        restoreRule(ruleId);
      }
    }

    for (const rule of rules) {
      applyRule(rule);
    }
  }

  function applyRule(rule: SavedModification): void {
    const element = document.querySelector(rule.selector);

    if (!(element instanceof HTMLElement)) {
      return;
    }

    const currentState = appliedStates.get(rule.id);

    if (currentState && currentState.element !== element) {
      restoreRule(rule.id);
    }

    if (rule.action === 'hide') {
      const state = appliedStates.get(rule.id);
      if (!state) {
        appliedStates.set(rule.id, {
          action: 'hide',
          element,
          displayValue: element.style.getPropertyValue('display'),
          displayPriority: element.style.getPropertyPriority('display')
        });
      }

      element.style.setProperty('display', 'none', 'important');
      return;
    }

    const state = appliedStates.get(rule.id);
    if (!state) {
      appliedStates.set(rule.id, {
        action: 'replace',
        element,
        originalHtml: element.innerHTML
      });
    }

    if (rule.demoConfig) {
      renderTrackAndTraceRule(element, rule);
      return;
    }

    element.innerHTML = rule.html;
  }

  function restoreRules(ruleIds: string[]): void {
    ruleIds.forEach((ruleId) => restoreRule(ruleId));
  }

  function restoreRule(ruleId: string): void {
    const state = appliedStates.get(ruleId);
    if (!state) {
      return;
    }

    if (!state.element.isConnected) {
      appliedStates.delete(ruleId);
      return;
    }

    if (state.action === 'hide') {
      if (state.displayValue) {
        state.element.style.setProperty(
          'display',
          state.displayValue,
          state.displayPriority
        );
      } else {
        state.element.style.removeProperty('display');
      }
    } else {
      state.element.innerHTML = state.originalHtml;
    }

    appliedStates.delete(ruleId);
  }

  function startPicker(
    action: ModificationAction,
    html: string,
    demoConfig?: TrackAndTraceConfig
  ): void {
    stopPicker();

    pickerState = {
      action,
      html,
      demoConfig,
      hoveredElement: null
    };

    document.addEventListener('mousemove', handlePointerMove, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeydown, true);
    window.addEventListener('scroll', syncOverlayToHoveredElement, true);
    window.addEventListener('resize', syncOverlayToHoveredElement, true);

    showToast(
      action === 'hide'
        ? 'Selection mode: click any element to hide it. Press Escape to cancel.'
        : 'Selection mode: click any element to replace its contents. Press Escape to cancel.'
    );
  }

  function stopPicker(): void {
    pickerState = null;
    document.removeEventListener('mousemove', handlePointerMove, true);
    document.removeEventListener('click', handleClick, true);
    document.removeEventListener('keydown', handleKeydown, true);
    window.removeEventListener('scroll', syncOverlayToHoveredElement, true);
    window.removeEventListener('resize', syncOverlayToHoveredElement, true);
    removeOverlayUi();
  }

  function handlePointerMove(event: MouseEvent): void {
    if (!pickerState) {
      return;
    }

    const nextElement = getSelectableElement(event.target);
    if (pickerState.hoveredElement === nextElement) {
      syncOverlayToHoveredElement();
      return;
    }

    pickerState.hoveredElement = nextElement;
    syncOverlayToHoveredElement();
  }

  async function handleClick(event: MouseEvent): Promise<void> {
    if (!pickerState) {
      return;
    }

    const element = getSelectableElement(event.target);
    if (!element) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const normalizedUrl = normalizeCurrentUrl();
    if (!normalizedUrl) {
      showToast('This page cannot be saved as a demo rule.');
      stopPicker();
      return;
    }

    const selector = createUniqueSelector(element);
    const summary = summarizeElement(element);
    const rule: SavedModification = {
      id: crypto.randomUUID(),
      url: normalizedUrl,
      scopeUrl: normalizeCurrentScopeUrl(),
      pageTitle: document.title.trim() || window.location.hostname,
      selector,
      action: pickerState.action,
      html: pickerState.action === 'replace' ? pickerState.html : '',
      demoConfig:
        pickerState.action === 'replace' ? pickerState.demoConfig : undefined,
      summary,
      createdAt: new Date().toISOString()
    };

    await saveModification(rule);
    applyRule(rule);
    stopPicker();
    showToast(
      rule.action === 'hide'
        ? `Saved hide rule for ${summary}.`
        : `Saved replacement rule for ${summary}.`
    );

    try {
      await chrome.runtime.sendMessage({ type: 'SYNC_RULES' });
    } catch {
      // The rule is already stored locally, so registration sync can fail silently.
    }
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape') {
      return;
    }

    event.preventDefault();
    stopPicker();
    showToast('Selection cancelled.');
  }

  function syncOverlayToHoveredElement(): void {
    if (!pickerState?.hoveredElement) {
      removeOverlayUi();
      return;
    }

    const rect = pickerState.hoveredElement.getBoundingClientRect();
    const overlay = ensureOverlayNode();
    const tooltip = ensureTooltipNode();

    overlay.style.top = `${rect.top - 2}px`;
    overlay.style.left = `${rect.left - 2}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;

    tooltip.textContent = `${pickerState.action === 'hide' ? 'Hide' : 'Replace'} ${summarizeElement(
      pickerState.hoveredElement
    )}`;
    tooltip.style.top = `${Math.max(12, rect.top - 34)}px`;
    tooltip.style.left = `${Math.max(12, rect.left)}px`;
  }

  return { init };
}

function normalizeCurrentUrl(): string {
  return isWebUrl(window.location.href) ? normalizeUrl(window.location.href) : '';
}

function normalizeCurrentScopeUrl(): string {
  return isWebUrl(window.location.href)
    ? normalizeScopeUrl(window.location.href)
    : '';
}

function getSelectableElement(target: EventTarget | null): HTMLElement | null {
  const element =
    target instanceof HTMLElement
      ? target
      : target instanceof Text
        ? target.parentElement
        : null;

  if (!element) {
    return null;
  }

  if (element.id.startsWith(INTERNAL_PREFIX)) {
    return null;
  }

  if (element.closest(`[id^="${INTERNAL_PREFIX}"]`)) {
    return null;
  }

  return element;
}

function summarizeElement(element: HTMLElement): string {
  const parts = [element.tagName.toLowerCase()];
  if (element.id) {
    parts.push(`#${element.id}`);
  }

  const classNames = Array.from(element.classList).slice(0, 2);
  if (classNames.length > 0) {
    parts.push(`.${classNames.join('.')}`);
  }

  return parts.join('');
}

function ensureOverlayNode(): HTMLDivElement {
  let overlay = document.getElementById(OVERLAY_ID) as HTMLDivElement | null;
  if (overlay) {
    return overlay;
  }

  overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  overlay.style.position = 'fixed';
  overlay.style.zIndex = '2147483647';
  overlay.style.pointerEvents = 'none';
  overlay.style.border = '2px solid #ff6a2b';
  overlay.style.boxShadow = '0 0 0 9999px rgba(17, 12, 8, 0.08)';
  overlay.style.borderRadius = '6px';
  overlay.style.background = 'rgba(255, 106, 43, 0.08)';
  document.documentElement.appendChild(overlay);
  return overlay;
}

function ensureTooltipNode(): HTMLDivElement {
  let tooltip = document.getElementById(TOOLTIP_ID) as HTMLDivElement | null;
  if (tooltip) {
    return tooltip;
  }

  tooltip = document.createElement('div');
  tooltip.id = TOOLTIP_ID;
  tooltip.style.position = 'fixed';
  tooltip.style.zIndex = '2147483647';
  tooltip.style.pointerEvents = 'none';
  tooltip.style.padding = '6px 10px';
  tooltip.style.background = '#1f1713';
  tooltip.style.color = '#fff8f0';
  tooltip.style.font = '600 12px/1.4 system-ui, sans-serif';
  tooltip.style.borderRadius = '999px';
  tooltip.style.boxShadow = '0 12px 28px rgba(0, 0, 0, 0.24)';
  document.documentElement.appendChild(tooltip);
  return tooltip;
}

function showToast(message: string): void {
  let toast = document.getElementById(TOAST_ID) as HTMLDivElement | null;
  if (!toast) {
    toast = document.createElement('div');
    toast.id = TOAST_ID;
    toast.style.position = 'fixed';
    toast.style.right = '20px';
    toast.style.bottom = '20px';
    toast.style.zIndex = '2147483647';
    toast.style.maxWidth = '420px';
    toast.style.padding = '12px 14px';
    toast.style.borderRadius = '14px';
    toast.style.background =
      'linear-gradient(135deg, rgba(255,106,43,0.96), rgba(255,140,79,0.96))';
    toast.style.color = '#1b130d';
    toast.style.font = '600 13px/1.5 system-ui, sans-serif';
    toast.style.boxShadow = '0 16px 40px rgba(52, 22, 4, 0.24)';
    document.documentElement.appendChild(toast);
  }

  toast.textContent = message;

  window.clearTimeout(Number(toast.dataset.timeoutId ?? '0'));
  const timeoutId = window.setTimeout(() => {
    if (toast?.isConnected) {
      toast.remove();
    }
  }, 2600);
  toast.dataset.timeoutId = String(timeoutId);
}

function removeOverlayUi(): void {
  document.getElementById(OVERLAY_ID)?.remove();
  document.getElementById(TOOLTIP_ID)?.remove();
}

function createUniqueSelector(element: HTMLElement): string {
  if (element.id) {
    const selector = `#${CSS.escape(element.id)}`;
    if (isUniqueSelector(selector)) {
      return selector;
    }
  }

  const segments: string[] = [];
  let current: HTMLElement | null = element;

  while (current && current !== document.body) {
    const base = buildSelectorSegment(current);
    segments.unshift(base);
    const selector = segments.join(' > ');
    if (isUniqueSelector(selector)) {
      return selector;
    }
    current = current.parentElement;
  }

  return ['body', ...segments].join(' > ');
}

function buildSelectorSegment(element: HTMLElement): string {
  const stableAttribute = (
    [
      'data-testid',
      'data-test',
      'data-qa',
      'data-cy'
    ] as const
  )
    .map((attributeName) => ({
      attributeName,
      value: element.getAttribute(attributeName)
    }))
    .find((entry) => entry.value);

  if (stableAttribute?.value) {
    return `${element.tagName.toLowerCase()}[${stableAttribute.attributeName}="${escapeAttributeValue(
      stableAttribute.value
    )}"]`;
  }

  let segment = element.tagName.toLowerCase();

  if (element.id) {
    return `${segment}#${CSS.escape(element.id)}`;
  }

  const stableClasses = Array.from(element.classList)
    .filter((className) => /^[A-Za-z][A-Za-z0-9_-]{0,40}$/.test(className))
    .slice(0, 2);

  if (stableClasses.length > 0) {
    segment += stableClasses.map((className) => `.${CSS.escape(className)}`).join('');
  }

  if (!element.parentElement) {
    return segment;
  }

  const siblings = Array.from(element.parentElement.children).filter(
    (sibling) => sibling.tagName === element.tagName
  );

  if (siblings.length > 1) {
    const position = siblings.indexOf(element) + 1;
    segment += `:nth-of-type(${position})`;
  }

  return segment;
}

function isUniqueSelector(selector: string): boolean {
  try {
    return document.querySelectorAll(selector).length === 1;
  } catch {
    return false;
  }
}

function escapeAttributeValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function renderTrackAndTraceRule(
  element: HTMLElement,
  rule: SavedModification
): void {
  if (!rule.demoConfig) {
    return;
  }

  const containerId = `parcellab-track-and-trace-${rule.id}`;
  const renderKey = `${rule.demoConfig.userId}:${rule.demoConfig.lang}:${String(
    rule.demoConfig.showArticleList
  )}`;

  let container = element.querySelector<HTMLElement>(
    `#${CSS.escape(containerId)}`
  );

  if (!container) {
    element.innerHTML = '';
    container = document.createElement('div');
    container.id = containerId;
    container.dataset.plDemoTrackRoot = 'true';
    container.dataset.plDemoTrackKey = renderKey;
    container.style.position = 'relative';
    container.style.minHeight = '320px';

    const spinner = document.createElement('img');
    spinner.src = 'https://cdn.parcellab.com/img/loading-spinner-1.gif';
    spinner.alt = 'loading';
    spinner.style.display = 'block';
    spinner.style.margin = '32px auto';
    container.appendChild(spinner);
    element.appendChild(container);
  }

  if (
    container.dataset.plDemoTrackKey === renderKey &&
    (container.dataset.plDemoTrackRequested === 'pending' ||
      container.dataset.plDemoTrackRequested === 'running' ||
      container.dataset.plDemoTrackRendered === 'true')
  ) {
    return;
  }

  container.dataset.plDemoTrackKey = renderKey;
  container.dataset.plDemoTrackRequested = 'pending';
  container.dataset.plDemoTrackRendered = 'false';

  void chrome.runtime
    .sendMessage({
      type: 'RENDER_TRACK_AND_TRACE',
      containerId,
      demoConfig: rule.demoConfig
    })
    .then((response?: ContentResponse) => {
      if (!container) {
        return;
      }

      if (!response?.ok) {
        container.dataset.plDemoTrackRequested = 'false';
        container.dataset.plDemoTrackRendered = 'false';
        showTrackAndTraceError(
          container,
          response?.error ?? 'parcelLab Track & Trace failed to render.'
        );
      }
    })
    .catch((error: unknown) => {
      if (container) {
        container.dataset.plDemoTrackRequested = 'false';
        container.dataset.plDemoTrackRendered = 'false';
        showTrackAndTraceError(
          container,
          error instanceof Error
            ? error.message
            : 'parcelLab Track & Trace failed to render.'
        );
      }
    });
}

function showTrackAndTraceError(
  container: HTMLElement,
  message: string
): void {
  const existingMessage = container.querySelector<HTMLElement>(
    '[data-pl-demo-track-error="true"]'
  );

  if (existingMessage) {
    existingMessage.textContent = message;
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.dataset.plDemoTrackError = 'true';
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
}
