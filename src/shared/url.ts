export function isWebUrl(value?: string): value is string {
  return Boolean(value && /^https?:\/\//.test(value));
}

export function normalizeUrl(value: string): string {
  const url = new URL(value);
  url.hash = '';
  return url.toString();
}

export function normalizeScopeUrl(value: string): string {
  const url = new URL(value);
  url.search = '';
  url.hash = '';
  return url.toString();
}

export function toMatchPattern(value: string): string {
  const url = new URL(value);
  const protocol = url.protocol.replace(':', '');
  const path = url.pathname === '/' ? '/*' : `${url.pathname}*`;
  return `${protocol}://${url.host}${path}`;
}

export function compactUrl(value: string): string {
  const url = new URL(value);
  return `${url.host}${url.pathname}${url.search}`;
}
