import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import vm from 'node:vm';
import { transform } from 'esbuild';

const demoSource = await readFile(new URL('../src/shared/demo.ts', import.meta.url), 'utf8');
const { code } = await transform(demoSource, { loader: 'ts', format: 'esm' });
const demo = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);

test('legacy drafts and saved tracking demos remain OSPv5', () => {
  assert.equal(demo.normalizeDemoDraftConfig({ accountId: '123' }).ospVersion, 'ospv5');
  for (const value of [{}, { kind: 'track-and-trace' }]) {
    const config = demo.normalizeDemoConfig({ ...value, userId: '123', lang: 'en', showArticleList: true });
    assert.equal(config.ospVersion, 'ospv5');
  }
});

test('OSPv7 selection and page key survive save and edit round trips', () => {
  const draft = demo.normalizeDemoDraftConfig({ ospVersion: 'ospv7', ospKey: ' branded ' });
  const config = demo.normalizeDemoConfig(demo.buildDemoConfigFromDraft(draft));
  const restored = demo.mergeDemoConfigIntoDraft(demo.DEFAULT_DEMO_DRAFT_CONFIG, config);
  assert.equal(restored.ospVersion, 'ospv7');
  assert.equal(restored.ospKey, 'branded');
  assert.match(demo.formatDemoConfigSummary(config), /^OSPv7/);
});

const background = await readFile(new URL('../src/background/index.ts', import.meta.url), 'utf8');
const renderer = background.slice(background.indexOf('async function renderTrackAndTrace('), background.indexOf('async function renderReturnsPortal('));
const compiled = await transform(renderer, { loader: 'ts' });

function harness({ fail = false, registered = false } = {}) {
  const scripts = [];
  const container = { dataset: {}, isConnected: true, replaceChildren(...children) { this.children = children; } };
  const context = {
    window: { setTimeout, clearTimeout },
    customElements: { get: () => registered ? class {} : undefined },
    document: {
      getElementById: () => container,
      createElement: (tag) => ({ tag, style: {}, attributes: {}, setAttribute(key, value) { this.attributes[key] = value; }, remove() {} }),
      head: { appendChild(script) { scripts.push(script); queueMicrotask(() => { if (fail) script.onerror(); else { registered = true; script.onload(); } }); } }
    },
    chrome: { scripting: { executeScript: async ({ func, args }) => [{ result: func(...args) }] } }
  };
  vm.createContext(context);
  vm.runInContext(compiled.code, context);
  return { context, container, scripts, retry() { fail = false; } };
}
const config = { kind: 'track-and-trace', ospVersion: 'ospv7', userId: '123', lang: 'de', ospKey: 'brand' };
const flush = () => new Promise((resolve) => setImmediate(resolve));

test('OSPv7 loads documented script and mounts configured custom element once', async () => {
  const h = harness();
  await h.context.renderTrackAndTrace(1, 'container', config);
  await flush();
  assert.equal(h.scripts[0].src, 'https://product-api.parcellab.com/static/track/embed/v1/osp-embed.js');
  assert.equal(h.container.children[0].tag, 'pl-track-and-trace');
  assert.deepEqual(h.container.children[0].attributes, { account: '123', lang: 'de', osp_key: 'brand' });
  await h.context.renderTrackAndTrace(1, 'container', config);
  assert.equal(h.scripts.length, 1);
});

test('failed loader shows error and can retry', async () => {
  const h = harness({ fail: true });
  await h.context.renderTrackAndTrace(1, 'container', config);
  await flush();
  assert.equal(h.container.dataset.plDemoTrackRendered, 'false');
  assert.match(h.container.children[0].textContent, /Could not load/);
  h.retry();
  await h.context.renderTrackAndTrace(1, 'container', config);
  await flush();
  assert.equal(h.container.dataset.plDemoTrackRendered, 'true');
});

test('already registered embed needs no second loader and default page omits osp_key', async () => {
  const h = harness({ registered: true });
  await h.context.renderTrackAndTrace(1, 'container', { ...config, ospKey: '' });
  await flush();
  assert.equal(h.scripts.length, 0);
  assert.equal(h.container.children[0].attributes.osp_key, undefined);
});

