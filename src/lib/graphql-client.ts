import { ApolloClient, InMemoryCache, createHttpLink, ApolloLink, Observable } from '@apollo/client/core';
import { setContext } from '@apollo/client/link/context';
import { ErrorLink } from '@apollo/client/link/error';
import { useAuthStore } from '@/stores/auth-store';

const GRAPHQL_URL = import.meta.env.VITE_GRAPHQL_URL || 'https://api.godevelopers.online/graphql';

// Token refresh interval (refresh 5 minutes before expiry)
const TOKEN_REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes
let refreshTimer: NodeJS.Timeout | null = null;

const httpLink = createHttpLink({
  uri: GRAPHQL_URL,
});

const authLink = setContext((_, { headers }) => {
  const { accessToken, refreshToken } = useAuthStore.getState();

  // For refresh token requests, use refresh token instead of access token
  const isRefreshRequest = headers?.['x-refresh-token'] === 'true';

  return {
    headers: {
      ...headers,
      authorization: isRefreshRequest && refreshToken
        ? `Bearer ${refreshToken}`
        : accessToken
          ? `Bearer ${accessToken}`
          : '',
    },
  };
});

async function refreshAccessToken(): Promise<string> {
  const refreshToken = useAuthStore.getState().refreshToken;

  if (!refreshToken) {
    useAuthStore.getState().logout();
    window.location.href = '/login';
    throw new Error('No refresh token available');
  }

  try {
    // Use fetch directly to avoid circular dependency with apolloClient
    const response = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'authorization': `Bearer ${refreshToken}`,
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
  } catch (error) {
    console.error('Token refresh failed:', error);
    useAuthStore.getState().logout();
    window.location.href = '/login';
    throw error;
  }
}

function startTokenRefreshTimer() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }

  refreshTimer = setInterval(async () => {
    const { accessToken, refreshToken } = useAuthStore.getState();
    if (accessToken && refreshToken) {
      try {
        console.log('Proactively refreshing tokens...');
        await refreshAccessToken();
      } catch (error) {
        console.error('Proactive token refresh failed:', error);
      }
    }
  }, TOKEN_REFRESH_INTERVAL);
}

function stopTokenRefreshTimer() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

const errorLink = new ErrorLink((error) => {
  const graphQLErrors = error.graphQLErrors;
  const networkError = error.networkError;
  const operation = error.operation;
  const forward = error.forward;

  // Handle GraphQL errors
  if (graphQLErrors) {
    for (const err of graphQLErrors) {
      if (err.extensions?.code === 'UNAUTHENTICATED' ||
        err.message.includes('Unauthorized') ||
        err.message.includes('access token') ||
        err.message.includes('expired')) {

        console.log('Token expired, attempting refresh...');

        // Prevent multiple refresh attempts
        if (operation.getContext().retry) {
          console.log('Already retrying, skipping...');
          return;
        }

        return new Observable((subscriber) => {
          refreshAccessToken()
            .then((newToken) => {
              console.log('Token refreshed successfully, retrying operation...');

              // Mark operation as retried to prevent infinite loops
              operation.setContext({
                retry: true,
                headers: {
                  ...operation.getContext().headers,
                  authorization: `Bearer ${newToken}`,
                },
              });

              // Retry the operation with new token
              forward(operation).subscribe({
                next: subscriber.next.bind(subscriber),
                error: subscriber.error.bind(subscriber),
                complete: subscriber.complete.bind(subscriber),
              });
            })
            .catch((refreshError) => {
              console.error('Token refresh failed:', refreshError);
              subscriber.error(refreshError);
            });
        });
      }
    }
  }

  // Handle network errors (like 401 responses)
  if (networkError) {
    console.error(`[Network error]:`, networkError);

    // Check if it's an authentication error
    if ('statusCode' in networkError && networkError.statusCode === 401) {
      console.log('Network 401 error, attempting token refresh...');

      if (operation.getContext().retry) {
        return;
      }

      return new Observable((subscriber) => {
        refreshAccessToken()
          .then((newToken) => {
            console.log('Token refreshed after network error, retrying...');

            operation.setContext({
              retry: true,
              headers: {
                ...operation.getContext().headers,
                authorization: `Bearer ${newToken}`,
              },
            });

            forward(operation).subscribe({
              next: subscriber.next.bind(subscriber),
              error: subscriber.error.bind(subscriber),
              complete: subscriber.complete.bind(subscriber),
            });
          })
          .catch((refreshError) => {
            console.error('Token refresh failed after network error:', refreshError);
            subscriber.error(refreshError);
          });
      });
    }
  }
});

export const apolloClient = new ApolloClient({
  link: ApolloLink.from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: { fetchPolicy: 'cache-and-network' },
    query: { fetchPolicy: 'network-only' },
  },
});

export { startTokenRefreshTimer, stopTokenRefreshTimer };
