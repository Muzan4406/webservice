import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useGetAppSettings } from '@workspace/api-client-react';
import { useAuth } from '@/contexts/AuthContext';
import { BottomNav } from '@/components/BottomNav';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/lib/toast';
import {
  ArrowLeft, Check, Star, Loader2, CircleCheck, TriangleAlert, XCircle,
} from 'lucide-react';
import { useLocation } from 'wouter';
import { createPaymentRequestId } from '@/lib/payment-request-id';
import { normalizeNationalPhoneInput } from '@/lib/national-phone';

async function apiFetch(url: string, options?: { method?: string; body?: any }): Promise<any> {
  const token = localStorage.getItem('muzan_auth_token');
  const res = await fetch(url, {
    method: options?.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(options?.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data?.error ?? `Erreur réseau (${res.status})`) as Error & {
      status?: number;
      diagnosticId?: string;
      code?: string;
    };
    error.status = res.status;
    if (typeof data?.diagnosticId === 'string') error.diagnosticId = data.diagnosticId;
    if (typeof data?.code === 'string') error.code = data.code;
    throw error;
  }
  return data;
}

type DrimPayOperator = { code: string; label: string; requiresOtp?: boolean; otpInstructions?: string };
type DrimPayCountry = {
  code: string;
  name: string;
  currency: string;
  callingCode: string;
  nationalNumberLength: number;
  operators: DrimPayOperator[];
};

const VIP_BENEFITS = [
  { icon: '⚽', text: 'Jeux virtuels FIFA (accès exclusif VIP)' },
  { icon: '📈', text: 'Coupon montante (gains progressifs)' },
  { icon: '🎁', text: 'Un coupon sûr offert chaque jour' },
  { icon: '🏆', text: 'Accès aux concours VIP exclusifs' },
  { icon: '⭐', text: 'Badge Premium visible sur votre profil' },
  { icon: '🎧', text: 'Priorité sur le service client' },
];

type Step = 'form' | 'wave' | 'waiting' | 'confirmRetry' | 'done' | 'failed';

export default function VipPurchasePage() {
  const [, setLocation] = useLocation();
  const { user, updateUser } = useAuth() as any;
  const { data: appSettings } = useGetAppSettings();
  const vipPrice = appSettings?.vipPriceFcfa ? Number(appSettings.vipPriceFcfa) : 5000;

  const [step, setStep] = useState<Step>('form');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [countries, setCountries] = useState<DrimPayCountry[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(true);
  const [selectedOperator, setSelectedOperator] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [payerPhone, setPayerPhone] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [paymentDiagnosticId, setPaymentDiagnosticId] = useState('');
  const [waveUrl, setWaveUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [paymentStartError, setPaymentStartError] = useState<string | null>(null);
  const [confirmedVipExpiresAt, setConfirmedVipExpiresAt] = useState<string | null>(user?.vipExpiresAt ?? null);
  const requestId = useRef('');
  const activeCountry = countries.find(country => country.code === selectedCountry);
  const activeOperator = activeCountry?.operators.find(operator => operator.code === selectedOperator);

  const refreshVipProfile = useCallback(async () => {
    try {
      const fresh = await apiFetch('/api/profile');
      setConfirmedVipExpiresAt(fresh.vipExpiresAt ?? null);
      updateUser?.({ isVip: fresh.isVip, vipExpiresAt: fresh.vipExpiresAt ?? null });
    } catch {
      updateUser?.({ isVip: true });
    }
  }, [updateUser]);

  // La liste est limitée aux opérateurs de production publiés par DrimPay.
  useEffect(() => {
    apiFetch('/api/drimpay/countries')
      .then((data: DrimPayCountry[]) => setCountries(data))
      .catch(() => toast.error('Impossible de charger les opérateurs DrimPay.'))
      .finally(() => setCountriesLoading(false));
  }, []);

  // Polling statut
  useEffect(() => {
    if (!transactionId || step !== 'waiting') return;
    const interval = setInterval(async () => {
      try {
        const data = await apiFetch(`/api/drimpay/status/${encodeURIComponent(transactionId)}`);
        if (data.status === 'success') {
          await refreshVipProfile();
          setStep('done');
        } else if (['failed', 'expired', 'cancelled', 'reversed'].includes(data.status)) {
          setStep('failed');
        }
      } catch { /* ignorer */ }
    }, 5000);
    return () => clearInterval(interval);
  }, [transactionId, step, refreshVipProfile]);

  async function submitPayment(confirmedNoCharge = false) {
    if (!selectedCountry) { toast.error('Sélectionnez votre pays.'); return; }
    if (!selectedOperator) { toast.error('Sélectionnez un opérateur.'); return; }
    if (!payerPhone.trim()) { toast.error('Entrez votre numéro de téléphone.'); return; }
    if (!activeCountry) { toast.error('Sélectionnez un pays disponible.'); return; }
    if (payerPhone.length !== activeCountry.nationalNumberLength) {
      toast.error(`Entrez les ${activeCountry.nationalNumberLength} chiffres du numéro local.`);
      return;
    }
    if (activeOperator?.requiresOtp && !otpCode.trim()) {
      toast.error('Entrez le code OTP demandé par Orange Money.');
      return;
    }

    setSubmitting(true);
    setPaymentStartError(null);
    setPaymentDiagnosticId('');
    try {
      if (!requestId.current) requestId.current = createPaymentRequestId();
      const res = await apiFetch('/api/drimpay/collect-vip', {
        method: 'POST',
        body: {
          requestId: requestId.current,
          amount: vipPrice,
          phone: payerPhone.trim(),
          operator: selectedOperator,
          countryCode: activeCountry.code,
          operatorOtp: otpCode.trim() || undefined,
          ...(confirmedNoCharge ? { confirmedNoCharge: true } : {}),
        },
      });
      requestId.current = '';

      if (res.requiresNoChargeConfirmation) {
        setStep('confirmRetry');
      } else if (res.status === 'success') {
        await refreshVipProfile();
        setStep('done');
      } else if (res.type === 'wave') {
        setTransactionId(res.transactionId);
        setPaymentDiagnosticId('');
        setWaveUrl(res.paymentUrl);
        setStep('wave');
      } else {
        setTransactionId(res.transactionId);
        setPaymentDiagnosticId(res.diagnosticId ?? '');
        setStep('waiting');
      }
    } catch (e: any) {
      if (e?.status && e.status < 500) requestId.current = '';
      const message = e?.diagnosticId
        ? `${e.message} (référence ${e.diagnosticId})`
        : e?.message ?? 'Erreur lors du paiement.';
      setPaymentStartError(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleContinue() {
    await submitPayment();
  }

  const returnToPaymentForm = () => {
    setTransactionId('');
    setWaveUrl('');
    setStep('form');
  };

  function reset() {
    setStep('form');
    setPaymentStartError(null);
    setSelectedOperator('');
    setPayerPhone('');
    setOtpCode('');
    setTransactionId('');
    setPaymentDiagnosticId('');
    setWaveUrl('');
    requestId.current = '';
  }

  return (
    <div className="min-h-screen bg-[#F4F6FB] pb-20 md:pb-6">
      <div className="bg-gradient-to-br from-[#1a2a5e] to-[#0f1a3e] p-6 pb-8">
        <div className="mb-2 flex items-center gap-3">
          <button
            onClick={() => setLocation('/profile')}
            aria-label="Retour au profil"
            className="text-white/70 hover:text-white"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-2xl font-bold text-white">{user?.isVip ? 'Renouveler VIP' : 'Devenir VIP'}</h1>
        </div>
        <p className="text-sm text-white/70">Accédez à des avantages exclusifs</p>
      </div>

      <div className="space-y-4 px-4 -mt-4">
        {step === 'form' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {paymentStartError && (
              <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="break-words">{paymentStartError}</span>
              </div>
            )}

            <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50">
              <CardContent className="p-5 text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
                  <Star className="h-7 w-7 fill-amber-400 text-amber-600" />
                </div>
                <p className="text-3xl font-bold text-amber-700">{vipPrice.toLocaleString()} XOF</p>
                <p className="mt-1 text-sm text-amber-600">Accès VIP pendant 30 jours, renouvelable</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <h2 className="mb-4 font-bold text-foreground">Avantages VIP</h2>
                <div className="space-y-3">
                  {VIP_BENEFITS.map((benefit, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <span className="text-xl">{benefit.icon}</span>
                      <span className="text-sm text-foreground">{benefit.text}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4 p-5">
                <div className="space-y-2">
                  <Label>Votre pays</Label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    value={selectedCountry}
                    onChange={e => {
                      setSelectedCountry(e.target.value);
                      setSelectedOperator('');
                      setPayerPhone('');
                      setOtpCode('');
                      setPaymentStartError(null);
                    }}
                  >
                    <option value="">{countriesLoading ? 'Chargement…' : 'Sélectionner un pays'}</option>
                    {countries.map(country => <option key={country.code} value={country.code}>{country.name}</option>)}
                  </select>
                </div>

                {selectedCountry && (
                  <div className="space-y-2">
                    <Label>Opérateur Mobile Money</Label>
                    {!activeCountry?.operators.length ? (
                      <p className="text-sm italic text-muted-foreground">Aucun opérateur disponible.</p>
                    ) : (
                      <div className="space-y-2">
                        {activeCountry.operators.map(op => (
                          <button
                            key={op.code}
                            type="button"
                            onClick={() => {
                              setSelectedOperator(op.code);
                              setOtpCode('');
                              setPaymentStartError(null);
                            }}
                            aria-pressed={selectedOperator === op.code}
                            className={`flex w-full items-center justify-between rounded-xl border-2 p-3 text-left transition-colors ${
                              selectedOperator === op.code ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                            }`}
                          >
                            <span className="text-sm font-semibold">{op.label}</span>
                            {selectedOperator === op.code && <Check className="h-4 w-4 shrink-0 text-primary" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {selectedOperator && activeCountry && (
                  <div className="space-y-2">
                    <Label>Numéro de téléphone</Label>
                    <div className="flex">
                      <span className="flex h-12 items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm font-semibold">
                        +{activeCountry.callingCode}
                      </span>
                      <Input
                        className="h-12 rounded-l-none text-base"
                        placeholder={`${activeCountry.nationalNumberLength} chiffres`}
                        value={payerPhone}
                        onChange={e => {
                          setPayerPhone(normalizeNationalPhoneInput(
                            e.target.value,
                            activeCountry.callingCode,
                            activeCountry.nationalNumberLength,
                          ));
                          setPaymentStartError(null);
                        }}
                        type="tel"
                        inputMode="numeric"
                        maxLength={activeCountry.nationalNumberLength}
                        required
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Entrez le numéro local uniquement, sans +{activeCountry.callingCode}.
                    </p>
                  </div>
                )}

                {activeOperator?.requiresOtp && (
                  <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm text-amber-900">{activeOperator.otpInstructions}</p>
                    <div className="space-y-2">
                      <Label>Code OTP Orange Money</Label>
                      <Input
                        value={otpCode}
                        onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                        inputMode="numeric"
                        placeholder="Code reçu après le code USSD"
                      />
                    </div>
                  </div>
                )}

                <Button
                  className="h-12 w-full"
                  onClick={handleContinue}
                  disabled={
                    submitting ||
                    !selectedCountry ||
                    !selectedOperator ||
                    !activeCountry ||
                    payerPhone.length !== activeCountry.nationalNumberLength ||
                    (Boolean(activeOperator?.requiresOtp) && !otpCode)
                  }
                >
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {user?.isVip ? 'Renouveler' : 'Payer'} {vipPrice.toLocaleString()} {activeCountry?.currency ?? 'XOF'}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 'wave' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardContent className="space-y-4 p-5 text-center">
                <p className="text-lg font-bold">Finaliser via Wave</p>
                <p className="text-sm text-muted-foreground">Cliquez ci-dessous pour ouvrir la page Wave.</p>
                <Button className="h-12 w-full" onClick={() => { window.open(waveUrl, '_blank', 'noopener,noreferrer'); setStep('waiting'); }}>
                  Ouvrir Wave
                </Button>
                <button onClick={() => setStep('waiting')} className="text-sm text-muted-foreground hover:text-foreground">
                  J'ai déjà payé, vérifier le statut
                </button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 'waiting' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardContent className="space-y-4 py-12 text-center">
                <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
                <p className="text-lg font-bold">Vérification en cours…</p>
                <p className="text-sm text-muted-foreground">Nous attendons la confirmation de votre paiement. Cette page se met à jour automatiquement.</p>
                <p className="text-sm font-medium text-amber-700">La confirmation du service mobile peut arriver avec un délai. Ne relancez pas le paiement pendant cette vérification.</p>
                {paymentDiagnosticId && (
                  <p className="break-all text-left text-xs text-muted-foreground">
                    Référence à transmettre au support : <strong>{paymentDiagnosticId}</strong>
                  </p>
                )}
                <Button variant="outline" onClick={returnToPaymentForm} className="w-full">
                  Je n’ai reçu aucune demande
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 'confirmRetry' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-amber-200">
              <CardContent className="space-y-4 p-5">
                <p className="text-lg font-bold text-amber-900">Vérifiez votre précédent paiement</p>
                <p className="text-sm text-gray-700">
                  Une ancienne tentative n’a pas reçu de référence DrimPay. Vérifiez le solde et l’historique de votre portefeuille mobile.
                  Ne relancez pas si un débit est visible ou si une demande est encore affichée.
                </p>
                <Button disabled={submitting} onClick={() => submitPayment(true)} className="h-12 w-full">
                  {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Vérification…</> : 'Je confirme qu’aucun débit n’a eu lieu'}
                </Button>
                <Button variant="outline" onClick={returnToPaymentForm} className="w-full">Annuler</Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 'done' && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="border-green-200 bg-green-50">
              <CardContent className="space-y-4 py-12 text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                  <CircleCheck className="h-10 w-10 text-green-600" />
                </div>
                <p className="text-2xl font-bold text-green-800">Félicitations !</p>
                <p className="text-sm text-green-700">
                  Votre accès VIP est actif pour 30 jours
                  {confirmedVipExpiresAt ? `, jusqu’au ${new Date(confirmedVipExpiresAt).toLocaleDateString('fr-FR')}` : ''}.
                  Vous pourrez le renouveler avant son expiration.
                </p>
                <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => setLocation('/')}>
                  Retour à l'accueil
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 'failed' && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="border-red-200 bg-red-50">
              <CardContent className="space-y-4 py-12 text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
                  <XCircle className="h-10 w-10 text-red-600" />
                </div>
                <p className="text-2xl font-bold text-red-800">Paiement échoué</p>
                <p className="text-sm text-red-700">Le paiement a échoué ou a expiré. Veuillez réessayer.</p>
                <Button variant="outline" onClick={reset} className="w-full border-red-300">
                  Réessayer
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
