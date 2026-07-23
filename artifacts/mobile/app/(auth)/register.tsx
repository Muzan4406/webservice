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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useRegister } from '@workspace/api-client-react';
import { Ionicons } from '@expo/vector-icons';
import { COUNTRIES } from '@/constants/countries';
import { getDeviceId } from '@/lib/deviceId';

const DARK_BG = '#060D1A';
const CARD_BG = 'rgba(255,255,255,0.06)';
const BORDER = 'rgba(255,255,255,0.12)';
const FOCUS_BORDER = '#22C55E';
const GREEN = '#22C55E';
const GOLD = '#F0B429';
const WHITE = '#FFFFFF';
const MUTED = 'rgba(255,255,255,0.5)';

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const { showError } = useToast();
  const { mutateAsync, isPending } = useRegister();

  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [countryOpen, setCountryOpen] = useState(false);

  async function handleRegister() {
    if (!username.trim() || !phone.trim() || !password.trim() || !confirmPassword.trim()) {
      showError('Champs manquants', 'Veuillez remplir tous les champs obligatoires.');
      return;
    }
    if (!country) {
      showError('Pays requis', 'Veuillez sélectionner votre pays.');
      return;
    }
    if (password !== confirmPassword) {
      showError('Mots de passe différents', 'Les mots de passe ne correspondent pas.');
      return;
    }
    if (password.length < 6) {
      showError('Mot de passe trop court', 'Le mot de passe doit faire au moins 6 caractères.');
      return;
    }
    try {
      const deviceId = await getDeviceId();
      const result = await mutateAsync({
        data: {
          username: username.trim(),
          phone: phone.trim(),
          country,
          password,
          confirmPassword,
          referralCode: referralCode.trim() || undefined,
          deviceId: deviceId ?? undefined,
        },
      });
      await login(result.token, result.user as any);
      router.replace('/(tabs)');
    } catch (err: any) {
      const msg = err?.data?.error ?? err?.message ?? 'Inscription échouée.';
      showError('Inscription échouée', msg);
    }
  }

  const focusStyle = (field: string) => focusedField === field ? styles.inputFocused : {};
  const iconColor = (field: string) => focusedField === field ? GREEN : MUTED;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: DARK_BG }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 24),
            paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 32),
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Retour */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/(auth)/login')} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={WHITE} />
        </TouchableOpacity>

        {/* Logo */}
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
          <Text style={styles.heading}>Créer un compte</Text>
          <Text style={styles.subheading}>Rejoignez la communauté MUZAN</Text>
        </View>

        {/* Nom d'utilisateur */}
        <View style={[styles.inputWrapper, focusStyle('username')]}>
          <Ionicons name="at-outline" size={20} color={iconColor('username')} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Nom d'utilisateur"
            placeholderTextColor={MUTED}
            value={username}
            onChangeText={setUsername}
            onFocus={() => setFocusedField('username')}
            onBlur={() => setFocusedField(null)}
            autoCapitalize="none"
            returnKeyType="next"
          />
        </View>

        {/* Téléphone */}
        <View style={[styles.inputWrapper, focusStyle('phone')]}>
          <Ionicons name="call-outline" size={20} color={iconColor('phone')} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Numéro de téléphone"
            placeholderTextColor={MUTED}
            value={phone}
            onChangeText={setPhone}
            onFocus={() => setFocusedField('phone')}
            onBlur={() => setFocusedField(null)}
            keyboardType="phone-pad"
            returnKeyType="next"
          />
        </View>

        {/* Pays */}
        <TouchableOpacity
          style={[styles.inputWrapper, countryOpen && styles.inputFocused, country ? styles.inputCountryFilled : {}]}
          onPress={() => setCountryOpen(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="globe-outline" size={20} color={country ? GREEN : MUTED} style={styles.inputIcon} />
          <Text style={[styles.countryText, { color: country ? WHITE : MUTED }]}>
            {country || 'Sélectionner votre pays'}
          </Text>
          <Ionicons name="chevron-down" size={18} color={country ? GREEN : MUTED} />
        </TouchableOpacity>

        {/* Mot de passe */}
        <View style={[styles.inputWrapper, focusStyle('password')]}>
          <Ionicons name="lock-closed-outline" size={20} color={iconColor('password')} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Mot de passe (min. 6 caractères)"
            placeholderTextColor={MUTED}
            value={password}
            onChangeText={setPassword}
            onFocus={() => setFocusedField('password')}
            onBlur={() => setFocusedField(null)}
            secureTextEntry={!showPassword}
            returnKeyType="next"
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={MUTED} />
          </TouchableOpacity>
        </View>

        {/* Confirmer mot de passe */}
        <View style={[styles.inputWrapper, focusStyle('confirm')]}>
          <Ionicons name="shield-checkmark-outline" size={20} color={iconColor('confirm')} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Confirmer le mot de passe"
            placeholderTextColor={MUTED}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            onFocus={() => setFocusedField('confirm')}
            onBlur={() => setFocusedField(null)}
            secureTextEntry={!showPassword}
            returnKeyType="next"
          />
        </View>

        {/* Code de parrainage */}
        <View style={[styles.inputWrapper, focusStyle('ref'), referralCode ? styles.inputRefFilled : {}]}>
          <Ionicons name="gift-outline" size={20} color={referralCode ? GOLD : iconColor('ref')} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Code de parrainage (optionnel)"
            placeholderTextColor={MUTED}
            value={referralCode}
            onChangeText={(t) => setReferralCode(t.toUpperCase())}
            onFocus={() => setFocusedField('ref')}
            onBlur={() => setFocusedField(null)}
            autoCapitalize="characters"
            returnKeyType="done"
            onSubmitEditing={handleRegister}
          />
        </View>

        {/* Bouton */}
        <TouchableOpacity
          style={[styles.registerBtn, isPending && styles.btnDisabled]}
          onPress={handleRegister}
          disabled={isPending}
          activeOpacity={0.85}
        >
          {isPending ? (
            <ActivityIndicator color={WHITE} />
          ) : (
            <Text style={styles.registerBtnText}>S'inscrire</Text>
          )}
        </TouchableOpacity>

        {/* Lien connexion */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Déjà inscrit ?</Text>
          <TouchableOpacity onPress={() => router.replace('/(auth)/login')} activeOpacity={0.7}>
            <Text style={styles.footerLink}> Se connecter</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── Country picker modal ─────────────────────────────── */}
      {countryOpen && (
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setCountryOpen(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalSheet} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choisir votre pays</Text>
              <TouchableOpacity onPress={() => setCountryOpen(false)}>
                <Ionicons name="close" size={24} color={MUTED} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
              {COUNTRIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.countryOption, c === country && styles.countryOptionSelected]}
                  onPress={() => { setCountry(c); setCountryOpen(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.countryOptionText, c === country && styles.countryOptionTextSelected]}>{c}</Text>
                  {c === country && <Ionicons name="checkmark-circle" size={20} color={GREEN} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { flexGrow: 1, paddingHorizontal: 28 },
  backBtn: { width: 44, height: 44, justifyContent: 'center', marginBottom: 8 },

  logoArea: { alignItems: 'center', marginBottom: 24 },
  logoRing: {
    width: 110, height: 110, borderRadius: 55,
    borderWidth: 3, borderColor: GOLD,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    shadowColor: GOLD, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45, shadowRadius: 16, elevation: 10,
  },
  logoCircle: { width: 96, height: 96, borderRadius: 48, overflow: 'hidden', backgroundColor: '#000' },
  logoImage: { width: 96, height: 96 },
  heading: { fontSize: 24, fontFamily: 'Poppins_700Bold', color: WHITE, marginBottom: 4, textAlign: 'center' },
  subheading: { fontSize: 13, fontFamily: 'Poppins_400Regular', color: MUTED, textAlign: 'center', marginBottom: 20 },

  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: CARD_BG, borderWidth: 1.5, borderColor: BORDER,
    borderRadius: 14, paddingHorizontal: 16, height: 56, marginBottom: 14,
  },
  inputFocused: { borderColor: FOCUS_BORDER, backgroundColor: 'rgba(34,197,94,0.06)' },
  inputCountryFilled: { borderColor: GREEN, backgroundColor: 'rgba(34,197,94,0.06)' },
  inputRefFilled: { borderColor: GOLD, backgroundColor: 'rgba(240,180,41,0.06)' },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 15, fontFamily: 'Poppins_400Regular', color: WHITE, outlineStyle: 'none' as any },
  countryText: { flex: 1, fontSize: 15, fontFamily: 'Poppins_400Regular' },
  eyeBtn: { padding: 4 },

  registerBtn: {
    backgroundColor: GREEN, borderRadius: 14, height: 58,
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
    shadowColor: GREEN, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 6,
  },
  btnDisabled: { opacity: 0.6 },
  registerBtnText: { fontSize: 16, fontFamily: 'Poppins_700Bold', color: WHITE, letterSpacing: 0.5 },

  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  footerText: { fontSize: 14, fontFamily: 'Poppins_400Regular', color: MUTED },
  footerLink: { fontSize: 14, fontFamily: 'Poppins_600SemiBold', color: GREEN },

  modalOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#0E1B30', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16, maxHeight: '75%',
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center', marginTop: 10, marginBottom: 4,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  modalTitle: { fontSize: 17, fontFamily: 'Poppins_700Bold', color: WHITE },
  modalList: { paddingHorizontal: 4 },
  countryOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 15,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  countryOptionSelected: { backgroundColor: 'rgba(34,197,94,0.08)' },
  countryOptionText: { fontSize: 16, fontFamily: 'Poppins_400Regular', color: WHITE },
  countryOptionTextSelected: { color: GREEN, fontFamily: 'Poppins_600SemiBold' },
});
