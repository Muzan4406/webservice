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
  ArrowLeft, Check, Star, Loader2, Trophy, Ticket, Gift, ShieldCheck,
  Headphones, CircleCheck, TriangleAlert, XCircle, Smartphone,
} from 'lucide-react';
import { useLocation } from 'wouter';
import { createPaymentRequestId } from '@/lib/payment-request-id';

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
type DrimPayCountry = { code: string; name: string; currency: string; callingCode: string; operators: DrimPayOperator[] };

const VIP_BENEFITS = [
  { icon: <Trophy className="h-[18px] w-[18px]" />, text: 'Jeux virtuels FIFA (accès exclusif VIP)' },
  { icon: <Ticket className="h-[18px] w-[18px]" />, text: 'Coupon montante (gains progressifs)' },
  { icon: <Gift className="h-[18px] w-[18px]" />, text: 'Un coupon sûr offert chaque jour' },
  { icon: <Star className="h-[18px] w-[18px]" />, text: 'Accès aux concours VIP exclusifs' },
  { icon: <ShieldCheck className="h-[18px] w-[18px]" />, text: 'Badge Premium visible sur votre profil' },
  { icon: <Headphones className="h-[18px] w-[18px]" />, text: 'Priorité sur le service client' },
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
    if (activeOperator?.requiresOtp && !otpCode.trim()) {
      toast.error('Entrez le code OTP demandé par Orange Money.');
      return;
    }

    setSubmitting(true);
    setPaymentStartError(null);
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
        setWaveUrl(res.paymentUrl);
        setStep('wave');
      } else {
        setTransactionId(res.transactionId);
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
    setWaveUrl('');
    requestId.current = '';
  }

  return (
    <div className="min-h-[100dvh] bg-[#f3f6f8] pb-24 text-[#182e3a] md:pb-8">
      <header className="border-b border-[#dce5e8] bg-[#f8faf9]">
        <div className="mx-auto flex h-[60px] max-w-3xl items-center gap-3 px-4 sm:px-7">
          <button
            onClick={() => setLocation('/profile')}
            aria-label="Retour au profil"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#506772] transition hover:bg-[#eaf0f1] hover:text-[#183846] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#18745f]"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#71858c]">Muzan Service</p>
            <p className="truncate text-sm font-bold text-[#203c49]">Paiement VIP</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 rounded-full border border-[#dce8e3] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#386b5d]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Paiement sécurisé
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-8 pt-6 sm:px-7 sm:pt-9">
        {step === 'form' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-[620px]">
            <div className="mb-5">
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.15em] text-[#18745f]">
                {user?.isVip ? 'Votre abonnement' : 'Accès membre'}
              </p>
              <h1 className="text-[26px] font-extrabold leading-tight tracking-[-0.035em] text-[#183846] sm:text-[32px]">
                {user?.isVip ? 'Renouveler le VIP' : 'Activer votre VIP'}
              </h1>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-[#60747c]">
                Réglez par Mobile Money. Votre accès démarre dès la confirmation de l’opérateur.
              </p>
            </div>

            <section aria-label="Récapitulatif de l'offre" className="mb-4 overflow-hidden rounded-2xl border border-[#dce5e8] bg-white shadow-[0_3px_14px_rgba(24,56,70,0.045)]">
              <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#edf5f1] text-[#18745f]">
                    <Star className="h-[18px] w-[18px]" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#203c49]">Formule VIP</p>
                    <p className="mt-0.5 text-xs text-[#71858c]">Accès pendant 30 jours</p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-lg font-extrabold tracking-tight text-[#183846]">{vipPrice.toLocaleString()} <span className="text-xs font-bold tracking-normal text-[#64777e]">XOF</span></p>
                  <p className="text-[10px] font-medium text-[#71858c]">Prix fixe</p>
                </div>
              </div>
              <div className="flex items-start gap-2 border-t border-[#edf1f2] bg-[#f8faf9] px-4 py-2.5 text-[11px] leading-relaxed text-[#657980] sm:px-5">
                <Check className="mt-px h-3.5 w-3.5 shrink-0 text-[#18745f]" />
                Renouvelable à tout moment, y compris avant la fin de votre accès.
              </div>
            </section>

            <Card className="overflow-hidden rounded-2xl border-[#dce5e8] bg-white shadow-[0_5px_20px_rgba(24,56,70,0.055)]">
              <CardContent className="p-4 sm:p-6">
                <div className="mb-5 flex items-start gap-3 border-b border-[#edf1f2] pb-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#edf5f1] text-[#18745f]">
                    <Smartphone className="h-[17px] w-[17px]" />
                  </span>
                  <div>
                    <h2 className="text-base font-extrabold text-[#203c49]">Vos informations de paiement</h2>
                    <p className="mt-1 text-xs leading-relaxed text-[#71858c]">Sélectionnez le pays et le portefeuille à débiter.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {paymentStartError && (
                    <div
                      role="alert"
                      className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-left"
                    >
                      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-700" />
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold text-rose-900">Le paiement n’a pas démarré</p>
                        <p className="mt-1 break-words text-xs leading-relaxed text-rose-800">{paymentStartError}</p>
                      </div>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-[#405962]">Pays</Label>
                    <select
                      className="h-[50px] w-full appearance-none rounded-xl border border-[#d7e1e4] bg-[#fbfcfc] px-3.5 text-sm text-[#203c49] outline-none transition focus:border-[#27836c] focus:ring-4 focus:ring-[#27836c]/10"
                      value={selectedCountry}
                      onChange={e => { setSelectedCountry(e.target.value); setSelectedOperator(''); setOtpCode(''); setPaymentStartError(null); }}
                    >
                      <option value="">{countriesLoading ? 'Chargement des pays…' : 'Choisir un pays'}</option>
                      {countries.map(country => <option key={country.code} value={country.code}>{country.name}</option>)}
                    </select>
                  </div>

                  {selectedCountry && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-[#405962]">Opérateur Mobile Money</Label>
                      {!activeCountry?.operators.length ? (
                        <p className="rounded-xl border border-[#e4eaec] bg-[#f8faf9] px-3.5 py-3 text-sm text-[#71858c]">Aucun opérateur disponible.</p>
                      ) : (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {activeCountry.operators.map(op => (
                            <button
                              key={op.code}
                              type="button"
                              onClick={() => { setSelectedOperator(op.code); setOtpCode(''); setPaymentStartError(null); }}
                              aria-pressed={selectedOperator === op.code}
                              className={`flex min-h-[50px] items-center justify-between rounded-xl border px-3.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#27836c] ${
                                selectedOperator === op.code
                                  ? 'border-[#27836c] bg-[#f0f7f3] text-[#205b4b]'
                                  : 'border-[#dce5e8] bg-white text-[#405962] hover:border-[#afc7bf] hover:bg-[#fbfcfc]'
                              }`}
                            >
                              <span className="text-sm font-bold">{op.label}</span>
                              {selectedOperator === op.code && <Check className="h-4 w-4 shrink-0 text-[#18745f]" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {selectedOperator && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-[#405962]">Numéro de téléphone (format international)</Label>
                      <Input
                        className="h-[50px] rounded-xl border-[#d7e1e4] bg-[#fbfcfc] px-3.5 text-base focus-visible:ring-[#27836c]/20"
                        placeholder={`Ex: +${activeCountry?.callingCode}90000000`}
                        value={payerPhone}
                        onChange={e => { setPayerPhone(e.target.value); setPaymentStartError(null); }}
                        type="tel"
                        required
                      />
                    </div>
                  )}

                  {activeOperator?.requiresOtp && (
                    <div className="space-y-3 rounded-xl border border-[#eadfbd] bg-[#fbf8ef] p-3.5">
                      <p className="text-xs leading-relaxed text-[#675a36]">{activeOperator.otpInstructions}</p>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-[#514626]">Code OTP Orange Money</Label>
                        <Input
                          className="h-[50px] rounded-xl border-[#e1d6b5] bg-white text-base"
                          value={otpCode}
                          onChange={e => { setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 8)); setPaymentStartError(null); }}
                          inputMode="numeric"
                          placeholder="Code reçu après le code USSD"
                        />
                      </div>
                    </div>
                  )}

                  <div className="border-t border-[#edf1f2] pt-4">
                    <div className="mb-3 flex items-center justify-between text-xs">
                      <span className="text-[#71858c]">Total à payer</span>
                      <span className="font-extrabold text-[#203c49]">{vipPrice.toLocaleString()} {activeCountry?.currency ?? 'XOF'}</span>
                    </div>
                    <Button
                      className="h-[50px] w-full rounded-xl bg-[#176c58] text-sm font-extrabold shadow-[0_3px_8px_rgba(23,108,88,0.16)] hover:bg-[#125b49] disabled:bg-[#aebdb8] disabled:text-white"
                      onClick={handleContinue}
                      disabled={submitting || !selectedCountry || !selectedOperator || !payerPhone.trim() || (Boolean(activeOperator?.requiresOtp) && !otpCode)}
                    >
                      {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                      {submitting ? 'Connexion à l’opérateur…' : `${user?.isVip ? 'Renouveler' : 'Payer et activer'} — ${vipPrice.toLocaleString()} ${activeCountry?.currency ?? 'XOF'}`}
                    </Button>
                    <p className="mt-3 text-center text-[11px] leading-relaxed text-[#71858c]">
                      Une demande de confirmation apparaîtra sur votre téléphone. Ne la validez qu’après avoir vérifié le montant.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <section className="mt-5 rounded-2xl border border-[#dce5e8] bg-[#f8faf9] px-4 py-4 sm:px-5">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-extrabold text-[#294550]">Inclus avec le VIP</h2>
                  <p className="mt-0.5 text-[11px] text-[#71858c]">Vos avantages pendant 30 jours</p>
                </div>
                <Star className="h-4 w-4 text-[#718d80]" />
              </div>
              <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
                {VIP_BENEFITS.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-2.5 py-1">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white text-[#397663]">{benefit.icon}</span>
                    <span className="text-xs leading-relaxed text-[#526a72]">{benefit.text}</span>
                  </div>
                ))}
              </div>
            </section>
          </motion.div>
        )}

        {step === 'wave' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-[520px] pt-4">
            <Card className="rounded-2xl border-[#dce5e8] bg-white shadow-[0_5px_20px_rgba(24,56,70,0.055)]">
              <CardContent className="space-y-4 p-5 text-center sm:p-8">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#edf5f1] text-[#18745f]"><Smartphone className="h-5 w-5" /></div>
                <div><p className="text-lg font-extrabold text-[#203c49]">Finaliser via Wave</p><p className="mt-1 text-sm leading-relaxed text-[#64777e]">Ouvrez la page Wave pour confirmer votre paiement.</p></div>
                <Button className="h-12 w-full rounded-xl bg-[#176c58] font-bold hover:bg-[#125b49]" onClick={() => { window.open(waveUrl, '_blank', 'noopener,noreferrer'); setStep('waiting'); }}>
                  Ouvrir Wave
                </Button>
                <button onClick={() => setStep('waiting')} className="min-h-10 px-3 text-sm font-semibold text-[#526a72] underline-offset-4 hover:text-[#183846] hover:underline">
                  J'ai déjà payé, vérifier le statut
                </button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 'waiting' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-[520px] pt-4">
            <Card className="rounded-2xl border-[#dce5e8] bg-white shadow-[0_5px_20px_rgba(24,56,70,0.055)]">
              <CardContent className="space-y-4 p-5 text-center sm:p-8">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#edf5f1]"><Loader2 className="h-6 w-6 animate-spin text-[#18745f]" /></div>
                <div><p className="text-lg font-extrabold text-[#203c49]">Confirmation en attente</p><p className="mt-1 text-sm leading-relaxed text-[#64777e]">Nous attendons la confirmation de votre paiement. Cette page se met à jour automatiquement.</p></div>
                <p className="rounded-xl border border-[#eadfbd] bg-[#fbf8ef] p-3.5 text-left text-xs leading-relaxed text-[#675a36]">La confirmation du service mobile peut arriver avec un délai. Ne relancez pas le paiement pendant cette vérification.</p>
                <Button variant="outline" onClick={returnToPaymentForm} className="h-11 w-full rounded-xl border-[#d2dddf] text-[#405962]">
                  Je n’ai reçu aucune demande
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 'confirmRetry' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-[520px] pt-4">
            <Card className="rounded-2xl border-[#eadfbd] bg-white shadow-[0_5px_20px_rgba(24,56,70,0.055)]">
              <CardContent className="space-y-4 p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#fbf4df] text-[#8a6a23]"><TriangleAlert className="h-[18px] w-[18px]" /></span>
                  <div><p className="text-base font-extrabold text-[#3e493c]">Vérifiez votre précédent paiement</p><p className="mt-1 text-sm leading-relaxed text-[#64777e]">Une ancienne tentative n’a pas reçu de référence DrimPay. Vérifiez le solde et l’historique de votre portefeuille mobile. Ne relancez pas si un débit est visible ou si une demande de paiement est encore affichée.</p></div>
                </div>
                <Button disabled={submitting} onClick={() => submitPayment(true)} className="h-12 w-full rounded-xl bg-[#176c58] font-bold hover:bg-[#125b49]">
                  {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Vérification…</> : 'Je confirme qu’aucun débit n’a eu lieu'}
                </Button>
                <Button variant="outline" onClick={returnToPaymentForm} className="h-11 w-full rounded-xl border-[#d2dddf]">Annuler</Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 'done' && (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="mx-auto max-w-[520px] pt-4">
            <Card className="rounded-2xl border-[#cfe3d8] bg-[#f3faf6] shadow-[0_5px_20px_rgba(24,56,70,0.055)]">
              <CardContent className="space-y-4 p-5 text-center sm:p-8">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e0f0e7] text-[#247451]"><CircleCheck className="h-8 w-8" /></div>
                <div><p className="text-xl font-extrabold text-[#234a38]">Paiement confirmé</p><p className="mt-2 text-sm leading-relaxed text-[#4d705d]">
                  Votre accès VIP est actif pour 30 jours
                  {confirmedVipExpiresAt ? `, jusqu’au ${new Date(confirmedVipExpiresAt).toLocaleDateString('fr-FR')}` : ''}.
                  Vous pourrez le renouveler avant son expiration.
                </p></div>
                <Button className="h-12 w-full rounded-xl bg-[#247451] font-bold hover:bg-[#1b6142]" onClick={() => setLocation('/')}>
                  Retour à l'accueil
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 'failed' && (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="mx-auto max-w-[520px] pt-4">
            <Card className="rounded-2xl border-[#ecd6d2] bg-[#fff8f6] shadow-[0_5px_20px_rgba(24,56,70,0.055)]">
              <CardContent className="space-y-4 p-5 text-center sm:p-8">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f8e8e4] text-[#a54b3d]"><XCircle className="h-8 w-8" /></div>
                <div><p className="text-xl font-extrabold text-[#703d36]">Paiement échoué</p><p className="mt-2 text-sm leading-relaxed text-[#805d57]">Le paiement a échoué ou a expiré. Veuillez réessayer.</p></div>
                <Button variant="outline" onClick={reset} className="h-11 w-full rounded-xl border-[#dfbeb8] text-[#8c463b] hover:bg-[#fdf0ed]">
                  Réessayer
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
