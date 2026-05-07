import { ApolloClient, InMemoryCache, createHttpLink, ApolloLink, CombinedGraphQLErrors } from '@apollo/client/core';
import { setContext } from '@apollo/client/link/context';
import { ErrorLink } from '@apollo/client/link/error';
import { from, switchMap } from 'rxjs';
import { useAuthStore } from '@/stores/auth-store';

const GRAPHQL_URL = import.meta.env.VITE_GRAPHQL_URL || 'https://api.godevelopers.online/graphql';

const REFRESH_BEFORE_EXPIRY_MS = 60 * 1000;
const FALLBACK_REFRESH_DELAY_MS = 10 * 60 * 1000;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

// Prevent concurrent refresh calls — queue pending resolvers
let isRefreshing = false;
let pendingResolvers: Array<{ resolve: (token: string) => void; reject: (error: unknown) => void }> = [];

const httpLink = createHttpLink({ uri: GRAPHQL_URL });

type RefreshResponse = {
  data?: { refreshTokens?: { accessToken?: string; refreshToken?: string } };
  errors?: Array<{ message?: string; extensions?: { code?: string } }>;
};

function clearAuthAndRedirect() {
  useAuthStore.getState().logout();
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

function getTokenExpiresInMs(token: string): number {
  try {
    const payload = JSON.parse(atob(token.split('.')[1] ?? '')) as { exp?: number };
    return payload.exp ? payload.exp * 1000 - Date.now() : 0;
  } catch {
    return 0;
  }
}

async function requestTokenRefresh(accessToken: string | null, refreshToken: string): Promise<RefreshResponse> {
  const headersList = [
    { authorization: `Bearer ${refreshToken}`, 'x-refresh-token': refreshToken },
    { authorization: `Bearer ${accessToken || refreshToken}`, 'x-refresh-token': refreshToken },
    { authorization: `Bearer ${accessToken || refreshToken}` },
  ];

  let lastResult: RefreshResponse | null = null;

  for (const headers of headersList) {
    const response = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({
        query: `
          mutation RefreshTokens {
            refreshTokens {
              accessToken
              refreshToken
            }
          }
        `,
      }),
    });

    const result = (await response.json()) as RefreshResponse;
    if (result.data?.refreshTokens?.accessToken && result.data.refreshTokens.refreshToken) return result;

    lastResult = result;
    const code = result.errors?.[0]?.extensions?.code;
    const message = result.errors?.[0]?.message?.toLowerCase() ?? '';
    if (code !== 'FORBIDDEN' && !message.includes('access denied')) break;
  }

  throw new Error(lastResult?.errors?.[0]?.message || 'Unable to refresh session');
}

const authLink = setContext((_, { headers }) => {
  const { accessToken } = useAuthStore.getState();
  return {
    headers: {
      ...headers,
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
    },
  };
});

export async function refreshAccessToken(): Promise<string> {
  const { accessToken, refreshToken } = useAuthStore.getState();

  if (!refreshToken) {
    clearAuthAndRedirect();
    throw new Error('No refresh token available');
  }

  const result = await requestTokenRefresh(accessToken, refreshToken);

  const newTokens = result.data?.refreshTokens;
  if (newTokens?.accessToken && newTokens?.refreshToken) {
    useAuthStore.getState().setTokens(newTokens.accessToken, newTokens.refreshToken);
    return newTokens.accessToken;
  }

  throw new Error('Invalid refresh response');
}

// Returns a single shared promise while a refresh is in flight.
// Concurrent requests queue here and all get the same new token.
function getRefreshPromise(): Promise<string> {
  if (isRefreshing) {
    return new Promise<string>((resolve, reject) => pendingResolvers.push({ resolve, reject }));
  }

  isRefreshing = true;

  return refreshAccessToken()
    .then((token) => {
      pendingResolvers.forEach(({ resolve }) => resolve(token));
      pendingResolvers = [];
      return token;
    })
    .catch((error) => {
      pendingResolvers.forEach(({ reject }) => reject(error));
      pendingResolvers = [];
      clearAuthAndRedirect();
      throw error;
    })
    .finally(() => {
      isRefreshing = false;
    });
}

function isAuthError(error: unknown): boolean {
  if (CombinedGraphQLErrors.is(error)) {
    return error.errors.some(
      (e) =>
        e.extensions?.['code'] === 'UNAUTHENTICATED' ||
        e.message === 'Unauthorized' ||
        e.message.toLowerCase().includes('unauthorized') ||
        e.message.toLowerCase().includes('access token') ||
        e.message.toLowerCase().includes('expired'),
    );
  }
  // Network / HTTP error
  if (error && typeof error === 'object' && 'statusCode' in error) {
    return (error as { statusCode: number }).statusCode === 401;
  }
  return false;
}

const errorLink = new ErrorLink(({ error, operation, forward }) => {
  if (!isAuthError(error)) return;

  // Don't retry if we already retried this operation
  if (operation.getContext().retried) return;

  // No refresh token means user isn't logged in — let the error propagate
  // so login/register pages can show proper error messages
  const { refreshToken } = useAuthStore.getState();
  if (!refreshToken) return;

  return from(getRefreshPromise()).pipe(
    switchMap((newToken: string) => {
      operation.setContext(({ headers = {} }: { headers: Record<string, string> }) => ({
        retried: true,
        headers: { ...headers, authorization: `Bearer ${newToken}` },
      }));
      return forward(operation);
    }),
  );
});

export function startTokenRefreshTimer() {
  if (refreshTimer) clearTimeout(refreshTimer);

  const { accessToken, refreshToken } = useAuthStore.getState();
  if (!accessToken || !refreshToken) return;

  const expiresInMs = getTokenExpiresInMs(accessToken);
  const refreshInMs = Math.max(expiresInMs - REFRESH_BEFORE_EXPIRY_MS, 0) || FALLBACK_REFRESH_DELAY_MS;

  refreshTimer = setTimeout(async () => {
    const { accessToken, refreshToken } = useAuthStore.getState();
    if (accessToken && refreshToken) {
      try {
        await refreshAccessToken();
      } catch {
        // logout + redirect already handled inside refreshAccessToken
      }
    }
  }, refreshInMs);
}

export function stopTokenRefreshTimer() {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
}

export function shouldRefreshAccessToken(): boolean {
  const { accessToken, refreshToken } = useAuthStore.getState();
  if (!accessToken || !refreshToken) return false;
  return getTokenExpiresInMs(accessToken) <= REFRESH_BEFORE_EXPIRY_MS;
}

export const apolloClient = new ApolloClient({
  link: ApolloLink.from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: { fetchPolicy: 'cache-and-network' },
    query: { fetchPolicy: 'network-only' },
  },
});
