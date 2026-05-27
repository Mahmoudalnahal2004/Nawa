import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { getSecureItem, setSecureItem, clearAuthSession } from './secure-store';

// Dynamic host resolution for development:
// - Extracts debugger host machine IP using expo-constants if running in Expo Go (physical device or emulator)
// - Fallback to 10.0.2.2 for Android emulators
// - Fallback to localhost for simulators and web
const getDevIPAddress = (): string | null => {
  const hostUri = Constants.expoConfig?.hostUri; // e.g. "192.168.1.20:8081"
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    return `http://${ip}:8000`;
  }
  return null;
};

const DEFAULT_API_URL = getDevIPAddress() || Platform.select({
  android: 'http://10.0.2.2:8000',
  default: 'http://localhost:8000',
});

export const API_BASE = process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL;

const api = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT Token securely
api.interceptors.request.use(async (config) => {
  try {
    const token = await getSecureItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.error('Request interceptor: Failed to get token', error);
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response Interceptor: Seamless 401 Unauthorized handling & Token Refresh
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized errors and ensure we don't loop infinitely
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch(err => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await getSecureItem('refresh_token');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Call the backend refresh endpoint directly
        const res = await axios.post(`${API_BASE}/api/v1/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const { access_token, refresh_token: newRefresh } = res.data;

        // Persist new credentials
        await setSecureItem('access_token', access_token);
        await setSecureItem('refresh_token', newRefresh);

        // Process any queued API requests that failed during refresh
        processQueue(null, access_token);

        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);

        // Refresh failed: Clear auth session to log user out
        await clearAuthSession();

        // If we have a registered logout callback (e.g. from the store), trigger it
        if (onAuthFailureCallback) {
          onAuthFailureCallback();
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Callback to trigger logout state in the UI/Zustand store upon token refresh failure
let onAuthFailureCallback: (() => void) | null = null;

export function registerAuthFailureCallback(callback: () => void) {
  onAuthFailureCallback = callback;
}

export default api;
