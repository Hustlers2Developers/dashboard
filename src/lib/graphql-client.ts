import { ApolloClient, InMemoryCache, createHttpLink, ApolloLink, CombinedGraphQLErrors } from '@apollo/client/core';
import { setContext } from '@apollo/client/link/context';
import { ErrorLink } from '@apollo/client/link/error';
import { from, switchMap } from 'rxjs';
import { getAccessToken as getToken, setAccessToken as setToken, clearToken } from '@/lib/auth/token-manager';
import { useAuthStore } from '@/stores/auth-store';
import { emitAuthEvent } from '@/lib/auth-events';

const GRAPHQL_URL = import.meta.env.VITE_GRAPHQL_URL || 'https://api.godevelopers.space/graphql';

// Prevent concurrent refresh calls — queue pending resolvers
let isRefreshing = false;
let pendingResolvers: Array<{ resolve: (token: string) => void; reject: (error: unknown) => void }> = [];

const httpLink = createHttpLink({ uri: GRAPHQL_URL, credentials: 'include' });

const PUBLIC_ROUTES = ['/login', '/apply', '/accept-invite', '/forgot-password', '/reset-password', '/'];

function clearAuthAndRedirect() {
  clearToken();
  useAuthStore.getState().logout();
  const path = window.location.pathname;
  if (PUBLIC_ROUTES.includes(path)) {
    emitAuthEvent({ type: 'session-expired' });
    return;
  }
  const redirect = encodeURIComponent(path + window.location.search);
  emitAuthEvent({ type: 'logout-redirect', redirectTo: `/login?redirect=${redirect}` });
}

type RefreshResponse = {
  data?: { refreshTokens?: { accessToken?: string } };
  errors?: Array<{ message?: string; extensions?: { code?: string } }>;
};

export async function refreshAccessToken(): Promise<string> {
  const currentToken = getToken();

  const response = await fetch(GRAPHQL_URL, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'apollo-require-preflight': 'true',
      ...(currentToken ? { authorization: `Bearer ${currentToken}` } : {}),
    },
    body: JSON.stringify({
      query: `mutation RefreshTokens { refreshTokens { accessToken } }`,
    }),
  });

  const result = (await response.json()) as RefreshResponse;
  const newAccessToken = result.data?.refreshTokens?.accessToken;

  if (!newAccessToken) {
    throw new Error(result.errors?.[0]?.message || 'Unable to refresh session');
  }

  setToken(newAccessToken);
  useAuthStore.getState().setTokens(newAccessToken);
  return newAccessToken;
}

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

const authLink = setContext((_, { headers }) => {
  const token = getToken();
  return {
    headers: {
      ...headers,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  };
});

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
  if (error && typeof error === 'object' && 'statusCode' in error) {
    return (error as { statusCode: number }).statusCode === 401;
  }
  return false;
}

const errorLink = new ErrorLink(({ error, operation, forward }) => {
  if (!isAuthError(error)) return;
  if (operation.getContext().retried) return;

  // Don't try to refresh if no token in memory — user is not logged in
  if (!getToken()) return;

  // Don't try to refresh on public/auth operations
  const operationName = operation.operationName;
  if (['Login', 'RefreshTokens'].includes(operationName)) return;

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

export const apolloClient = new ApolloClient({
  link: ApolloLink.from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache({ addTypename: false }),
  defaultOptions: {
    // 'cache-and-network' (the previous default) hits the DB on every
    // useQuery mount even when cached data already exists — combined with
    // ProtectedRoute remounting on every route change, this kept the Neon
    // endpoint's compute active almost continuously. 'cache-first' serves
    // cached data with zero network round-trip when available, and only
    // hits the network the first time a query is seen (or after
    // refetch()/cache eviction) — pages that need guaranteed-fresh data on
    // every visit (e.g. lists right after a mutation) should still pass an
    // explicit fetchPolicy or call refetch() themselves.
    watchQuery: { fetchPolicy: 'cache-first' },
    query: { fetchPolicy: 'cache-first' },
    mutate: { fetchPolicy: 'no-cache' },
  },
});
