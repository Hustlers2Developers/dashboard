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
