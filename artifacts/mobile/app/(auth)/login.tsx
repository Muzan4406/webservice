import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  Image,
  Modal,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useLogin, useGetAppSettings } from '@workspace/api-client-react';
import { Ionicons } from '@expo/vector-icons';

const DARK_BG = '#060D1A';
const CARD_BG = 'rgba(255,255,255,0.06)';
const BORDER = 'rgba(255,255,255,0.12)';
const FOCUS_BORDER = '#22C55E';
const GREEN = '#22C55E';
const GOLD = '#F0B429';
const WHITE = '#FFFFFF';
const MUTED = 'rgba(255,255,255,0.5)';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const { showError } = useToast();
  const { mutateAsync, isPending } = useLogin();
  const { data: appSettings } = useGetAppSettings();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [supportModal, setSupportModal] = useState(false);

  async function handleLogin() {
    if (!identifier.trim() || !password.trim()) {
      showError('Champs manquants', 'Veuillez remplir tous les champs.');
      return;
    }
    try {
      const result = await mutateAsync({ data: { identifier: identifier.trim(), password } });
      await login(result.token, result.user as any);
      router.replace('/(tabs)');
    } catch (err: any) {
      const msg = err?.data?.error ?? err?.message ?? 'Identifiants incorrects.';
      showError('Connexion échouée', msg);
    }
  }

  const hasWhatsapp1 = !!appSettings?.whatsappSupport1Url;
  const hasWhatsapp2 = !!appSettings?.whatsappSupport2Url;
  const hasTelegram = !!appSettings?.telegramSupportUrl;
  const hasSupportLink = hasWhatsapp1 || hasWhatsapp2 || hasTelegram;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: DARK_BG }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 48),
            paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 32),
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo circulaire */}
        <View style={styles.logoArea}>
          <View style={styles.logoRing}>
            <View style={styles.logoCircle}>
              <Image
                source={require('@/assets/images/logo.png')}
                style={styles.logoImage}
                resizeMode="cover"
              />
            </View>
          </View>
          <Text style={styles.tagline}>Pariez  •  Gagnez  •  Réussissez</Text>
        </View>

        {/* Titre */}
        <Text style={styles.heading}>Bon retour 👋</Text>
        <Text style={styles.subheading}>Connectez-vous à votre compte</Text>

        {/* Champ identifiant */}
        <View style={[styles.inputWrapper, focusedField === 'id' && styles.inputFocused]}>
          <Ionicons name="person-outline" size={20} color={focusedField === 'id' ? GREEN : MUTED} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Téléphone ou nom d'utilisateur"
            placeholderTextColor={MUTED}
            value={identifier}
            onChangeText={setIdentifier}
            onFocus={() => setFocusedField('id')}
            onBlur={() => setFocusedField(null)}
            autoCapitalize="none"
            keyboardType="default"
            returnKeyType="next"
          />
        </View>

        {/* Champ mot de passe */}
        <View style={[styles.inputWrapper, focusedField === 'pw' && styles.inputFocused]}>
          <Ionicons name="lock-closed-outline" size={20} color={focusedField === 'pw' ? GREEN : MUTED} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Mot de passe"
            placeholderTextColor={MUTED}
            value={password}
            onChangeText={setPassword}
            onFocus={() => setFocusedField('pw')}
            onBlur={() => setFocusedField(null)}
            secureTextEntry={!showPassword}
            returnKeyType="done"
            onSubmitEditing={handleLogin}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={MUTED} />
          </TouchableOpacity>
        </View>

        {/* Mot de passe oublié */}
        <TouchableOpacity
          style={styles.forgotBtn}
          onPress={() => setSupportModal(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
        </TouchableOpacity>

        {/* Bouton connexion */}
        <TouchableOpacity
          style={[styles.loginBtn, isPending && styles.btnDisabled]}
          onPress={handleLogin}
          disabled={isPending}
          activeOpacity={0.85}
        >
          {isPending ? (
            <ActivityIndicator color={WHITE} />
          ) : (
            <Text style={styles.loginBtnText}>Se connecter</Text>
          )}
        </TouchableOpacity>

        {/* Lien inscription */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Pas encore de compte ?</Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')} activeOpacity={0.7}>
            <Text style={styles.footerLink}> S'inscrire</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── Modal service client ─────────────────────────────────── */}
      <Modal
        visible={supportModal}
        transparent
        animationType="slide"
        onRequestClose={() => setSupportModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSupportModal(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Mot de passe oublié ?</Text>
                <Text style={styles.modalSubtitle}>Contactez notre service client</Text>
              </View>
              <TouchableOpacity onPress={() => setSupportModal(false)}>
                <Ionicons name="close" size={24} color={MUTED} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalBody}>
              Pour réinitialiser votre mot de passe, contactez notre support. Nous vous aiderons rapidement.
            </Text>

            {hasWhatsapp1 && (
              <TouchableOpacity
                style={[styles.supportBtn, { backgroundColor: '#25D366' }]}
                onPress={() => Linking.openURL(appSettings!.whatsappSupport1Url!)}
                activeOpacity={0.85}
              >
                <Ionicons name="logo-whatsapp" size={22} color={WHITE} />
                <Text style={styles.supportBtnText}>WhatsApp Support 1</Text>
              </TouchableOpacity>
            )}

            {hasWhatsapp2 && (
              <TouchableOpacity
                style={[styles.supportBtn, { backgroundColor: '#25D366' }]}
                onPress={() => Linking.openURL(appSettings!.whatsappSupport2Url!)}
                activeOpacity={0.85}
              >
                <Ionicons name="logo-whatsapp" size={22} color={WHITE} />
                <Text style={styles.supportBtnText}>WhatsApp Support 2</Text>
              </TouchableOpacity>
            )}

            {hasTelegram && (
              <TouchableOpacity
                style={[styles.supportBtn, { backgroundColor: '#0088cc' }]}
                onPress={() => Linking.openURL(appSettings!.telegramSupportUrl!)}
                activeOpacity={0.85}
              >
                <Ionicons name="paper-plane" size={22} color={WHITE} />
                <Text style={styles.supportBtnText}>Telegram Support</Text>
              </TouchableOpacity>
            )}

            {!hasSupportLink && (
              <Text style={styles.noSupportText}>
                Aucun lien de support configuré. Contactez l'administrateur.
              </Text>
            )}

            <View style={{ height: 16 }} />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: {
    flexGrow: 1,
    paddingHorizontal: 28,
  },

  /* Logo */
  logoArea: { alignItems: 'center', marginBottom: 36 },
  logoRing: {
    width: 136, height: 136, borderRadius: 68,
    borderWidth: 3, borderColor: GOLD,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
    shadowColor: GOLD, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 20, elevation: 12,
  },
  logoCircle: { width: 120, height: 120, borderRadius: 60, overflow: 'hidden', backgroundColor: '#000' },
  logoImage: { width: 120, height: 120 },
  tagline: { fontSize: 12, fontFamily: 'Poppins_400Regular', color: GOLD, letterSpacing: 1.5, textAlign: 'center' },

  /* Titres */
  heading: { fontSize: 26, fontFamily: 'Poppins_700Bold', color: WHITE, marginBottom: 6, textAlign: 'center' },
  subheading: { fontSize: 14, fontFamily: 'Poppins_400Regular', color: MUTED, textAlign: 'center', marginBottom: 32 },

  /* Champs */
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: CARD_BG, borderWidth: 1.5, borderColor: BORDER,
    borderRadius: 14, paddingHorizontal: 16, height: 58, marginBottom: 16,
  },
  inputFocused: { borderColor: FOCUS_BORDER, backgroundColor: 'rgba(34,197,94,0.06)' },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 15, fontFamily: 'Poppins_400Regular', color: WHITE, outlineStyle: 'none' as any },
  eyeBtn: { padding: 4 },

  /* Mot de passe oublié */
  forgotBtn: { alignSelf: 'flex-end', marginBottom: 20, marginTop: -8 },
  forgotText: { fontSize: 13, fontFamily: 'Poppins_400Regular', color: GOLD },

  /* Bouton */
  loginBtn: {
    backgroundColor: GREEN, borderRadius: 14, height: 58,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: GREEN, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 6,
  },
  btnDisabled: { opacity: 0.6 },
  loginBtnText: { fontSize: 16, fontFamily: 'Poppins_700Bold', color: WHITE, letterSpacing: 0.5 },

  /* Pied */
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 28 },
  footerText: { fontSize: 14, fontFamily: 'Poppins_400Regular', color: MUTED },
  footerLink: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: GREEN },

  /* Modal support */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#0E1B30',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center', marginTop: 10, marginBottom: 4,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 16, borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)', marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontFamily: 'Poppins_700Bold', color: WHITE },
  modalSubtitle: { fontSize: 13, fontFamily: 'Poppins_400Regular', color: MUTED, marginTop: 2 },
  modalBody: { fontSize: 14, fontFamily: 'Poppins_400Regular', color: MUTED, lineHeight: 22, marginBottom: 20 },
  supportBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, borderRadius: 14, height: 54, marginBottom: 12,
  },
  supportBtnText: { fontSize: 15, fontFamily: 'Poppins_700Bold', color: WHITE },
  noSupportText: { fontSize: 14, fontFamily: 'Poppins_400Regular', color: MUTED, textAlign: 'center', lineHeight: 22, marginVertical: 12 },
});
