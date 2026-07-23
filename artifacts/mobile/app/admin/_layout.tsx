import React, { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminLayout() {
  const colors = useColors();
  const { user, isLoading } = useAuth();

  // Guard: only admins can access admin routes
  useEffect(() => {
    if (!isLoading && (!user || !user.isAdmin)) {
      router.replace('/');
    }
  }, [user, isLoading]);

  if (isLoading || !user?.isAdmin) return null;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#FFFFFF',
        headerBackTitle: 'Retour',
        headerTitleStyle: { fontFamily: 'Inter_600SemiBold' },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Administration' }} />
      <Stack.Screen name="users" options={{ title: 'Utilisateurs' }} />
      <Stack.Screen name="deposits" options={{ title: 'Dépôts' }} />
      <Stack.Screen name="withdrawals" options={{ title: 'Retraits' }} />
      <Stack.Screen name="contest" options={{ title: 'Concours' }} />
      <Stack.Screen name="coupons" options={{ title: 'Coupons' }} />
      <Stack.Screen name="promotions" options={{ title: 'Promotions' }} />
      <Stack.Screen name="config" options={{ title: 'Configuration' }} />
      <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
    </Stack>
  );
}
