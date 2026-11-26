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
  const data = await res.json();
  if (!res.ok) {
    const error = new Error(data.error ?? 'Erreur réseau') as Error & { status?: number };
    error.status = res.status;
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
    try {
      if (!requestId.current) requestId.current = crypto.randomUUID();
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
      toast.error(e?.message ?? 'Erreur lors du paiement.');
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
    setSelectedOperator('');
    setPayerPhone('');
    setOtpCode('');
    setTransactionId('');
    setWaveUrl('');
    requestId.current = '';
  }

  return (
    <div className="min-h-[100dvh] bg-[#f3f5fa] pb-24 md:pb-8">
      <header className="relative overflow-hidden bg-gradient-to-br from-[#1a2a5e] via-[#19285a] to-[#111c42] px-4 pb-9 pt-8 text-white sm:px-8 sm:pb-12">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full border border-white/[0.08]" />
        <div className="relative mx-auto max-w-5xl">
          <button
            onClick={() => setLocation('/profile')}
            aria-label="Retour au profil"
            className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/[0.07] text-white/80 transition hover:bg-white/15 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-white/50">Muzan Service</p>
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{user?.isVip ? 'Renouveler le VIP' : 'Devenir VIP'}</h1>
              <p className="mt-2 text-sm text-white/65">Accédez à des avantages exclusifs</p>
            </div>
            <div className="hidden h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.07] sm:flex">
              <Star className="h-7 w-7 fill-[#f4c64e] text-[#f4c64e]" />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto -mt-4 max-w-5xl px-4 sm:px-8">
        {step === 'form' && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="grid items-start gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-4">
              <Card className="overflow-hidden border-amber-200/80 bg-gradient-to-br from-[#fff8e8] to-[#fff2d5] shadow-sm">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                      <Star className="h-6 w-6 fill-amber-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-800/70">Accès 30 jours</p>
                      <p className="mt-0.5 text-2xl font-extrabold tracking-tight text-[#59420d] sm:text-3xl">{vipPrice.toLocaleString()} XOF</p>
                    </div>
                  </div>
                  <p className="mt-4 border-t border-amber-200/70 pt-3 text-xs leading-relaxed text-amber-900/75">Renouvelable à tout moment, y compris avant la fin de votre accès.</p>
                </CardContent>
              </Card>

              <Card className="border-slate-200/80 shadow-sm">
                <CardContent className="p-5 sm:p-6">
                  <h2 className="text-base font-extrabold text-slate-900">Avantages VIP</h2>
                  <p className="mt-1 text-xs text-slate-500">Les avantages inclus avec votre accès</p>
                  <div className="mt-4 space-y-1">
                    {VIP_BENEFITS.map((benefit, index) => (
                      <div key={index} className="flex min-h-11 items-center gap-3 rounded-xl px-2 py-2">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#eef1fa] text-[#1a2a5e]">{benefit.icon}</span>
                        <span className="text-sm leading-snug text-slate-700">{benefit.text}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-slate-200/80 shadow-sm">
              <CardContent className="space-y-5 p-5 sm:p-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#eef1fa] text-[#1a2a5e]"><Smartphone className="h-4 w-4" /></span>
                    <h2 className="text-base font-extrabold text-slate-900">Paiement Mobile Money</h2>
                  </div>
                  <p className="mt-2 pl-10 text-xs leading-relaxed text-slate-500">Choisissez votre pays et votre opérateur pour continuer.</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">Votre pays</Label>
                  <select
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm outline-none transition focus:border-[#1a2a5e]/50 focus:ring-2 focus:ring-[#1a2a5e]/10"
                    value={selectedCountry}
                    onChange={e => { setSelectedCountry(e.target.value); setSelectedOperator(''); setOtpCode(''); }}
                  >
                    <option value="">{countriesLoading ? 'Chargement…' : 'Sélectionner un pays'}</option>
                    {countries.map(country => <option key={country.code} value={country.code}>{country.name}</option>)}
                  </select>
                </div>

                {selectedCountry && (
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700">Opérateur Mobile Money</Label>
                    {!activeCountry?.operators.length ? (
                      <p className="rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-500">Aucun opérateur disponible.</p>
                    ) : (
                      <div className="space-y-2">
                        {activeCountry.operators.map(op => (
                          <button
                            key={op.code}
                            type="button"
                            onClick={() => { setSelectedOperator(op.code); setOtpCode(''); }}
                            className={`flex min-h-12 w-full items-center justify-between rounded-xl border px-3.5 py-3 text-left transition ${
                              selectedOperator === op.code
                                ? 'border-[#1a2a5e] bg-[#f1f3fa] text-[#1a2a5e] shadow-sm'
                                : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            <span className="text-sm font-semibold">{op.label}</span>
                            {selectedOperator === op.code && <Check className="h-4 w-4 shrink-0" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {selectedOperator && (
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700">Numéro de téléphone au format international</Label>
                    <Input
                      className="h-12 rounded-xl border-slate-200 text-base"
                      placeholder={`Ex: +${activeCountry?.callingCode}90000000`}
                      value={payerPhone}
                      onChange={e => setPayerPhone(e.target.value)}
                      type="tel"
                      required
                    />
                  </div>
                )}

                {activeOperator?.requiresOtp && (
                  <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/80 p-4">
                    <p className="text-sm leading-relaxed text-amber-950">{activeOperator.otpInstructions}</p>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-amber-950">Code OTP Orange Money</Label>
                      <Input
                        className="h-12 rounded-xl border-amber-200 bg-white text-base"
                        value={otpCode}
                        onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                        inputMode="numeric"
                        placeholder="Code reçu après le code USSD"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2 pt-1">
                  <Button
                    className="h-12 w-full rounded-xl bg-[#1a2a5e] font-bold shadow-sm hover:bg-[#23366e]"
                    onClick={handleContinue}
                    disabled={submitting || !selectedCountry || !selectedOperator || !payerPhone.trim() || (Boolean(activeOperator?.requiresOtp) && !otpCode)}
                  >
                    {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {user?.isVip ? 'Renouveler' : 'Activer'} pour {vipPrice.toLocaleString()} {activeCountry?.currency ?? 'XOF'}
                  </Button>
                  <p className="text-center text-[11px] leading-relaxed text-slate-500">Votre accès est activé après confirmation du paiement.</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 'wave' && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-xl">
            <Card className="border-slate-200/80 shadow-sm">
              <CardContent className="space-y-4 p-6 text-center sm:p-8">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eef1fa] text-[#1a2a5e]"><Smartphone className="h-6 w-6" /></div>
                <div><p className="text-lg font-extrabold text-slate-900">Finaliser via Wave</p><p className="mt-1 text-sm text-slate-500">Cliquez ci-dessous pour ouvrir la page Wave.</p></div>
                <Button className="h-12 w-full rounded-xl bg-[#1a2a5e] font-bold hover:bg-[#23366e]" onClick={() => { window.open(waveUrl, '_blank', 'noopener,noreferrer'); setStep('waiting'); }}>
                  Ouvrir Wave
                </Button>
                <button onClick={() => setStep('waiting')} className="min-h-10 px-3 text-sm font-semibold text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline">
                  J'ai déjà payé, vérifier le statut
                </button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 'waiting' && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-xl">
            <Card className="border-slate-200/80 shadow-sm">
              <CardContent className="space-y-4 p-6 text-center sm:p-9">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eef1fa]"><Loader2 className="h-7 w-7 animate-spin text-[#1a2a5e]" /></div>
                <p className="text-lg font-extrabold text-slate-900">Vérification en cours…</p>
                <p className="text-sm leading-relaxed text-slate-600">Nous attendons la confirmation de votre paiement. Cette page se met à jour automatiquement.</p>
                <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-left text-sm leading-relaxed text-amber-900">La confirmation du service mobile peut arriver avec un délai. Ne relancez pas le paiement pendant cette vérification.</p>
                <Button variant="outline" onClick={returnToPaymentForm} className="h-11 w-full rounded-xl border-slate-300">
                  Je n’ai reçu aucune demande
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 'confirmRetry' && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-xl">
            <Card className="border-amber-200 shadow-sm">
              <CardContent className="space-y-4 p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800"><TriangleAlert className="h-5 w-5" /></span>
                  <div><p className="text-base font-extrabold text-amber-950">Vérifiez votre précédent paiement</p><p className="mt-1 text-sm leading-relaxed text-slate-600">Une ancienne tentative n’a pas reçu de référence DrimPay. Vérifiez le solde et l’historique de votre portefeuille mobile. Ne relancez pas si un débit est visible ou si une demande de paiement est encore affichée.</p></div>
                </div>
                <Button disabled={submitting} onClick={() => submitPayment(true)} className="h-12 w-full rounded-xl bg-[#1a2a5e] font-bold hover:bg-[#23366e]">
                  {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Vérification…</> : 'Je confirme qu’aucun débit n’a eu lieu'}
                </Button>
                <Button variant="outline" onClick={returnToPaymentForm} className="h-11 w-full rounded-xl">Annuler</Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 'done' && (
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="mx-auto max-w-xl">
            <Card className="border-emerald-200 bg-emerald-50/80 shadow-sm">
              <CardContent className="space-y-4 p-6 text-center sm:p-9">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"><CircleCheck className="h-9 w-9" /></div>
                <p className="text-2xl font-extrabold text-emerald-950">Paiement confirmé</p>
                <p className="text-sm leading-relaxed text-emerald-900">
                  Votre accès VIP est actif pour 30 jours
                  {confirmedVipExpiresAt ? `, jusqu’au ${new Date(confirmedVipExpiresAt).toLocaleDateString('fr-FR')}` : ''}.
                  Vous pourrez le renouveler avant son expiration.
                </p>
                <Button className="h-12 w-full rounded-xl bg-emerald-700 font-bold hover:bg-emerald-800" onClick={() => setLocation('/')}>
                  Retour à l'accueil
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 'failed' && (
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="mx-auto max-w-xl">
            <Card className="border-rose-200 bg-rose-50/80 shadow-sm">
              <CardContent className="space-y-4 p-6 text-center sm:p-9">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-700"><XCircle className="h-9 w-9" /></div>
                <p className="text-2xl font-extrabold text-rose-950">Paiement échoué</p>
                <p className="text-sm leading-relaxed text-rose-900">Le paiement a échoué ou a expiré. Veuillez réessayer.</p>
                <Button variant="outline" onClick={reset} className="h-11 w-full rounded-xl border-rose-300 text-rose-800 hover:bg-rose-100">
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