test('OSPv7 bypasses the extension-origin frame wrapper', async () => {
  const content = await readFile(new URL('../src/content/index.ts', import.meta.url), 'utf8');
  const start = content.indexOf('function renderTrackAndTraceRule(');
  const end = content.indexOf('function renderOspV7Rule(', start);
  const { code } = await transform(content.slice(start, end), { loader: 'ts' });
  let directCalls = 0;
  const context = {
    normalizeDemoConfig: demo.normalizeDemoConfig,
    renderOspV7Rule: () => { directCalls += 1; },
    buildTrackAndTraceFrameUrl: () => { throw new Error('OSPv7 must not use an extension frame'); }
  };
  vm.createContext(context);
  vm.runInContext(code, context);
  context.renderTrackAndTraceRule({}, { demoConfig: config });
  assert.equal(directCalls, 1);
});

const cspSource = background.slice(background.indexOf('async function syncDemoCspRules('), background.indexOf('async function renderTrackAndTrace('));
const cspCompiled = await transform(cspSource, { loader: 'ts' });

test('CSP bypass covers only saved OSPv7/returns pages and removes stale rules', async () => {
  let update;
  const context = {
    DEMO_PAGE_CSP_RULE_ID_START: 20000,
    RETURNS_PORTAL_FRAME_CSP_RULE_ID_START: 21000,
    RETURNS_PORTAL_CSP_RULE_LIMIT: 1000,
    RETURNS_PORTAL_FRAME_DOMAIN: 'returns-app.parcellab.com',
    URL,
    resolveRuleScopeUrl: (rule) => rule.scopeUrl,
    chrome: { declarativeNetRequest: {
      getDynamicRules: async () => [{ id: 20000 }, { id: 21000 }, { id: 99 }],
      updateDynamicRules: async (value) => { update = value; },
      ResourceType: { MAIN_FRAME: 'main_frame', SUB_FRAME: 'sub_frame' },
      RuleActionType: { MODIFY_HEADERS: 'modifyHeaders' },
      HeaderOperation: { REMOVE: 'remove' }
    } }
  };
  vm.createContext(context);
  vm.runInContext(cspCompiled.code, context);
  await context.syncDemoCspRules([
    { scopeUrl: 'https://shop.lululemon.com/demo', demoConfig: config },
    { scopeUrl: 'https://shop.lululemon.com/demo', demoConfig: config },
    { scopeUrl: 'https://other.example/legacy', demoConfig: { ...config, ospVersion: 'ospv5' } },
    { scopeUrl: 'https://returns.example/demo', demoConfig: { kind: 'returns-portal' } }
  ]);
  assert.deepEqual(Array.from(update.removeRuleIds), [20000, 21000]);
  const pages = update.addRules.filter((rule) => rule.condition.resourceTypes[0] === 'main_frame');
  assert.equal(pages.length, 2);
  const ospRule = pages.find((rule) => new RegExp(rule.condition.regexFilter).test('https://shop.lululemon.com/demo'));
  const matcher = new RegExp(ospRule.condition.regexFilter);
  assert.ok(matcher.test('https://shop.lululemon.com/demo?order=123'));
  assert.equal(matcher.test('https://shop.lululemon.com/other'), false);
  assert.equal(matcher.test('https://shop.lululemon.com/demo/other'), false);
  assert.equal(matcher.test('https://shopXlululemon.com/demo'), false);
  const frames = update.addRules.filter((rule) => rule.condition.resourceTypes[0] === 'sub_frame');
  assert.equal(frames.length, 1);
  assert.deepEqual(Array.from(frames[0].condition.initiatorDomains), ['returns.example']);
  await context.syncDemoCspRules([]);
  assert.equal(update.addRules.length, 0);
  assert.deepEqual(Array.from(update.removeRuleIds), [20000, 21000]);
});

