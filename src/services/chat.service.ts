import { getAccessToken } from '@/lib/auth/token-manager';

const GRAPHQL_URL = import.meta.env.VITE_GRAPHQL_URL || 'https://api.godevelopers.space/graphql';
const API_BASE_URL = GRAPHQL_URL.replace(/\/graphql\/?$/, '');

export interface SupabaseSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export const chatService = {
  async fetchToken(): Promise<SupabaseSession> {
    const token = getAccessToken();
    const res = await fetch(`${API_BASE_URL}/chat/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
    });

    if (!res.ok) {
      throw new Error(`Failed to mint chat session (${res.status})`);
    }

    return res.json();
  },
};
