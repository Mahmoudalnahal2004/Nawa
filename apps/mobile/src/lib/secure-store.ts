import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Web fallback using localStorage (since SecureStore is only for native platforms)
const webStorage = {
  getItem: (key: string): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(key);
    }
    return null;
  },
  setItem: (key: string, value: string): void => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, value);
    }
  },
  removeItem: (key: string): void => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(key);
    }
  }
};

export async function setSecureItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    webStorage.setItem(key, value);
    return;
  }
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (error) {
    console.error(`Error saving secure item for key: ${key}`, error);
  }
}

export async function getSecureItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return webStorage.getItem(key);
  }
  try {
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    console.error(`Error retrieving secure item for key: ${key}`, error);
    return null;
  }
}

export async function removeSecureItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    webStorage.removeItem(key);
    return;
  }
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    console.error(`Error removing secure item for key: ${key}`, error);
  }
}

export interface StoredAuth {
  accessToken: string | null;
  refreshToken: string | null;
  user: any | null;
}

export async function saveAuthSession(accessToken: string, refreshToken: string, user: any): Promise<void> {
  await setSecureItem('access_token', accessToken);
  await setSecureItem('refresh_token', refreshToken);
  await setSecureItem('user_profile', JSON.stringify(user));
}

export async function getAuthSession(): Promise<StoredAuth> {
  const [accessToken, refreshToken, userRaw] = await Promise.all([
    getSecureItem('access_token'),
    getSecureItem('refresh_token'),
    getSecureItem('user_profile')
  ]);

  let user = null;
  if (userRaw) {
    try {
      user = JSON.parse(userRaw);
    } catch {
      user = null;
    }
  }

  return { accessToken, refreshToken, user };
}

export async function clearAuthSession(): Promise<void> {
  await Promise.all([
    removeSecureItem('access_token'),
    removeSecureItem('refresh_token'),
    removeSecureItem('user_profile')
  ]);
}
