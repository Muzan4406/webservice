import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  Linking,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  useCreateDeposit,
  useGetPaymentConfig,
  useGetSendavapayCountries,
  useGetSendavapayOperators,
  useCreateDepositPayment,
  useInitiateSendavapayPayment,
  useSubmitPaymentOtp,
  useGetSendavapayPaymentStatus,
} from '@workspace/api-client-react';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useToast } from '@/contexts/ToastContext';
import ImagePickerButton from '@/components/ImagePickerButton';
import { useAuth } from '@/contexts/AuthContext';

type DepositType = 'national' | 'international';
type Operator = 'tmoney' | 'moov_money';
type IntStep = 'form' | 'operators' | 'otp' | 'redirect' | 'waiting' | 'done' | 'failed';

const NATIONAL_OPERATORS = [
  { id: 'tmoney' as Operator, label: 'T-Money', color: '#2F55F0', bg: '#EAF0FE' },
  { id: 'moov_money' as Operator, label: 'Moov', color: '#EA580C', bg: '#FFEDD5' },
];

export default function DepositScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { user } = useAuth();
  const { mutateAsync, isPending } = useCreateDeposit();
  const { data: paymentConfig } = useGetPaymentConfig();
  const { showError, showSuccess } = useToast();

  const [type, setType] = useState<DepositType>('national');
  const [operator, setOperator] = useState<Operator>('tmoney');
  const [amount, setAmount] = useState('');
  const [oneXbetAccountId, setOneXbetAccountId] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');

  const [intStep, setIntStep] = useState<IntStep>('form');
  const [countryModalOpen, setCountryModalOpen] = useState(false);
  const [spPaymentToken, setSpPaymentToken] = useState('');
  const [spReference, setSpReference] = useState('');
  const [spSelectedCountry, setSpSelectedCountry] = useState('');
  const [spSelectedCurrency, setSpSelectedCurrency] = useState('');
  const [spSelectedOperatorId, setSpSelectedOperatorId] = useState('');
  const [spPayerPhone, setSpPayerPhone] = useState('');
  const [spOtpToken, setSpOtpToken] = useState('');
  const [spOtp, setSpOtp] = useState('');
  const [spRedirectUrl, setSpRedirectUrl] = useState('');
  const [spError, setSpError] = useState('');

  const bottomPad = insets.bottom + (Platform.OS === 'web' ? 34 : 24);

  const tmoneyMaintenance = type === 'national' && operator === 'tmoney' && paymentConfig && !paymentConfig.tmoneyEnabled;
  const moovMaintenance = type === 'national' && operator === 'moov_money' && paymentConfig && !paymentConfig.moovMoneyEnabled;
  const isMaintenance = tmoneyMaintenance || moovMaintenance;

  const ussdCode = amount ? `*145*5*${amount}*1181879*CODE SECRET#` : '*145*5*MONTANT*1181879*CODE SECRET#';

  const { data: spCountriesData, isLoading: isLoadingCountries } = useGetSendavapayCountries({
    query: { enabled: type === 'international' },
  });
  const { data: spOperatorsData, isLoading: isLoadingOperators } = useGetSendavapayOperators(
    spSelectedCountry || '_',
    { query: { enabled: !!spSelectedCountry && type === 'international' && intStep === 'operators' } }
  );

  const { mutateAsync: createDepositPayment, isPending: isCreatingPayment } = useCreateDepositPayment();
  const { mutateAsync: initiatePayment, isPending: isInitiating } = useInitiateSendavapayPayment();
  const { mutateAsync: submitOtpMut, isPending: isSubmittingOtp } = useSubmitPaymentOtp();

  const { data: statusData, isError: statusIsError } = useGetSendavapayPaymentStatus(
    spReference || '_',
    {
      query: {
        enabled: !!spReference && intStep === 'waiting',
        refetchInterval: 5000,
        retry: 2,
      },
    }
  );

  useEffect(() => {
    if (type === 'national') { setIntStep('form'); setSpReference(''); setSpPaymentToken(''); }
  }, [type]);

  useEffect(() => {
    if (!statusData) return;
    const s = statusData.status;
    if (s === 'completed') setIntStep('done');
    else if (s === 'failed' || s === 'expired') {
      setSpError('Paiement échoué ou expiré. Veuillez réessayer.');
      setIntStep('failed');
    }
  }, [statusData]);

  // If the status API itself fails after retries, treat it as a failure
  useEffect(() => {
    if (statusIsError && intStep === 'waiting') {
      setSpError('Impossible de vérifier le statut du paiement. Vérifiez votre historique ou réessayez.');
      setIntStep('failed');
    }
  }, [statusIsError, intStep]);

  async function handleSubmitNational() {
    if (isMaintenance) return;
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) { showError('Montant invalide', 'Veuillez entrer un montant valide.'); return; }
    if (!oneXbetAccountId.trim()) { showError('ID manquant', 'Veuillez entrer votre ID de compte 1xbet.'); return; }
    if (!referenceId.trim()) { showError('Référence manquante', 'Veuillez entrer le numéro de référence.'); return; }
    try {
      await mutateAsync({ data: { type: 'national', operator, oneXbetAccountId, amount: Number(amount), referenceId, screenshotUrl: screenshotUrl || undefined } });
      showSuccess('Demande envoyée ✓', 'Votre dépôt a été soumis. Un administrateur le validera rapidement.');
      router.back();
    } catch (err: any) {
      showError('Erreur', err?.data?.error ?? err?.message ?? 'Une erreur est survenue.');
    }
  }

  async function handleCreatePayment() {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) { showError('Montant invalide', 'Veuillez entrer un montant valide.'); return; }
    if (!oneXbetAccountId.trim()) { showError('ID manquant', 'Veuillez entrer votre ID de compte 1xbet.'); return; }
    if (!spSelectedCountry) { showError('Pays manquant', 'Veuillez choisir votre pays.'); return; }
    try {
      const result = await createDepositPayment({
        data: { amount: Number(amount), currency: spSelectedCurrency, payerCountry: spSelectedCountry, oneXbetAccountId }
      });
      setSpPaymentToken(result.paymentToken);
      setSpReference(result.reference);
      setSpSelectedOperatorId('');
      setIntStep('operators');
    } catch (err: any) {
      showError('Erreur', err?.data?.error ?? err?.message ?? 'Erreur SendavaPay');
    }
  }

  async function handleInitiatePayment() {
    if (!spSelectedOperatorId) { showError('Opérateur manquant', 'Veuillez sélectionner un opérateur.'); return; }
    if (!spPayerPhone.trim()) { showError('Téléphone manquant', 'Veuillez entrer votre numéro de téléphone.'); return; }
    try {
      const result = await initiatePayment({
        data: {
          paymentToken: spPaymentToken,
          payerName: (user as any)?.username ?? 'Utilisateur',
          payerPhone: spPayerPhone.trim(),
          payerCountry: spSelectedCountry,
          operatorId: spSelectedOperatorId,
        }
      });
      if (result.requiresOtp && result.otpToken) { setSpOtpToken(result.otpToken); setIntStep('otp'); }
      else if (result.requiresRedirect && result.redirectUrl) { setSpRedirectUrl(result.redirectUrl); setIntStep('redirect'); }
      else setIntStep('waiting');
    } catch (err: any) {
      showError('Erreur', err?.data?.error ?? err?.message ?? "Erreur d'initiation");
    }
  }

  async function handleSubmitOtp() {
    if (!spOtp.trim()) { showError('OTP manquant', 'Veuillez entrer le code OTP.'); return; }
    try {
      await submitOtpMut({ data: { otpToken: spOtpToken, otp: spOtp.trim() } });
      setIntStep('waiting');
    } catch (err: any) {
      showError('Erreur OTP', err?.data?.error ?? err?.message ?? 'OTP invalide');
    }
  }

  function resetIntFlow() {
    setIntStep('form');
    setCountryModalOpen(false);
    setSpPaymentToken('');
    setSpReference('');
    setSpSelectedCountry('');
    setSpSelectedCurrency('');
    setSpSelectedOperatorId('');
    setSpPayerPhone('');
    setSpOtp('');
    setSpOtpToken('');
    setSpRedirectUrl('');
    setSpError('');
  }

  const countries = spCountriesData?.countries ?? [];
  const operators = spOperatorsData?.operators ?? [];

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPad }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.label, { color: colors.foreground }]}>Type de dépôt</Text>
        <View style={styles.typeRow}>
          {(['national', 'international'] as DepositType[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={[
                styles.typeBtn,
                { backgroundColor: colors.input, borderColor: colors.input },
                type === t && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              onPress={() => setType(t)}
              activeOpacity={0.75}
            >
              <Ionicons name={t === 'national' ? 'phone-portrait' : 'globe'} size={20} color={type === t ? '#ffffff' : colors.mutedForeground} />
              <Text style={[styles.typeBtnText, { color: colors.mutedForeground }, type === t && { color: '#ffffff' }]}>
                {t === 'national' ? 'National' : 'International'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ─── NATIONAL FLOW ─── */}
        {type === 'national' && (
          <>
            <Text style={[styles.label, { color: colors.foreground, marginTop: 16 }]}>Opérateur</Text>
            <View style={styles.operatorRow}>
              {NATIONAL_OPERATORS.map((op) => (
                <TouchableOpacity
                  key={op.id}
                  style={[styles.operatorBtn, { backgroundColor: colors.input, borderColor: colors.input }, operator === op.id && { borderColor: op.color, backgroundColor: op.bg }]}
                  onPress={() => setOperator(op.id)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.operatorLabel, { color: colors.mutedForeground }, operator === op.id && { color: op.color, fontWeight: '700' }]}>
                    {op.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {type === 'national' && isMaintenance && (
          <View style={[styles.maintenanceBox, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
            <Ionicons name="construct" size={28} color="#B45309" />
            <View style={{ flex: 1 }}>
              <Text style={styles.maintenanceTitle}>Service indisponible</Text>
              <Text style={styles.maintenanceSub}>
                {moovMaintenance ? 'Moov Money' : 'T-Money'} est actuellement en maintenance.{'\n'}Veuillez réessayer plus tard.
              </Text>
            </View>
          </View>
        )}

        {type === 'national' && !isMaintenance && (
          <>
            <Text style={[styles.label, { color: colors.foreground, marginTop: 16 }]}>Montant (FCFA)</Text>
            <View style={[styles.inputRow, { backgroundColor: colors.input, borderColor: colors.input }]}>
              <TextInput style={[styles.amountInput, { color: colors.foreground }]} placeholder="Ex: 5000" placeholderTextColor={colors.mutedForeground} value={amount} onChangeText={setAmount} keyboardType="numeric" />
              <Text style={[styles.inputSuffix, { color: colors.mutedForeground }]}>FCFA</Text>
            </View>

            {operator === 'tmoney' && (
              <View style={[styles.instructionBox, { backgroundColor: colors.infoBg, borderColor: colors.info + '40' }]}>
                <View style={styles.instructionHeader}>
                  <Ionicons name="information-circle" size={20} color={colors.info} />
                  <Text style={[styles.instructionTitle, { color: colors.info }]}>Comment payer</Text>
                </View>
                <Text style={[styles.instructionText, { color: colors.foreground }]}>1. Composez le code USSD sur votre téléphone :</Text>
                <View style={[styles.ussdBox, { backgroundColor: '#ffffff', borderColor: colors.info + '30' }]}>
                  <Text style={[styles.ussdCode, { color: colors.info }]}>{ussdCode}</Text>
                </View>
                <Text style={[styles.instructionText, { color: colors.foreground }]}>2. Notez le <Text style={{ fontWeight: '700' }}>numéro de référence</Text> reçu par SMS.{'\n'}3. Entrez-le dans le champ ci-dessous.</Text>
              </View>
            )}

            {operator === 'moov_money' && (
              <View style={[styles.instructionBox, { backgroundColor: '#FFEDD5', borderColor: '#EA580C40' }]}>
                <View style={styles.instructionHeader}>
                  <Ionicons name="information-circle" size={20} color="#EA580C" />
                  <Text style={[styles.instructionTitle, { color: '#EA580C' }]}>Comment payer via Moov</Text>
                </View>
                {paymentConfig?.moovMoneyUssdCode && (
                  <>
                    <Text style={[styles.instructionText, { color: colors.foreground }]}>1. Composez le code USSD :</Text>
                    <View style={[styles.ussdBox, { backgroundColor: '#ffffff', borderColor: '#EA580C30' }]}>
                      <Text style={[styles.ussdCode, { color: '#EA580C' }]}>{paymentConfig.moovMoneyUssdCode}</Text>
                    </View>
                  </>
                )}
                {paymentConfig?.moovMoneyNumber && (
                  <Text style={[styles.instructionText, { color: colors.foreground }]}>Numéro Moov : <Text style={{ fontWeight: '700' }}>{paymentConfig.moovMoneyNumber}</Text></Text>
                )}
                {!paymentConfig?.moovMoneyUssdCode && !paymentConfig?.moovMoneyNumber && (
                  <Text style={[styles.instructionText, { color: colors.foreground }]}>Effectuez votre paiement Moov Money, puis entrez la référence ci-dessous.</Text>
                )}
              </View>
            )}

            <Text style={[styles.label, { color: colors.foreground, marginTop: 16 }]}>ID de compte 1xbet</Text>
            <TextInput style={[styles.inputFull, { backgroundColor: colors.input, borderColor: colors.input, color: colors.foreground }]} placeholder="Votre ID de compte 1xbet" placeholderTextColor={colors.mutedForeground} value={oneXbetAccountId} onChangeText={setOneXbetAccountId} keyboardType="numeric" />

            <Text style={[styles.label, { color: colors.foreground, marginTop: 16 }]}>Numéro de référence</Text>
            <TextInput style={[styles.inputFull, { backgroundColor: colors.input, borderColor: colors.input, color: colors.foreground }]} placeholder="Référence de la transaction" placeholderTextColor={colors.mutedForeground} value={referenceId} onChangeText={setReferenceId} autoCapitalize="characters" />

            <View style={{ marginTop: 16 }}>
              <ImagePickerButton label="Capture du reçu (optionnel)" value={screenshotUrl} onChange={setScreenshotUrl} />
            </View>
          </>
        )}

        {/* ─── INTERNATIONAL / SENDAVAPAY FLOW ─── */}
        {type === 'international' && (
          <>
            {intStep === 'form' && (
              <View style={{ marginTop: 16, gap: 14 }}>
                <View style={[styles.instructionBox, { backgroundColor: '#F3E8FF', borderColor: '#9333EA40', marginTop: 0 }]}>
                  <View style={styles.instructionHeader}>
                    <Ionicons name="globe" size={20} color="#9333EA" />
                    <Text style={[styles.instructionTitle, { color: '#9333EA' }]}>Dépôt via SendavaPay</Text>
                  </View>
                  <Text style={[styles.instructionText, { color: colors.foreground }]}>
                    Payez depuis votre pays avec votre opérateur mobile local.
                  </Text>
                </View>

                <Text style={[styles.label, { color: colors.foreground }]}>Montant (FCFA)</Text>
                <View style={[styles.inputRow, { backgroundColor: colors.input, borderColor: colors.input }]}>
                  <TextInput style={[styles.amountInput, { color: colors.foreground }]} placeholder="Ex: 5000" placeholderTextColor={colors.mutedForeground} value={amount} onChangeText={setAmount} keyboardType="numeric" />
                  <Text style={[styles.inputSuffix, { color: colors.mutedForeground }]}>FCFA</Text>
                </View>

                <Text style={[styles.label, { color: colors.foreground }]}>ID de compte 1xbet</Text>
                <TextInput style={[styles.inputFull, { backgroundColor: colors.input, borderColor: colors.input, color: colors.foreground }]} placeholder="Votre ID de compte 1xbet" placeholderTextColor={colors.mutedForeground} value={oneXbetAccountId} onChangeText={setOneXbetAccountId} keyboardType="numeric" />

                <Text style={[styles.label, { color: colors.foreground }]}>Votre pays</Text>
                {isLoadingCountries ? (
                  <ActivityIndicator color={colors.primary} style={{ marginVertical: 8 }} />
                ) : countries.length > 0 ? (
                  <>
                    <TouchableOpacity
                      style={[
                        styles.countryPickerBtn,
                        { backgroundColor: colors.input, borderColor: spSelectedCountry ? '#9333EA' : colors.border },
                      ]}
                      onPress={() => setCountryModalOpen(true)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="globe" size={18} color={spSelectedCountry ? '#9333EA' : colors.mutedForeground} />
                      <Text style={[styles.countryPickerText, { color: spSelectedCountry ? colors.foreground : colors.mutedForeground }]}>
                        {spSelectedCountry
                          ? `${countries.find((c: any) => c.code === spSelectedCountry)?.name ?? spSelectedCountry} (${spSelectedCurrency})`
                          : 'Sélectionner votre pays'}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color={spSelectedCountry ? '#9333EA' : colors.mutedForeground} />
                    </TouchableOpacity>

                    <Modal
                      visible={countryModalOpen}
                      transparent
                      animationType="slide"
                      onRequestClose={() => setCountryModalOpen(false)}
                    >
                      <TouchableOpacity
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={() => setCountryModalOpen(false)}
                      />
                      <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                          <Text style={[styles.modalTitle, { color: colors.foreground }]}>Choisir votre pays</Text>
                          <TouchableOpacity onPress={() => setCountryModalOpen(false)}>
                            <Ionicons name="close" size={22} color={colors.mutedForeground} />
                          </TouchableOpacity>
                        </View>
                        <ScrollView>
                          {countries.map((c: any) => (
                            <TouchableOpacity
                              key={c.code}
                              style={[
                                styles.modalOption,
                                { borderBottomColor: colors.border },
                                spSelectedCountry === c.code && { backgroundColor: '#F3E8FF' },
                              ]}
                              onPress={() => {
                                setSpSelectedCountry(c.code);
                                setSpSelectedCurrency(c.currency);
                                setSpSelectedOperatorId('');
                                setCountryModalOpen(false);
                              }}
                            >
                              <Text style={[styles.modalOptionText, { color: colors.foreground }]}>
                                {c.name}
                                <Text style={{ color: colors.mutedForeground }}>{' '}({c.currency})</Text>
                              </Text>
                              {spSelectedCountry === c.code && <Ionicons name="checkmark-circle" size={20} color="#9333EA" />}
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    </Modal>
                  </>
                ) : (
                  <View style={[styles.instructionBox, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B', marginTop: 0 }]}>
                    <Ionicons name="warning" size={18} color="#B45309" />
                    <Text style={[styles.instructionText, { color: '#92400E' }]}>
                      SendavaPay non configuré. Veuillez contacter l'administrateur.
                    </Text>
                  </View>
                )}
              </View>
            )}

            {intStep === 'operators' && (
              <View style={{ marginTop: 16, gap: 14 }}>
                <View style={styles.stepHeader}>
                  <TouchableOpacity onPress={resetIntFlow} style={[styles.backBtn, { backgroundColor: colors.secondary }]}>
                    <Ionicons name="arrow-back" size={20} color={colors.primary} />
                  </TouchableOpacity>
                  <Text style={[styles.stepTitle, { color: colors.foreground }]}>Sélectionner l'opérateur</Text>
                </View>

                <Text style={[styles.label, { color: colors.foreground }]}>Numéro de téléphone</Text>
                <TextInput
                  style={[styles.inputFull, { backgroundColor: colors.input, borderColor: colors.input, color: colors.foreground }]}
                  placeholder="+22690000000"
                  placeholderTextColor={colors.mutedForeground}
                  value={spPayerPhone}
                  onChangeText={setSpPayerPhone}
                  keyboardType="phone-pad"
                />

                <Text style={[styles.label, { color: colors.foreground }]}>Opérateur de paiement</Text>
                {isLoadingOperators ? (
                  <ActivityIndicator color={colors.primary} style={{ marginVertical: 8 }} />
                ) : operators.length > 0 ? (
                  <View style={{ gap: 8 }}>
                    {operators.map((op: any) => (
                      <TouchableOpacity
                        key={op.id}
                        style={[
                          styles.operatorCard,
                          { backgroundColor: colors.input, borderColor: colors.border },
                          spSelectedOperatorId === op.id && { borderColor: '#9333EA', backgroundColor: '#F3E8FF' },
                        ]}
                        onPress={() => setSpSelectedOperatorId(op.id)}
                        activeOpacity={0.7}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.operatorCardName, { color: colors.foreground }]}>{op.name}</Text>
                          {op.status && (
                            <Text style={[styles.operatorCardStatus, { color: op.status === 'available' ? '#10B981' : colors.mutedForeground }]}>
                              {op.status === 'available' ? 'Disponible' : op.status}
                            </Text>
                          )}
                        </View>
                        {spSelectedOperatorId === op.id && <Ionicons name="checkmark-circle" size={22} color="#9333EA" />}
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <Text style={[styles.instructionText, { color: colors.mutedForeground }]}>Aucun opérateur disponible pour ce pays.</Text>
                )}
              </View>
            )}

            {intStep === 'otp' && (
              <View style={{ marginTop: 16, gap: 14 }}>
                <View style={[styles.instructionBox, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B40', marginTop: 0 }]}>
                  <View style={styles.instructionHeader}>
                    <Ionicons name="key" size={20} color="#B45309" />
                    <Text style={[styles.instructionTitle, { color: '#B45309' }]}>Code de confirmation</Text>
                  </View>
                  <Text style={[styles.instructionText, { color: colors.foreground }]}>
                    Un code OTP a été envoyé sur votre téléphone. Saisissez-le pour confirmer le paiement.
                  </Text>
                </View>
                <Text style={[styles.label, { color: colors.foreground }]}>Code OTP</Text>
                <TextInput
                  style={[styles.inputFull, { backgroundColor: colors.input, borderColor: colors.input, color: colors.foreground, fontSize: 24, textAlign: 'center', letterSpacing: 6 }]}
                  placeholder="000000"
                  placeholderTextColor={colors.mutedForeground}
                  value={spOtp}
                  onChangeText={setSpOtp}
                  keyboardType="numeric"
                  maxLength={8}
                />
              </View>
            )}

            {intStep === 'redirect' && (
              <View style={{ marginTop: 16, gap: 14 }}>
                <View style={[styles.instructionBox, { backgroundColor: '#EEF2FF', borderColor: '#6366F140', marginTop: 0 }]}>
                  <View style={styles.instructionHeader}>
                    <Ionicons name="open" size={20} color="#4F46E5" />
                    <Text style={[styles.instructionTitle, { color: '#4F46E5' }]}>Valider sur votre banque</Text>
                  </View>
                  <Text style={[styles.instructionText, { color: colors.foreground }]}>
                    Ouvrez la page de paiement de votre opérateur, validez le paiement, puis revenez ici.
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.redirectBtn]}
                  onPress={async () => {
                    try {
                      if (spRedirectUrl) await Linking.openURL(spRedirectUrl);
                    } catch { /* URL invalide */ }
                    setIntStep('waiting');
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="open-outline" size={20} color="#fff" />
                  <Text style={styles.submitBtnText}>Ouvrir la page de paiement</Text>
                </TouchableOpacity>
              </View>
            )}

            {intStep === 'waiting' && (
              <View style={{ marginTop: 24, alignItems: 'center', gap: 16, paddingVertical: 24 }}>
                <ActivityIndicator size="large" color="#9333EA" />
                <Text style={[styles.stepTitle, { color: colors.foreground, textAlign: 'center' }]}>
                  En attente de confirmation
                </Text>
                <Text style={[styles.instructionText, { color: colors.mutedForeground, textAlign: 'center' }]}>
                  Votre paiement est en cours de traitement...
                </Text>
                <Text style={[{ color: colors.mutedForeground, fontSize: 11, fontFamily: 'Inter_400Regular' }]}>
                  Réf: {spReference}
                </Text>
              </View>
            )}

            {intStep === 'done' && (
              <View style={{ marginTop: 24, alignItems: 'center', gap: 16, paddingVertical: 24 }}>
                <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#10B98120', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="checkmark-circle" size={48} color="#10B981" />
                </View>
                <Text style={[styles.stepTitle, { color: colors.foreground, textAlign: 'center' }]}>Paiement confirmé !</Text>
                <Text style={[styles.instructionText, { color: colors.mutedForeground, textAlign: 'center' }]}>
                  Votre paiement a bien été reçu. Un administrateur va créditer votre compte 1xBet sous peu.
                </Text>
                <View style={{ backgroundColor: '#F0FDF4', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#86EFAC', width: '100%' }}>
                  <Text style={{ fontSize: 13, color: '#166534', fontFamily: 'Inter_500Medium', textAlign: 'center', lineHeight: 20 }}>
                    Votre dépôt apparaît en <Text style={{ fontWeight: '700' }}>« En attente »</Text> dans l'historique jusqu'à la validation par l'administrateur.
                  </Text>
                </View>
              </View>
            )}

            {intStep === 'failed' && (
              <View style={{ marginTop: 24, alignItems: 'center', gap: 16, paddingVertical: 24 }}>
                <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#EF444420', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="close-circle" size={48} color="#EF4444" />
                </View>
                <Text style={[styles.stepTitle, { color: colors.foreground, textAlign: 'center' }]}>Paiement échoué</Text>
                <Text style={[styles.instructionText, { color: colors.mutedForeground, textAlign: 'center' }]}>{spError}</Text>
              </View>
            )}
          </>
        )}
      </View>

      {/* Submit buttons */}
      {type === 'national' && !isMaintenance && (
        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: colors.primary }, isPending && styles.submitBtnDisabled]}
          onPress={handleSubmitNational}
          disabled={isPending}
          activeOpacity={0.8}
        >
          {isPending ? <ActivityIndicator color="#ffffff" /> : (
            <>
              <Ionicons name="arrow-down-circle" size={22} color="#ffffff" />
              <Text style={styles.submitBtnText}>Soumettre le dépôt</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {type === 'international' && intStep === 'form' && countries.length > 0 && (
        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: '#9333EA' }, (isCreatingPayment || !spSelectedCountry) && styles.submitBtnDisabled]}
          onPress={handleCreatePayment}
          disabled={isCreatingPayment || !spSelectedCountry}
          activeOpacity={0.8}
        >
          {isCreatingPayment ? <ActivityIndicator color="#ffffff" /> : (
            <>
              <Ionicons name="arrow-forward-circle" size={22} color="#ffffff" />
              <Text style={styles.submitBtnText}>Continuer vers le paiement</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {type === 'international' && intStep === 'operators' && (
        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: '#9333EA' }, (isInitiating || !spSelectedOperatorId) && styles.submitBtnDisabled]}
          onPress={handleInitiatePayment}
          disabled={isInitiating || !spSelectedOperatorId}
          activeOpacity={0.8}
        >
          {isInitiating ? <ActivityIndicator color="#ffffff" /> : (
            <>
              <Ionicons name="card" size={22} color="#ffffff" />
              <Text style={styles.submitBtnText}>Payer maintenant</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {type === 'international' && intStep === 'otp' && (
        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: '#9333EA' }, isSubmittingOtp && styles.submitBtnDisabled]}
          onPress={handleSubmitOtp}
          disabled={isSubmittingOtp}
          activeOpacity={0.8}
        >
          {isSubmittingOtp ? <ActivityIndicator color="#ffffff" /> : (
            <>
              <Ionicons name="checkmark-circle" size={22} color="#ffffff" />
              <Text style={styles.submitBtnText}>Valider le code OTP</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {type === 'international' && intStep === 'done' && (
        <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#10B981' }]} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="home" size={22} color="#ffffff" />
          <Text style={styles.submitBtnText}>Retour à l'accueil</Text>
        </TouchableOpacity>
      )}

      {type === 'international' && intStep === 'failed' && (
        <View style={{ gap: 12 }}>
          <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#9333EA' }]} onPress={resetIntFlow} activeOpacity={0.8}>
            <Ionicons name="refresh" size={22} color="#ffffff" />
            <Text style={styles.submitBtnText}>Réessayer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.secondary }]} onPress={() => router.back()} activeOpacity={0.8}>
            <Ionicons name="home" size={22} color={colors.foreground} />
            <Text style={[styles.submitBtnText, { color: colors.foreground }]}>Retour à l'accueil</Text>
          </TouchableOpacity>
        </View>
      )}

      {type === 'national' && (
        <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>
          Votre dépôt sera examiné et validé par un administrateur dans les 24 heures.
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, gap: 16 },
  card: { borderRadius: 20, padding: 20, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  label: { fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold', marginBottom: 8 },
  typeRow: { flexDirection: 'row', gap: 12 },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1 },
  typeBtnText: { fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  operatorRow: { flexDirection: 'row', gap: 12 },
  operatorBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  operatorLabel: { fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  maintenanceBox: { marginTop: 20, borderRadius: 16, padding: 20, borderWidth: 1.5, flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  maintenanceTitle: { fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold', color: '#92400E', marginBottom: 6 },
  maintenanceSub: { fontSize: 14, fontFamily: 'Inter_400Regular', color: '#92400E', lineHeight: 20 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, height: 56 },
  amountInput: { flex: 1, fontSize: 20, fontWeight: '700', fontFamily: 'Inter_700Bold', outlineStyle: 'none' as any },
  inputSuffix: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  inputFull: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, height: 56, fontSize: 16, fontFamily: 'Inter_500Medium', outlineStyle: 'none' as any },
  instructionBox: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 10, marginTop: 16 },
  instructionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  instructionTitle: { fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  instructionText: { fontSize: 14, fontFamily: 'Inter_500Medium', lineHeight: 22 },
  ussdBox: { borderRadius: 10, padding: 14, borderWidth: 1, alignItems: 'center' },
  ussdCode: { fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },
  submitBtn: { borderRadius: 16, height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 17, fontWeight: '700', color: '#ffffff', fontFamily: 'Inter_700Bold' },
  disclaimer: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 20, paddingHorizontal: 16 },
  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  stepTitle: { fontSize: 17, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  chipBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, alignItems: 'center', gap: 2 },
  chipText: { fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  chipSub: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  countryPickerBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 16, paddingVertical: 14 },
  countryPickerText: { flex: 1, fontSize: 15, fontFamily: 'Inter_500Medium' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 17, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  modalOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5 },
  modalOptionText: { fontSize: 15, fontFamily: 'Inter_500Medium' },
  operatorCard: { padding: 16, borderRadius: 14, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', gap: 12 },
  operatorCardName: { fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  operatorCardStatus: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  redirectBtn: { backgroundColor: '#4F46E5', borderRadius: 16, height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
});
