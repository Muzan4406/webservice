import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Alert, Linking, Modal, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { COUNTRIES } from '@/constants/countries';
import {
  useGetAppSettings,
  useGetSendavapayOperators,
  useCreateVipPayment,
  useInitiateSendavapayPayment,
  useSubmitPaymentOtp,
  useGetSendavapayPaymentStatus,
} from '@workspace/api-client-react';
import { useAuth } from '@/contexts/AuthContext';

// Mapping country name → SendavaPay / ISO country code
const COUNTRY_CODES: Record<string, string> = {
  'Togo': 'TG',
  'Bénin': 'BJ',
  "Côte d'Ivoire": 'CI',
  'Burkina Faso': 'BF',
  'Cameroun': 'CM',
  'Congo démocratique': 'CD',
  'Congo Brazzaville': 'CG',
};

type Step = 'form' | 'operators' | 'otp' | 'redirect' | 'waiting' | 'done' | 'failed';

const VIP_BENEFITS = [
  { icon: 'football', text: 'Jeux virtuels FIFA (accès exclusif VIP)' },
  { icon: 'trending-up', text: 'Coupon montante (gains progressifs)' },
  { icon: 'gift', text: 'Un coupon sûr offert chaque jour' },
  { icon: 'trophy', text: 'Accès aux concours VIP exclusifs' },
  { icon: 'star', text: 'Badge Premium visible sur votre profil' },
  { icon: 'headset', text: 'Priorité sur le service client' },
];

