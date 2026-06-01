import { setAccessToken, clearToken } from '@/lib/auth/token-manager';

const GRAPHQL_URL = import.meta.env.VITE_GRAPHQL_URL || 'https://api.godevelopers.online/graphql';

interface GQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string; extensions?: { code?: string } }>;
}

async function gql<T>(query: string, variables?: Record<string, unknown>, token?: string | null): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apollo-require-preflight': 'true',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({ query, variables }),
  });

  const json = (await res.json()) as GQLResponse<T>;
  if (json.errors?.length) throw new Error(json.errors[0].message);
  if (!json.data) throw new Error('No data returned');
  return json.data;
}

export interface AuthUser {
  sub: string;
  email: string;
  systemRole: string;
  orgId: string;
}

export const authService = {
  async login(email: string, password: string): Promise<void> {
    const data = await gql<{ login: { accessToken: string } }>(
      `mutation Login($input: LoginInput!) { login(input: $input) { accessToken } }`,
      { input: { email, password } },
    );
    setAccessToken(data.login.accessToken);
  },

  async refreshTokens(): Promise<string> {
    const { getAccessToken } = await import('@/lib/auth/token-manager');
    const currentToken = getAccessToken();
    const data = await gql<{ refreshTokens: { accessToken: string } }>(
      `mutation RefreshTokens { refreshTokens { accessToken } }`,
      undefined,
      currentToken,
    );
    const newToken = data.refreshTokens.accessToken;
    setAccessToken(newToken);
    return newToken;
  },

  async logout(): Promise<void> {
    try {
      const { getAccessToken } = await import('@/lib/auth/token-manager');
      await gql(`mutation Logout { logout }`, undefined, getAccessToken());
    } finally {
      clearToken();
    }
  },

  async getCurrentUser(): Promise<AuthUser> {
    const { getAccessToken } = await import('@/lib/auth/token-manager');
    const data = await gql<{ currentUser: AuthUser }>(
      `query CurrentUser { currentUser { sub email systemRole orgId } }`,
      undefined,
      getAccessToken(),
    );
    return { ...data.currentUser, id: data.currentUser.sub } as AuthUser;
  },
};
