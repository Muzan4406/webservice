import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Image,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useLogout, useGetAppSettings, useGetProfile } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useToast } from '@/contexts/ToastContext';
import { router } from 'expo-router';

interface InfoRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  colors: any;
}

function InfoRow({ icon, label, value, colors }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <View style={[styles.infoIcon, { backgroundColor: colors.secondary }]}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.infoContent}>
        <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: colors.foreground }]}>{value}</Text>
      </View>
    </View>
  );
}

interface SupportLinkProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  label: string;
  sublabel: string;
  url: string | null | undefined;
  colors: any;
}

function SupportLink({ icon, iconColor, iconBg, label, sublabel, url, colors }: SupportLinkProps) {
  const { showError } = useToast();

  async function handlePress() {
    if (!url) {
      showError('Lien non configuré', 'Ce service n\'est pas encore disponible.');
      return;
    }
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      showError('Lien invalide', 'Impossible d\'ouvrir ce lien.');
    }
  }

  return (
    <TouchableOpacity
      style={[
        styles.supportRow,
        { borderBottomColor: colors.border },
        !url && { opacity: 0.5 },
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={[styles.supportIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <View style={styles.supportText}>
        <Text style={[styles.supportLabel, { color: colors.foreground }]}>{label}</Text>
        <Text style={[styles.supportSub, { color: colors.mutedForeground }]}>{sublabel}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { user, logout, updateUser } = useAuth();
  const { mutateAsync: logoutApi, isPending } = useLogout();
  const { data: appSettings } = useGetAppSettings();
  const { refetch: refetchProfile } = useGetProfile({
    query: { enabled: false },
  });

  // Refresh user data from server on every mount of this screen
  // so VIP/admin changes are visible without re-logging in
  React.useEffect(() => {
    refetchProfile().then(({ data }: { data?: any }) => {
      if (data) updateUser(data);
    }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const topPad = insets.top;
  const bottomPad = insets.bottom + (Platform.OS === 'web' ? 84 : 60) + 16;

  async function doLogout() {
    try { await logoutApi(); } catch (_) {}
    await logout();
    router.replace('/(auth)/login');
  }

  async function handleLogout() {
    if (Platform.OS === 'web') {
      // Alert.alert callbacks are unreliable on Expo Web — use native confirm
      if (window.confirm('Voulez-vous vous déconnecter ?')) {
        await doLogout();
      }
      return;
    }
    Alert.alert('Déconnexion', 'Voulez-vous vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Déconnecter', style: 'destructive', onPress: doLogout },
    ]);
  }

  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  let memberSince = '—';
  try {
    const d = new Date(user.createdAt);
    if (!isNaN(d.getTime())) {
      memberSince = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    }
  } catch {
    // createdAt malformé — on garde '—'
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 16, paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar card */}
        <View style={[styles.avatarCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.avatarCircle, { backgroundColor: colors.primary, overflow: 'hidden' }]}>
            <Image source={require('@/assets/images/logo.png')} style={styles.avatarLogo} resizeMode="cover" />
          </View>
          <View style={styles.avatarInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[styles.avatarName, { color: colors.foreground }]}>{user.username}</Text>
              {user.isVip && (
                <View style={[styles.vipBadge, { backgroundColor: colors.vipGoldBg, borderColor: colors.vipGold + '40' }]}>
                  <Ionicons name="star" size={10} color={colors.vipGold} />
                  <Text style={[styles.vipBadgeText, { color: colors.vipGold }]}>VIP</Text>
                </View>
              )}
            </View>
            <Text style={[styles.avatarId, { color: colors.mutedForeground }]}>ID: {user.userId}</Text>
          </View>
        </View>

        {/* Administration */}
        {user.isAdmin && (
          <View style={styles.section}>
             <TouchableOpacity
               style={[styles.adminCard, { backgroundColor: colors.foreground, borderColor: colors.foreground }]}
               onPress={() => router.push('/admin' as any)}
               activeOpacity={0.8}
             >
               <Ionicons name="shield-checkmark" size={24} color={colors.background} />
               <View style={{ flex: 1 }}>
                 <Text style={[styles.adminCardTitle, { color: colors.background }]}>Administration</Text>
                 <Text style={[styles.adminCardSub, { color: colors.background, opacity: 0.8 }]}>Gérer les dépôts, retraits et concours</Text>
               </View>
               <Ionicons name="chevron-forward" size={20} color={colors.background} />
             </TouchableOpacity>
          </View>
        )}

        {/* Informations */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Informations</Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <InfoRow icon="call" label="Téléphone" value={user.phone} colors={colors} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <InfoRow icon="at" label="Nom d'utilisateur" value={user.username} colors={colors} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <InfoRow icon="id-card" label="ID utilisateur" value={user.userId} colors={colors} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <InfoRow icon="calendar" label="Membre depuis" value={memberSince} colors={colors} />
          </View>
        </View>

        {/* Finances */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Finances</Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => router.push('/transactions')}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIcon, { backgroundColor: '#F0FDF4' }]}>
                <Ionicons name="receipt" size={20} color="#16A34A" />
              </View>
              <Text style={[styles.menuLabel, { color: colors.foreground }]}>Historique des transactions</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Parrainage */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Parrainage</Text>
          <TouchableOpacity
            style={[styles.referralCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push('/referral')}
            activeOpacity={0.8}
          >
            <View style={[styles.refIconCircle, { backgroundColor: colors.successBg }]}>
              <Ionicons name="people" size={24} color={colors.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.referralCodeLabel, { color: colors.mutedForeground }]}>Mon code</Text>
              <Text style={[styles.referralCode, { color: colors.success }]}>{user.referralCode}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* Support */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Support</Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>

            {/* Chaîne WhatsApp */}
            <SupportLink
              icon="logo-whatsapp"
              iconColor="#25D366"
              iconBg="#25D36615"
              label="Chaîne WhatsApp"
              sublabel="Suivre nos annonces et actualités"
              url={appSettings?.whatsappChannelUrl}
              colors={colors}
            />

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* SAV WhatsApp 1 */}
            <SupportLink
              icon="logo-whatsapp"
              iconColor="#25D366"
              iconBg="#25D36615"
              label="Service client WhatsApp 1"
              sublabel="Contacter un conseiller"
              url={appSettings?.whatsappSupport1Url}
              colors={colors}
            />

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* SAV WhatsApp 2 */}
            <SupportLink
              icon="logo-whatsapp"
              iconColor="#25D366"
              iconBg="#25D36615"
              label="Service client WhatsApp 2"
              sublabel="Contacter un conseiller"
              url={appSettings?.whatsappSupport2Url}
              colors={colors}
            />

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Telegram */}
            <SupportLink
              icon="paper-plane"
              iconColor="#229ED9"
              iconBg="#229ED915"
              label="Service client Telegram"
              sublabel="Contacter un conseiller"
              url={appSettings?.telegramSupportUrl}
              colors={colors}
            />

          </View>
        </View>

        {/* Déconnexion */}
        <TouchableOpacity
          style={[styles.logoutBtn, { backgroundColor: colors.destructive + '10', borderColor: colors.destructive + '30' }]}
          onPress={handleLogout}
          disabled={isPending}
          activeOpacity={0.8}
        >
          {isPending ? (
            <ActivityIndicator color={colors.destructive} />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={22} color={colors.destructive} />
              <Text style={[styles.logoutText, { color: colors.destructive }]}>Se déconnecter</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 16, gap: 20 },
  avatarCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLogo: { width: 72, height: 72 },
  avatarInfo: { flex: 1, gap: 6 },
  avatarName: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  avatarId: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  vipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  vipBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  section: { gap: 10 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 4,
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 12, fontFamily: 'Inter_500Medium', marginBottom: 2 },
  infoValue: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  divider: { height: 1, marginHorizontal: 16 },

  /* Menu rows (Finances section) */
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  menuLabel: { flex: 1, fontSize: 15, fontFamily: 'Inter_500Medium' },
  referralCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  refIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  referralCodeLabel: { fontSize: 12, fontFamily: 'Inter_500Medium', marginBottom: 4 },
  referralCode: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 2,
  },

  /* Support */
  supportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  supportIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  supportText: { flex: 1 },
  supportLabel: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 2,
  },
  supportSub: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },

  adminCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  adminCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    marginBottom: 4,
  },
  adminCardSub: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    marginTop: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  vipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1.5,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  vipCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  vipCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    marginBottom: 3,
  },
  vipCardSub: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
  },
});
