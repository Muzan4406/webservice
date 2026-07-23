import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCreateWithdrawal } from '@workspace/api-client-react';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useToast } from '@/contexts/ToastContext';
import SelectField from '@/components/SelectField';
import { COUNTRIES, OPERATORS_BY_COUNTRY } from '@/constants/payment-options';

export default function WithdrawalScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { mutateAsync, isPending } = useCreateWithdrawal();
  const { showError, showSuccess } = useToast();

  const [step, setStep] = useState<1 | 2>(1);
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('Togo');
  const [code, setCode] = useState('');

  const operators = useMemo(
    () => OPERATORS_BY_COUNTRY[country] ?? OPERATORS_BY_COUNTRY['Togo'],
    [country]
  );
  const [operator, setOperator] = useState(operators[0].id);

  // Reset operator to first available when country changes
  useEffect(() => {
    setOperator(operators[0].id);
  }, [operators]);

  const bottomPad = insets.bottom + (Platform.OS === 'web' ? 34 : 24);

  async function handleSubmit() {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      showError('Montant invalide', 'Veuillez entrer un montant valide.');
      return;
    }
    if (!phone.trim()) {
      showError('Téléphone manquant', 'Veuillez entrer votre numéro de téléphone.');
      return;
    }
    if (!country.trim()) {
      showError('Pays manquant', 'Veuillez entrer votre pays.');
      return;
    }
    if (!code.trim()) {
      showError('Code manquant', 'Veuillez entrer le code obtenu sur 1xBet.');
      return;
    }
    try {
      await mutateAsync({
        data: {
          amount: Number(amount),
          phone: phone.trim(),
          country: country.trim(),
          operator,
          code: code.trim(),
        },
      });
      showSuccess('Demande envoyée ✓', 'Votre retrait a été soumis. Un administrateur le traitera dans les 24h.');
      router.back();
    } catch (err: any) {
      const msg = err?.data?.error ?? err?.message ?? 'Une erreur est survenue.';
      showError('Erreur', msg);
    }
  }

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPad }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Step indicators */}
      <View style={styles.steps}>
        {[1, 2].map((s) => (
          <React.Fragment key={s}>
            <TouchableOpacity
              style={[
                styles.stepCircle,
                { backgroundColor: colors.secondary, borderColor: colors.border },
                step >= s && { backgroundColor: colors.primary, borderColor: colors.primary }
              ]}
              onPress={() => s < step && setStep(s as 1 | 2)}
            >
              <Text style={[
                styles.stepNum,
                { color: colors.mutedForeground },
                step >= s && { color: '#ffffff' }
              ]}>{s}</Text>
            </TouchableOpacity>
            {s < 2 && <View style={[
              styles.stepLine,
              { backgroundColor: colors.border },
              step > s && { backgroundColor: colors.primary }
            ]} />}
          </React.Fragment>
        ))}
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Step 1 — 1xBet guide */}
        {step === 1 && (
          <>
            <Text style={[styles.stepTitle, { color: colors.foreground }]}>Obtenir le code 1xBet</Text>

            <View style={[styles.guideCard, { backgroundColor: colors.infoBg, borderColor: colors.info + '40' }]}>
              <View style={styles.guideHeader}>
                <Ionicons name="information-circle" size={24} color={colors.info} />
                <Text style={[styles.guideTitle, { color: colors.info }]}>Important</Text>
              </View>

              <Text style={[styles.guideStepText, { color: colors.foreground }]}>
                Dès que vous accédez à la partie <Text style={{ fontWeight: '700' }}>Retrait</Text> sur 1xBet, faites
                défiler vers le bas puis sélectionnez{' '}
                <Text style={{ fontWeight: '700' }}>Espèces</Text> (logo 1xbet).{'\n\n'}
                Choisissez ensuite Ville :{' '}
                <Text style={{ fontWeight: '700', color: colors.foreground }}>Tsevie</Text>
                {' '}et Rue :{' '}
                <Text style={{ fontWeight: '700', color: colors.foreground }}>Kpali24</Text>,
                indiquez le montant puis confirmez votre demande.{'\n\n'}
                Revenez ensuite en haut de la page de retrait pour voir le retrait en attente.{'\n\n'}
                Une fois votre retrait approuvé, vous recevrez un code de retrait.
              </Text>
            </View>

            <View style={[styles.addressBox, { backgroundColor: colors.successBg, borderColor: colors.success + '40' }]}>
              <Ionicons name="location" size={24} color={colors.success} />
              <View>
                <Text style={[styles.addressLabel, { color: colors.success }]}>Point de retrait à sélectionner</Text>
                <Text style={[styles.addressValue, { color: colors.success }]}>Tsevie — Kpali24</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.nextBtn, { backgroundColor: colors.primary }]}
              onPress={() => setStep(2)}
              activeOpacity={0.8}
            >
              <Text style={styles.nextBtnText}>J'ai le code — Continuer</Text>
              <Ionicons name="arrow-forward" size={20} color="#ffffff" />
            </TouchableOpacity>
          </>
        )}

        {/* Step 2 — Withdrawal form */}
        {step === 2 && (
          <>
            <Text style={[styles.stepTitle, { color: colors.foreground }]}>Vos informations</Text>

            {/* Pays en premier — les opérateurs s'adaptent au pays choisi */}
            <SelectField
              label="Pays"
              value={country}
              onChange={setCountry}
              options={COUNTRIES}
              placeholder="Choisir votre pays"
            />

            <Text style={[styles.label, { color: colors.foreground, marginTop: 16 }]}>Opérateur mobile</Text>
            <View style={styles.operatorRow}>
              {operators.map((op) => (
                <TouchableOpacity
                  key={op.id}
                  style={[
                    styles.operatorBtn,
                    { backgroundColor: colors.input, borderColor: colors.input },
                    operator === op.id && { borderColor: op.color, backgroundColor: op.bg },
                  ]}
                  onPress={() => setOperator(op.id)}
                  activeOpacity={0.75}
                >
                  <Text style={[
                    styles.operatorLabel,
                    { color: colors.mutedForeground },
                    operator === op.id && { color: op.color, fontWeight: '700' }
                  ]}>
                    {op.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { color: colors.foreground, marginTop: 16 }]}>Montant (FCFA)</Text>
            <View style={[styles.inputRow, { backgroundColor: colors.input, borderColor: colors.input }]}>
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="Ex: 10000"
                placeholderTextColor={colors.mutedForeground}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
              />
              <Text style={[styles.inputSuffix, { color: colors.mutedForeground }]}>FCFA</Text>
            </View>

            <Text style={[styles.label, { color: colors.foreground, marginTop: 16 }]}>Numéro de téléphone</Text>
            <TextInput
              style={[styles.inputFull, { backgroundColor: colors.input, borderColor: colors.input, color: colors.foreground }]}
              placeholder="+228 XX XX XX XX"
              placeholderTextColor={colors.mutedForeground}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />

            <Text style={[styles.label, { color: colors.foreground, marginTop: 16 }]}>Code 1xBet reçu</Text>
            <TextInput
              style={[styles.inputFull, { backgroundColor: colors.input, borderColor: colors.input, color: colors.foreground }]}
              placeholder="Code de confirmation"
              placeholderTextColor={colors.mutedForeground}
              value={code}
              onChangeText={(t) => setCode(t.toUpperCase())}
              autoCapitalize="characters"
            />

            <View style={styles.btnRow}>
              <TouchableOpacity
                style={[styles.backBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                onPress={() => setStep(1)}
                activeOpacity={0.8}
              >
                <Ionicons name="arrow-back" size={20} color={colors.foreground} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: colors.primary }, isPending && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={isPending}
                activeOpacity={0.8}
              >
                {isPending ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="arrow-up-circle" size={22} color="#ffffff" />
                    <Text style={styles.submitBtnText}>Envoyer la demande</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
      
      <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>
        Votre demande sera traitée dans les 24 heures par notre équipe.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, gap: 16 },
  steps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
    marginBottom: 8,
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  stepNum: { fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  stepLine: { flex: 1, height: 3, maxWidth: 80 },
  card: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    marginBottom: 20,
  },
  guideCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    gap: 16,
    marginBottom: 16,
  },
  guideHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  guideTitle: { fontSize: 18, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  guideStep: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  guideStepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  guideStepNumText: { fontSize: 14, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  guideStepText: { flex: 1, fontSize: 15, fontFamily: 'Inter_500Medium', lineHeight: 24, marginTop: 2 },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    marginBottom: 24,
  },
  addressLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold', marginBottom: 2 },
  addressValue: { fontSize: 18, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  nextBtn: {
    borderRadius: 16,
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#2F55F0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  nextBtnText: { fontSize: 17, fontWeight: '700', color: '#ffffff', fontFamily: 'Inter_700Bold' },
  label: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    height: 56,
  },
  input: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    outlineStyle: 'none' as any,
  },
  inputSuffix: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  operatorRow: { flexDirection: 'row', gap: 12 },
  operatorBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  operatorLabel: { fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  inputFull: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    height: 56,
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
  },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  backBtn: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  submitBtn: {
    flex: 1,
    borderRadius: 16,
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#2F55F0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { fontSize: 17, fontWeight: '700', color: '#ffffff', fontFamily: 'Inter_700Bold' },
  disclaimer: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
});
