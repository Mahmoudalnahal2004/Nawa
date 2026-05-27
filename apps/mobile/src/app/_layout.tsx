import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '../store/auth-store';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useColorScheme, ActivityIndicator, View, StatusBar } from 'react-native';

export default function RootLayout() {
  const { isAuthenticated, isInitialized, checkSession } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const colorScheme = useColorScheme();

  // 1. Initialize Auth State from SecureStore on startup
  useEffect(() => {
    checkSession();
  }, []);

  // 2. Auth Guard redirect logic
  useEffect(() => {
    if (!isInitialized) return;

    // Check what segment the user is navigating to
    const segs = segments as any;
    const inAuthGroup = segs[0] === '(auth)';

    if (!isAuthenticated) {
      // Not authenticated -> Force redirect to login
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
    } else {
      // Authenticated -> Force redirect to student dashboard (Home) if inside auth group
      if (inAuthGroup || segs.length === 0 || segs[0] === 'index') {
        router.replace('/(student)');
      }
    }
  }, [isAuthenticated, isInitialized, segments]);

  // 3. Display Loading Splash until secure state has recovered
  if (!isInitialized) {
    return (
      <View style={{ flex: 1, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center' }}>
        <StatusBar barStyle="light-content" backgroundColor="#020617" />
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  // 4. Render Layout Shell
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StatusBar 
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} 
        backgroundColor={colorScheme === 'dark' ? '#020617' : '#f8fafc'} 
      />
      <Slot />
    </ThemeProvider>
  );
}
