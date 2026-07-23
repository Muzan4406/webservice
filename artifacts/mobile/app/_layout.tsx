import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import * as Notifications from 'expo-notifications';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import {
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { setBaseUrl, setAuthTokenGetter } from '@workspace/api-client-react';
import { AuthProvider } from '@/contexts/AuthContext';
import { getStoredToken } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { MaintenanceGate } from '@/components/MaintenanceGate';

// Configure API client at module level — outside any component
setBaseUrl(`https://${process.env.EXPO_PUBLIC_DOMAIN}`);
setAuthTokenGetter(getStoredToken);

SplashScreen.preventAutoHideAsync();

// Create Android notification channel so notifications appear with sound + high priority
if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('muzan-default', {
    name: 'MUZAN SERVICE',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#2F55F0',
    sound: 'default',
    enableVibrate: true,
    showBadge: true,
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function RootLayoutNav() {
  const headerOptions = {
    headerShown: true,
    headerStyle: { backgroundColor: '#2F55F0' },
    headerTintColor: '#FFFFFF',
    headerBackTitle: 'Retour',
    headerTitleStyle: { fontFamily: 'Inter_600SemiBold' },
    headerShadowVisible: false,
  };

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="deposit"
        options={{ ...headerOptions, title: 'Dépôt' }}
      />
      <Stack.Screen
        name="withdrawal"
        options={{ ...headerOptions, title: 'Retrait' }}
      />
      <Stack.Screen
        name="promotions"
        options={{ ...headerOptions, title: 'Promotions' }}
      />
      <Stack.Screen
        name="referral"
        options={{ ...headerOptions, title: 'Parrainage' }}
      />
      <Stack.Screen
        name="contest"
        options={{ ...headerOptions, title: 'Concours' }}
      />
      <Stack.Screen
        name="transactions"
        options={{ ...headerOptions, title: 'Historique' }}
      />
      <Stack.Screen name="admin" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Push notification registration is handled in AuthContext
  // (after login and on token restore) — no need to register here.

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <ToastProvider>
                <MaintenanceGate>
                  <RootLayoutNav />
                </MaintenanceGate>
              </ToastProvider>
            </GestureHandlerRootView>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