test('OSPv7 height messages resize only the trusted source and preserve the fallback', async () => {
  const content = await readFile(new URL('../src/content/index.ts', import.meta.url), 'utf8');
  const start = content.indexOf('  function installTrackFrameMessageListener()');
  const end = content.indexOf('  function installNavigationHooks()', start);
  const constants = content.slice(content.indexOf('const TRACK_FRAME_RESIZE_MESSAGE_TYPE'), content.indexOf('const appliedStates'));
  const { code } = await transform(constants + '\nlet hasInstalledTrackFrameMessageListener = false;\n' + content.slice(start, end), { loader: 'ts' });
  let listener;
  const frame = { contentWindow: {}, style: {} };
  const other = { contentWindow: {}, style: {} };
  const legacy = { contentWindow: {}, style: {} };
  const context = {
    window: { addEventListener: (_, callback) => { listener = callback; } },
    document: {
      querySelectorAll: () => [frame, other].map(value => ({ shadowRoot: { querySelector: () => value } })),
      querySelector: () => legacy
    },
    escapeAttributeValue: value => value
  };
  vm.createContext(context);
  vm.runInContext(code + '\ninstallTrackFrameMessageListener();', context);
  const send = (height, overrides = {}) => listener({
    origin: 'https://product-api.parcellab.com', source: frame.contentWindow,
    data: { type: 'parcellab:osp:height', height }, ...overrides
  });
  for (const height of [NaN, Infinity, -Infinity, '2520', null]) send(height);
  send(2520, { origin: 'https://example.com' });
  send(2520, { source: {} });
  assert.deepEqual(frame.style, {});
  send(2520.2);
  assert.equal(frame.style.height, '2521px');
  assert.equal(frame.style.minHeight, '320px');
  send(600);
  assert.equal(frame.style.height, '600px');
  send(1);
  assert.equal(frame.style.height, '320px');
  send(20000);
  assert.equal(frame.style.height, '10000px');
  assert.deepEqual(other.style, {});
  listener({ data: null });
  listener({ source: legacy.contentWindow, data: { type: 'PL_DEMO_TRACK_FRAME_RESIZE', frameId: 'legacy', height: 1800 } });
  assert.equal(legacy.style.height, '1800px');
});

test('header helper leaves standalone pages alone and requires parent activation', async () => {
  const source = await readFile(new URL('../src/content/osp-iframe-fix.ts', import.meta.url), 'utf8');
  const { code } = await transform(source, { loader: 'ts' });
  for (const standalone of [true, false]) {
    let listener;
    const messages = [];
    const styles = [];
    const parent = { postMessage: (...args) => messages.push(args) };
    const self = {};
    const context = {
      window: { self, top: standalone ? self : {}, parent, addEventListener: (_, cb) => { listener = cb; } },
      document: {
        getElementById: id => styles.find(style => style.id === id),
        createElement: () => ({}),
        head: { appendChild: style => styles.push(style) }
      }
    };
    vm.runInNewContext(code, context);
    if (standalone) {
      assert.equal(listener, undefined);
      assert.equal(messages.length, 0);
      continue;
    }
    assert.equal(messages[0][0].type, 'PL_DEMO_OSP_FRAME_READY');
    assert.equal(styles.length, 0);
    listener({ source: {}, data: { type: 'PL_DEMO_OSP_HIDE_HEADER' } });
    listener({ source: parent, data: null });
    assert.equal(styles.length, 0);
    listener({ source: parent, data: { type: 'PL_DEMO_OSP_HIDE_HEADER' } });
    listener({ source: parent, data: { type: 'PL_DEMO_OSP_HIDE_HEADER' } });
    assert.equal(styles.length, 1);
    assert.equal(styles[0].textContent, '[data-component="track-page-chrome"], [data-component="track-page-top-modules"] { display: none !important; }');
  }
});

test('host activates header hiding only for its matching OSP frame', async () => {
  const content = await readFile(new URL('../src/content/index.ts', import.meta.url), 'utf8');
  const start = content.indexOf('  function installTrackFrameMessageListener()');
  const end = content.indexOf('  function installNavigationHooks()', start);
  const { code } = await transform('let hasInstalledTrackFrameMessageListener = false;\n' + content.slice(start, end), { loader: 'ts' });
  let listener;
  const replies = [];
  const frame = { contentWindow: { postMessage: (...args) => replies.push(args) } };
  const context = {
    window: { addEventListener: (_, cb) => { listener = cb; } },
    document: { querySelectorAll: selector => {
      assert.equal(selector, '[data-pl-demo-track-root="true"] pl-track-and-trace');
      return [{ shadowRoot: null }, { shadowRoot: { querySelector: () => frame } }];
    } }
  };
  vm.runInNewContext(code + '\ninstallTrackFrameMessageListener();', context);
  const event = { origin: 'https://product-api.parcellab.com', source: frame.contentWindow, data: { type: 'PL_DEMO_OSP_FRAME_READY' } };
  listener({ ...event, origin: 'https://example.com' });
  listener({ ...event, source: {} });
  assert.equal(replies.length, 0);
  listener(event);
  assert.equal(replies.length, 1);
  assert.equal(replies[0][0].type, 'PL_DEMO_OSP_HIDE_HEADER');
  assert.equal(replies[0][1], event.origin);
});
