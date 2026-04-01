/**
 * Injected into returns-app.parcellab.com frames to fix the iframe height
 * sizing issue.
 *
 * Root cause: the iframe app sets `h-screen` (height: 100vh) on <body>.
 * In an iframe, 100vh equals the iframe element's height attribute — which is
 * itself set from the content height via postMessage. This circular dependency
 * causes scrollbar flashes and jitter whenever the content grows beyond the
 * current iframe height.
 *
 * Only runs inside iframes to avoid affecting the standalone portal.
 */
if (window.self !== window.top) {
  const style = document.createElement('style');
  style.textContent = [
    /* Override h-screen so the body grows naturally with its content */
    'body { height: auto !important; min-height: 0 !important; }',
    /* The empty #header-container contributes 32px (mb-8) of unaccounted margin */
    '#header-container { display: none !important; }'
  ].join('\n');
  (document.head || document.documentElement).appendChild(style);
}
