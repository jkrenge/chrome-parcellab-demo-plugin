const OAUTH_ISSUER_URL = 'https://auth.parcellab.com/realms/parcellab';
const OAUTH_CLIENT_ID = 'chrome-demo-layer';
const OAUTH_SCOPES = 'openid profile email roles';

const AUTH_STORAGE_KEY = 'oauthTokens';

type OAuthTokens = {
  accessToken: string;
  refreshToken: string;
  idToken: string;
  expiresAt: number;
};

type StoredOAuth = {
  [AUTH_STORAGE_KEY]?: OAuthTokens;
};

// PKCE helpers

function generateRandomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

function base64UrlEncode(bytes: Uint8Array): string {
  const binary = Array.from(bytes)
    .map((b) => String.fromCharCode(b))
    .join('');
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sha256(input: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  return crypto.subtle.digest('SHA-256', encoder.encode(input));
}

function generateCodeVerifier(): string {
  return base64UrlEncode(generateRandomBytes(64));
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const hash = await sha256(verifier);
  return base64UrlEncode(new Uint8Array(hash));
}

// OIDC discovery

type OIDCConfig = {
  authorization_endpoint: string;
  token_endpoint: string;
  end_session_endpoint?: string;
};

let cachedOIDCConfig: OIDCConfig | null = null;

async function getOIDCConfig(): Promise<OIDCConfig> {
  if (cachedOIDCConfig) return cachedOIDCConfig;

  const response = await fetch(
    `${OAUTH_ISSUER_URL}/.well-known/openid-configuration`
  );

  if (!response.ok) {
    throw new Error(`OIDC discovery failed (${response.status})`);
  }

  cachedOIDCConfig = (await response.json()) as OIDCConfig;
  return cachedOIDCConfig;
}

// Token storage

export async function getStoredTokens(): Promise<OAuthTokens | null> {
  const result = (await chrome.storage.local.get(
    AUTH_STORAGE_KEY
  )) as StoredOAuth;
  return result[AUTH_STORAGE_KEY] ?? null;
}

async function storeTokens(tokens: OAuthTokens): Promise<void> {
  await chrome.storage.local.set({ [AUTH_STORAGE_KEY]: tokens });
}

async function clearTokens(): Promise<void> {
  await chrome.storage.local.remove(AUTH_STORAGE_KEY);
}

// Token refresh

const REFRESH_BUFFER_MS = 60_000;

async function refreshAccessToken(
  refreshToken: string
): Promise<OAuthTokens> {
  const oidc = await getOIDCConfig();

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: OAUTH_CLIENT_ID,
    refresh_token: refreshToken
  });

  const response = await fetch(oidc.token_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });

  if (!response.ok) {
    await clearTokens();
    throw new Error('Session expired. Please log in again.');
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    id_token?: string;
    expires_in: number;
  };

  const tokens: OAuthTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    idToken: data.id_token ?? '',
    expiresAt: Date.now() + data.expires_in * 1000
  };

  await storeTokens(tokens);
  return tokens;
}

// Public API

export async function getValidAccessToken(): Promise<string | null> {
  const tokens = await getStoredTokens();
  if (!tokens) return null;

  if (Date.now() < tokens.expiresAt - REFRESH_BUFFER_MS) {
    return tokens.accessToken;
  }

  if (!tokens.refreshToken) {
    await clearTokens();
    return null;
  }

  try {
    const refreshed = await refreshAccessToken(tokens.refreshToken);
    return refreshed.accessToken;
  } catch {
    return null;
  }
}

export async function login(): Promise<OAuthTokens> {
  const oidc = await getOIDCConfig();
  const redirectUrl = chrome.identity.getRedirectURL('oauth/callback');
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = base64UrlEncode(generateRandomBytes(16));

  const authParams = new URLSearchParams({
    client_id: OAUTH_CLIENT_ID,
    redirect_uri: redirectUrl,
    response_type: 'code',
    scope: OAUTH_SCOPES,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256'
  });

  const authUrl = `${oidc.authorization_endpoint}?${authParams.toString()}`;

  const callbackUrl = await new Promise<string>((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      { url: authUrl, interactive: true },
      (responseUrl) => {
        if (chrome.runtime.lastError || !responseUrl) {
          reject(
            new Error(
              chrome.runtime.lastError?.message ?? 'Authentication cancelled.'
            )
          );
          return;
        }
        resolve(responseUrl);
      }
    );
  });

  const callbackParams = new URL(callbackUrl).searchParams;
  const code = callbackParams.get('code');
  const returnedState = callbackParams.get('state');

  if (!code) {
    const error = callbackParams.get('error_description') ?? callbackParams.get('error') ?? 'No authorization code received.';
    throw new Error(error);
  }

  if (returnedState !== state) {
    throw new Error('OAuth state mismatch. Please try again.');
  }

  const tokenBody = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: OAUTH_CLIENT_ID,
    redirect_uri: redirectUrl,
    code,
    code_verifier: codeVerifier
  });

  const tokenResponse = await fetch(oidc.token_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: tokenBody.toString()
  });

  if (!tokenResponse.ok) {
    const text = await tokenResponse.text().catch(() => '');
    throw new Error(`Token exchange failed (${tokenResponse.status}): ${text || tokenResponse.statusText}`);
  }

  const tokenData = (await tokenResponse.json()) as {
    access_token: string;
    refresh_token?: string;
    id_token?: string;
    expires_in: number;
  };

  const tokens: OAuthTokens = {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token ?? '',
    idToken: tokenData.id_token ?? '',
    expiresAt: Date.now() + tokenData.expires_in * 1000
  };

  await storeTokens(tokens);
  return tokens;
}

export async function logout(): Promise<void> {
  await clearTokens();
}

export function isAuthenticated(tokens: OAuthTokens | null): boolean {
  return tokens !== null && tokens.expiresAt > Date.now();
}
