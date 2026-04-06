import { ApolloClient, InMemoryCache, createHttpLink, ApolloLink, CombinedGraphQLErrors } from '@apollo/client/core';
import { setContext } from '@apollo/client/link/context';
import { ErrorLink } from '@apollo/client/link/error';
import { from, switchMap, of } from 'rxjs';
import { useAuthStore } from '@/stores/auth-store';

const GRAPHQL_URL = import.meta.env.VITE_GRAPHQL_URL || 'https://api.godevelopers.online/graphql';

const TOKEN_REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes
let refreshTimer: ReturnType<typeof setInterval> | null = null;

// Prevent concurrent refresh calls — queue pending resolvers
let isRefreshing = false;
let pendingResolvers: Array<(token: string) => void> = [];

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
  const { refreshToken } = useAuthStore.getState();

  if (!refreshToken) {
    useAuthStore.getState().logout();
    window.location.href = '/login';
    throw new Error('No refresh token available');
  }

  const response = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      authorization: `Bearer ${refreshToken}`,
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

  const result = await response.json();

  if (result.errors) {
    throw new Error(result.errors[0].message);
  }

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
    return new Promise<string>((resolve) => pendingResolvers.push(resolve));
  }

  isRefreshing = true;

  return refreshAccessToken()
    .then((token) => {
      pendingResolvers.forEach((resolve) => resolve(token));
      pendingResolvers = [];
      return token;
    })
    .catch((error) => {
      pendingResolvers = [];
      useAuthStore.getState().logout();
      window.location.href = '/login';
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
  if (refreshTimer) clearInterval(refreshTimer);

  refreshTimer = setInterval(async () => {
    const { accessToken, refreshToken } = useAuthStore.getState();
    if (accessToken && refreshToken) {
      try {
        await refreshAccessToken();
      } catch {
        // logout + redirect already handled inside refreshAccessToken
      }
    }
  }, TOKEN_REFRESH_INTERVAL);
}

export function stopTokenRefreshTimer() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

export const apolloClient = new ApolloClient({
  link: ApolloLink.from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: { fetchPolicy: 'cache-and-network' },
    query: { fetchPolicy: 'network-only' },
  },
});
