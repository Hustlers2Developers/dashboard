// accessToken lives only in JS memory — never persisted to localStorage or cookies
// gd_token cookie is a server-readable mirror (non-httpOnly) for userId extraction only

const COOKIE_NAME = 'gd_token';

let _accessToken: string | null = null;

function getJwtExp(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

function getJwtClaim<T>(token: string, claim: string): T | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return claim in payload ? (payload[claim] as T) : null;
  } catch {
    return null;
  }
}

function syncCookie(token: string) {
  const exp = getJwtExp(token);
  const maxAge = exp ? exp - Math.floor(Date.now() / 1000) : 900; // fallback 15 min
  document.cookie = `${COOKIE_NAME}=${token}; path=/; SameSite=Lax; max-age=${maxAge}`;
}

function clearCookie() {
  document.cookie = `${COOKIE_NAME}=; path=/; SameSite=Lax; max-age=0`;
}

export function getAccessToken(): string | null {
  return _accessToken;
}

// Reads a non-expired gd_token cookie that was written into the page's
// cookie jar before load — e.g. by the mobile app's webview, which shares an
// already-logged-in session this way instead of a URL param. Only ever used
// to *bootstrap* the in-memory token on startup; syncCookie() remains the
// sole writer afterward.
export function readCookieToken(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
  const token = match ? decodeURIComponent(match[1]) : null;
  if (!token) return null;
  const exp = getJwtExp(token);
  if (!exp || Date.now() / 1000 >= exp - 10) return null;
  return token;
}

export function setAccessToken(token: string) {
  _accessToken = token;
  syncCookie(token);
}

// Alias used in graphql-client and auth-store for compatibility
export const getToken = getAccessToken;
export const setToken = setAccessToken;

export function clearToken() {
  _accessToken = null;
  clearCookie();
}

export function getUserId(): string | null {
  return _accessToken ? getJwtClaim<string>(_accessToken, 'sub') : null;
}

export function getEmail(): string | null {
  return _accessToken ? getJwtClaim<string>(_accessToken, 'email') : null;
}

export function isAccessTokenExpired(): boolean {
  if (!_accessToken) return true;
  const exp = getJwtExp(_accessToken);
  if (!exp) return true;
  return Date.now() / 1000 >= exp - 10; // 10s buffer
}