export default function VipPurchaseScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { data: appSettings } = useGetAppSettings();

  const [step, setStep] = useState<Step>('form');
  const [selectedCountryName, setSelectedCountryName] = useState('');
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [selectedOperator, setSelectedOperator] = useState<any>(null);
  const [payerPhone, setPayerPhone] = useState('');
  const [paymentToken, setPaymentToken] = useState('');
  const [spReference, setSpReference] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [redirectUrl, setRedirectUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const vipPrice = appSettings?.vipPriceFcfa ? Number(appSettings.vipPriceFcfa) : 5000;

  const selectedCountryCode = COUNTRY_CODES[selectedCountryName] ?? '';

  // API hooks
  const { data: operatorsData, isLoading: loadingOperators } = useGetSendavapayOperators(
    selectedCountryCode || '_',
    { query: { enabled: !!selectedCountryCode && step === 'operators' } }
  );
  const operators: any[] = (operatorsData as any)?.operators ?? [];

  const { mutateAsync: createVipPayment, isPending: creatingPayment } = useCreateVipPayment();
  const { mutateAsync: initiatePayment, isPending: initiating } = useInitiateSendavapayPayment();
  const { mutateAsync: submitOtp, isPending: submittingOtp } = useSubmitPaymentOtp();

  const { user, updateUser } = useAuth();

  const { data: statusData } = useGetSendavapayPaymentStatus(
    spReference || '_',
    { query: { enabled: !!spReference && step === 'waiting', refetchInterval: 5000 } }
  );

  React.useEffect(() => {
    if (!statusData) return;
    const s = (statusData as any)?.status;
    if (s === 'completed') {
      // Immediately update local auth state so coupons page reflects VIP without re-login
      if (user && !user.isVip) {
        updateUser({ ...user, isVip: true });
      }
      setStep('done');
    } else if (s === 'failed' || s === 'expired') {
      setStep('failed');
    }
  }, [statusData]);

  // ── Step: form ──────────────────────────────────────────────────────
  async function handleContinue() {
    if (!selectedCountryName) { Alert.alert('Erreur', 'Sélectionnez votre pays.'); return; }
    try {
      const res = await createVipPayment({
        data: { currency: 'XOF', payerCountry: selectedCountryCode },
      });
      const r = res as any;
      setPaymentToken(r.paymentToken);
      setSpReference(r.reference);
      setStep('operators');
    } catch (e: any) {
      Alert.alert('Erreur', e?.response?.data?.error ?? e.message ?? 'Erreur inattendue');
    }
  }

  // ── Step: operators ─────────────────────────────────────────────────
  async function handlePay() {
    if (!selectedOperator) { Alert.alert('Erreur', 'Sélectionnez un opérateur.'); return; }
    if (!payerPhone.trim()) { Alert.alert('Erreur', 'Entrez votre numéro de téléphone.'); return; }
    try {
      const res = await initiatePayment({
        data: {
          paymentToken,
          payerName: 'Client',
          payerPhone: payerPhone.trim(),
          payerCountry: selectedCountryCode,
          operatorId: selectedOperator.id,
        },
      });
      const r = res as any;
      if (r.requiresOtp) {
        setOtpToken(r.otpToken ?? '');
        setStep('otp');
      } else if (r.requiresRedirect) {
        setRedirectUrl(r.redirectUrl ?? '');
        setStep('redirect');
      } else {
        setStep('waiting');
      }
    } catch (e: any) {
      Alert.alert('Erreur', e?.response?.data?.error ?? e.message ?? 'Erreur inattendue');
    }
  }

  // ── Step: otp ───────────────────────────────────────────────────────
  async function handleOtp() {
    if (!otpCode.trim()) { Alert.alert('Erreur', 'Entrez le code OTP.'); return; }
    try {
      await submitOtp({ data: { otpToken, otp: otpCode.trim() } });
      setStep('waiting');
    } catch (e: any) {
      Alert.alert('Erreur', e?.response?.data?.error ?? e.message ?? 'OTP invalide');
    }
  }

  // ── UI ──────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Accès VIP</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── FORM ─────────────────────────────────────────────────── */}
        {step === 'form' && (
          <View style={styles.section}>
            {/* VIP price banner */}
            <View style={[styles.priceBanner, { backgroundColor: '#FFFBEB', borderColor: '#F59E0B40' }]}>
              <Ionicons name="star" size={32} color="#F59E0B" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.priceLabel, { color: '#92400E' }]}>Prix de l'accès VIP</Text>
                <Text style={[styles.priceValue, { color: '#B45309' }]}>
                  {vipPrice.toLocaleString('fr-FR')} FCFA
                </Text>
              </View>
            </View>

            {/* Benefits */}
            <View style={[styles.benefitsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.benefitsTitle, { color: colors.foreground }]}>Ce que vous obtenez</Text>
              {VIP_BENEFITS.map((b, i) => (
                <View key={i} style={styles.benefitRow}>
                  <Ionicons name={b.icon as any} size={18} color="#F59E0B" />
                  <Text style={[styles.benefitText, { color: colors.foreground }]}>{b.text}</Text>
                </View>
              ))}
            </View>

            {/* Country picker */}
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Votre pays</Text>
            <TouchableOpacity
              style={[
                styles.pickerBtn,
                {
                  backgroundColor: colors.input,
                  borderColor: selectedCountryName ? '#F59E0B' : colors.border,
                },
              ]}
              onPress={() => setCountryPickerOpen(true)}
              activeOpacity={0.8}
            >
              <Text style={[styles.pickerBtnText, { color: selectedCountryName ? colors.foreground : colors.mutedForeground }]}>
                {selectedCountryName || 'Sélectionner votre pays'}
              </Text>
              <Ionicons name="chevron-down" size={18} color={selectedCountryName ? '#F59E0B' : colors.mutedForeground} />
            </TouchableOpacity>

            {/* Country modal */}
            <Modal
              visible={countryPickerOpen}
              transparent
              animationType="slide"
              onRequestClose={() => setCountryPickerOpen(false)}
            >
              <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setCountryPickerOpen(false)}
              />
              <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
                <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.modalTitle, { color: colors.foreground }]}>Choisir votre pays</Text>
                  <TouchableOpacity onPress={() => setCountryPickerOpen(false)}>
                    <Ionicons name="close" size={22} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </View>
                {COUNTRIES.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.modalOption,
                      { borderBottomColor: colors.border },
                      selectedCountryName === c && { backgroundColor: '#FFFBEB' },
                    ]}
                    onPress={() => { setSelectedCountryName(c); setCountryPickerOpen(false); }}
                  >
                    <Text style={[styles.modalOptionText, { color: colors.foreground }]}>{c}</Text>
                    {selectedCountryName === c && <Ionicons name="checkmark-circle" size={20} color="#F59E0B" />}
                  </TouchableOpacity>
                ))}
              </View>
            </Modal>

            <TouchableOpacity
              style={[styles.btn, { backgroundColor: '#F59E0B', marginTop: 20 }]}
              onPress={handleContinue}
              disabled={creatingPayment}
            >
              {creatingPayment
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>Continuer →</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* ── OPERATORS ────────────────────────────────────────────── */}
        {step === 'operators' && (
          <View style={styles.section}>
            <Text style={[styles.stepTitle, { color: colors.foreground }]}>Choisir l'opérateur</Text>
            <Text style={[styles.stepSub, { color: colors.mutedForeground }]}>
              Montant à payer : <Text style={{ fontWeight: '700', color: '#F59E0B' }}>{vipPrice.toLocaleString('fr-FR')} FCFA</Text>
            </Text>

            {loadingOperators ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
            ) : (
              operators.map((op: any) => (
                <TouchableOpacity
                  key={op.id}
                  style={[
                    styles.opCard,
                    { backgroundColor: colors.card, borderColor: selectedOperator?.id === op.id ? '#F59E0B' : colors.border },
                  ]}
                  onPress={() => setSelectedOperator(op)}
                >
                  <Text style={[styles.opName, { color: colors.foreground }]}>{op.name}</Text>
                  {selectedOperator?.id === op.id && <Ionicons name="checkmark-circle" size={22} color="#F59E0B" />}
                </TouchableOpacity>
              ))
            )}

            <Text style={[styles.label, { color: colors.mutedForeground, marginTop: 20 }]}>Numéro de téléphone</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
              placeholder="+226 XX XX XX XX"
              placeholderTextColor={colors.mutedForeground}
              value={payerPhone}
              onChangeText={setPayerPhone}
              keyboardType="phone-pad"
            />

            <TouchableOpacity
              style={[styles.btn, { backgroundColor: '#F59E0B', marginTop: 20 }]}
              onPress={handlePay}
              disabled={initiating}
            >
              {initiating
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>Payer {vipPrice.toLocaleString('fr-FR')} FCFA</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setStep('form')} style={styles.backLink}>
              <Text style={[styles.backLinkText, { color: colors.mutedForeground }]}>← Retour</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── OTP ──────────────────────────────────────────────────── */}
        {step === 'otp' && (
          <View style={styles.section}>
            <View style={styles.centerIcon}>
              <Ionicons name="mail-outline" size={48} color="#F59E0B" />
            </View>
            <Text style={[styles.stepTitle, { color: colors.foreground, textAlign: 'center' }]}>Code de confirmation</Text>
            <Text style={[styles.stepSub, { color: colors.mutedForeground, textAlign: 'center' }]}>
              Un code a été envoyé sur le numéro {payerPhone}. Saisissez-le ci-dessous.
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border, textAlign: 'center', fontSize: 22, letterSpacing: 8 }]}
              placeholder="· · · · · ·"
              placeholderTextColor={colors.mutedForeground}
              value={otpCode}
              onChangeText={setOtpCode}
              keyboardType="number-pad"
              maxLength={8}
            />
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: '#F59E0B', marginTop: 20 }]}
              onPress={handleOtp}
              disabled={submittingOtp}
            >
              {submittingOtp ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Confirmer</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* ── REDIRECT ─────────────────────────────────────────────── */}
        {step === 'redirect' && (
          <View style={styles.section}>
            <View style={styles.centerIcon}>
              <Ionicons name="globe-outline" size={48} color="#F59E0B" />
            </View>
            <Text style={[styles.stepTitle, { color: colors.foreground, textAlign: 'center' }]}>Redirection vers votre banque</Text>
            <Text style={[styles.stepSub, { color: colors.mutedForeground, textAlign: 'center' }]}>
              Complétez le paiement sur la page de votre opérateur, puis revenez ici.
            </Text>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: '#F59E0B', marginTop: 20 }]}
              onPress={() => { Linking.openURL(redirectUrl); setStep('waiting'); }}
            >
              <Text style={styles.btnText}>Ouvrir la page de paiement</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── WAITING ──────────────────────────────────────────────── */}
        {step === 'waiting' && (
          <View style={[styles.section, { alignItems: 'center' }]}>
            <ActivityIndicator size="large" color="#F59E0B" style={{ marginTop: 32 }} />
            <Text style={[styles.stepTitle, { color: colors.foreground, textAlign: 'center', marginTop: 24 }]}>
              En attente de confirmation...
            </Text>
            <Text style={[styles.stepSub, { color: colors.mutedForeground, textAlign: 'center' }]}>
              Vérifiez les notifications sur votre téléphone et confirmez le paiement.
            </Text>
            <Text style={[{ color: colors.mutedForeground, fontSize: 12, marginTop: 16, textAlign: 'center' }]}>
              Cette page se met à jour automatiquement.
            </Text>
          </View>
        )}

        {/* ── DONE ─────────────────────────────────────────────────── */}
        {step === 'done' && (
          <View style={[styles.section, { alignItems: 'center' }]}>
            <View style={[styles.resultIcon, { backgroundColor: '#FFFBEB' }]}>
              <Ionicons name="star" size={52} color="#F59E0B" />
            </View>
            <Text style={[styles.resultTitle, { color: '#B45309' }]}>VIP Activé !</Text>
            <Text style={[styles.resultSub, { color: colors.mutedForeground }]}>
              Votre accès VIP a été activé avec succès. Reconnectez-vous pour voir votre badge VIP.
            </Text>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: '#F59E0B', marginTop: 32 }]}
              onPress={() => router.replace('/(tabs)/profile')}
            >
              <Text style={styles.btnText}>Retour au profil</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── FAILED ───────────────────────────────────────────────── */}
        {step === 'failed' && (
          <View style={[styles.section, { alignItems: 'center' }]}>
            <View style={[styles.resultIcon, { backgroundColor: '#FEF2F2' }]}>
              <Ionicons name="close-circle" size={52} color="#EF4444" />
            </View>
            <Text style={[styles.resultTitle, { color: '#DC2626' }]}>Paiement échoué</Text>
            <Text style={[styles.resultSub, { color: colors.mutedForeground }]}>
              Le paiement n'a pas abouti. Vérifiez votre solde et réessayez.
            </Text>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.primary, marginTop: 32 }]}
              onPress={() => { setStep('form'); setSpReference(''); setPaymentToken(''); }}
            >
              <Text style={styles.btnText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  back: { width: 40, alignItems: 'flex-start' },
  headerTitle: { fontSize: 18, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  scroll: { padding: 20 },
  section: { gap: 12 },

  priceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  priceLabel: { fontSize: 13, fontFamily: 'Inter_500Medium', marginBottom: 4 },
  priceValue: { fontSize: 26, fontWeight: '700', fontFamily: 'Inter_700Bold' },

  benefitsCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  benefitsTitle: { fontSize: 15, fontWeight: '700', fontFamily: 'Inter_700Bold', marginBottom: 4 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  benefitText: { fontSize: 14, fontFamily: 'Inter_500Medium', flex: 1 },

  label: { fontSize: 13, fontFamily: 'Inter_500Medium', marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  pickerBtnText: { fontSize: 15, fontFamily: 'Inter_400Regular' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
  },
  modalOptionText: { fontSize: 15, fontFamily: 'Inter_500Medium' },

  stepTitle: { fontSize: 20, fontWeight: '700', fontFamily: 'Inter_700Bold', marginTop: 8 },
  stepSub: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 22 },

  opCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    borderWidth: 2,
    padding: 16,
  },
  opName: { fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },

  btn: {
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold' },

  backLink: { alignItems: 'center', padding: 12 },
  backLinkText: { fontSize: 14, fontFamily: 'Inter_500Medium' },

  centerIcon: { alignItems: 'center', marginTop: 32, marginBottom: 8 },
  resultIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    marginBottom: 16,
  },
  resultTitle: { fontSize: 26, fontWeight: '700', fontFamily: 'Inter_700Bold', textAlign: 'center' },
  resultSub: { fontSize: 15, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 24 },
});
