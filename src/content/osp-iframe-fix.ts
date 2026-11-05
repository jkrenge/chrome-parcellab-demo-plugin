// The parent activates this only for an OSP frame mounted by the demo plugin.
// Standalone OSP pages and other embeds retain their configured header and top banner.
if (window.self !== window.top) {
  window.addEventListener('message', (event) => {
    if (event.source !== window.parent || event.data?.type !== 'PL_DEMO_OSP_HIDE_HEADER') return;
    if (document.getElementById('pl-demo-osp-header-style')) return;

    const style = document.createElement('style');
    style.id = 'pl-demo-osp-header-style';
    // Hide the top band as well so its banner leaves no empty spacing.
    style.textContent = '[data-component="track-page-chrome"], [data-component="track-page-top-modules"] { display: none !important; }';
    (document.head || document.documentElement).appendChild(style);
  });

  // No customer data is sent; the parent origin varies with the prospect site.
  window.parent.postMessage({ type: 'PL_DEMO_OSP_FRAME_READY' }, '*');
}
