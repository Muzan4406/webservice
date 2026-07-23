import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useGetAppSettings, getGetAppSettingsQueryKey } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';

// Blocks the whole app behind a full-screen overlay when the admin has
// enabled maintenance mode.
// • Authenticated admins: always pass through (isAdmin takes priority).
// • Everyone else (authenticated or not): maintenance screen is shown.
//   Unauthenticated users get a "Connexion admin" button so an admin can
//   sign in and turn maintenance back off.
export function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { data: appSettings, isLoading } = useGetAppSettings({
    query: {
      queryKey: getGetAppSettingsQueryKey(),
      // Poll every 15 s — maintenance activates / deactivates quickly.
      refetchInterval: 15_000,
      staleTime: 0,
    },
  });

  const isAdmin = isAuthenticated && !!user?.isAdmin;
  const initialLoading = (isAuthLoading || isLoading) && appSettings === undefined;
  // Only block users who are already authenticated and are NOT admins.
  // Unauthenticated users can still reach the login screen and log in normally.
  // Admins always pass through.
  const showMaintenance = !initialLoading && !!appSettings?.maintenanceMode && isAuthenticated && !isAdmin;

  return (
    <View style={styles.root}>
      {children}

      {/* Spinner overlay while we haven't fetched settings yet */}
      {initialLoading && (
        <View style={[styles.overlay, { backgroundColor: colors.background }]}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      )}

      {/* Maintenance overlay */}
      {showMaintenance && (
        <View style={[styles.overlay, { backgroundColor: colors.background }]}>
          <View style={{ alignItems: 'center', padding: 32, maxWidth: 360 }}>
            <View style={[styles.iconCircle, { backgroundColor: colors.warningBg }]}>
              <Ionicons name="construct" size={48} color={colors.warning} />
            </View>

            <Text style={[styles.title, { color: colors.foreground }]}>
              Application en maintenance
            </Text>

            <Text style={[styles.message, { color: colors.mutedForeground }]}>
              {appSettings?.maintenanceMessage ||
                "L'application est actuellement en maintenance. Veuillez réessayer plus tard."}
            </Text>

            {/* Only show login button for unauthenticated users so an admin
                who is logged out can sign in and disable maintenance. */}
            {!isAuthenticated && (
              <TouchableOpacity
                style={[styles.loginBtn, { backgroundColor: colors.primary }]}
                activeOpacity={0.8}
                onPress={() => router.replace('/(auth)/login')}
              >
                <Ionicons name="log-in-outline" size={18} color="#fff" />
                <Text style={styles.loginBtnText}>Connexion administrateur</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 24,
  },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 32,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
  },
  loginBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
});
