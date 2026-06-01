import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getAccessToken, clearToken } from '@/lib/auth/token-manager';
import { emitAuthEvent } from '@/lib/auth-events';

const GRAPHQL_URL = import.meta.env.VITE_GRAPHQL_URL || 'https://api.godevelopers.online/graphql';

export const apiClient = axios.create({
  baseURL: GRAPHQL_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'apollo-require-preflight': 'true',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let pendingQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

function processQueue(token: string | null, error: unknown = null) {
  pendingQueue.forEach((p) => (token ? p.resolve(token) : p.reject(error)));
  pendingQueue = [];
}

function isUnauthenticated(error: AxiosError): boolean {
  if (error.response?.status === 401) return true;
  const data = error.response?.data as { errors?: Array<{ extensions?: { code?: string } }> } | undefined;
  return data?.errors?.some((e) => e.extensions?.code === 'UNAUTHENTICATED') ?? false;
}

apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retried?: boolean };

    if (!isUnauthenticated(error) || original._retried) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({
          resolve: (token) => {
            original.headers['Authorization'] = `Bearer ${token}`;
            resolve(apiClient(original));
          },
          reject,
        });
      });
    }

    original._retried = true;
    isRefreshing = true;

    try {
      const { authService } = await import('@/services/auth.service');
      const newToken = await authService.refreshTokens();
      processQueue(newToken);
      original.headers['Authorization'] = `Bearer ${newToken}`;
      return apiClient(original);
    } catch (refreshError) {
      processQueue(null, refreshError);
      clearToken();
      emitAuthEvent({ type: 'logout-redirect', redirectTo: '/login' });
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);
