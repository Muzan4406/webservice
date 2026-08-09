import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  useGetAppSettings,
} from '@workspace/api-client-react';
import { useAuth } from '@/contexts/AuthContext';
import { BottomNav } from '@/components/BottomNav';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/lib/toast';
import { ArrowLeft, Check, Star, Loader2 } from 'lucide-react';
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
  if (!res.ok) throw new Error(data.error ?? 'Erreur réseau');
  return data;
}

const COUNTRIES = ['Togo','Bénin',"Côte d'Ivoire",'Burkina Faso','Cameroun','Congo démocratique','Congo Brazzaville','Sénégal','Mali','Niger'];
const COUNTRY_CODES: Record<string, string> = {
  'Togo': 'TG', 'Bénin': 'BJ', "Côte d'Ivoire": 'CI',
  'Burkina Faso': 'BF', 'Cameroun': 'CM', 'Congo démocratique': 'CD',
  'Congo Brazzaville': 'CG', 'Sénégal': 'SN', 'Mali': 'ML', 'Niger': 'NE',
};
const COUNTRY_CURRENCIES: Record<string, string> = {
  'Togo': 'XOF', 'Bénin': 'XOF', "Côte d'Ivoire": 'XOF',
  'Burkina Faso': 'XOF', 'Cameroun': 'XAF', 'Congo démocratique': 'CDF',
  'Congo Brazzaville': 'XAF', 'Sénégal': 'XOF', 'Mali': 'XOF', 'Niger': 'XOF',
};

const VIP_BENEFITS = [
  { icon: '⚽', text: 'Jeux virtuels FIFA (accès exclusif VIP)' },
  { icon: '📈', text: 'Coupon montante (gains progressifs)' },
  { icon: '🎁', text: 'Un coupon sûr offert chaque jour' },
  { icon: '🏆', text: 'Accès aux concours VIP exclusifs' },
  { icon: '⭐', text: 'Badge Premium visible sur votre profil' },
  { icon: '🎧', text: 'Priorité sur le service client' },
];

type Step = 'form' | 'otp' | 'wave' | 'waiting' | 'done' | 'failed';

export default function VipPurchasePage() {
  const [, setLocation] = useLocation();
  const { user, updateUser } = useAuth() as any;
  const { data: appSettings } = useGetAppSettings();
  const vipPrice = appSettings?.vipPriceFcfa ? Number(appSettings.vipPriceFcfa) : 5000;

  const [step, setStep] = useState<Step>('form');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedOperator, setSelectedOperator] = useState('');
  const [payerPhone, setPayerPhone] = useState('');
  const [countryOperators, setCountryOperators] = useState<string[]>([]);
  const [loadingOperators, setLoadingOperators] = useState(false);
  const [transactionId, setTransactionId] = useState('');
  const [waveUrl, setWaveUrl] = useState('');
  const [otpRef, setOtpRef] = useState('');
  const [otpUssdCode, setOtpUssdCode] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittingOtp, setSubmittingOtp] = useState(false);
  const [collectParams, setCollectParams] = useState<any>(null);
  const [externalRef, setExternalRef] = useState('');

  // Charger les opérateurs quand le pays change
  useEffect(() => {
    if (!selectedCountry) { setCountryOperators([]); setSelectedOperator(''); return; }
    const code = COUNTRY_CODES[selectedCountry];
    if (!code) return;
    setLoadingOperators(true);
    setSelectedOperator('');
    apiFetch('/api/ashtechpay/countries')
      .then((countries: any[]) => {
        const found = countries.find((c: any) => c.code === code);
        setCountryOperators(found?.operators ?? []);
      })
      .catch(() => setCountryOperators([]))
      .finally(() => setLoadingOperators(false));
  }, [selectedCountry]);

  // Polling statut
  useEffect(() => {
    if (!transactionId || step !== 'waiting') return;
    const interval = setInterval(async () => {
      try {
        const data = await apiFetch(`/api/ashtechpay/status/${transactionId}`);
        if (data.status === 'success') {
          if (user && !user.isVip && updateUser) updateUser({ ...user, isVip: true });
          setStep('done');
        } else if (data.status === 'failed') {
          setStep('failed');
        }
      } catch { /* ignorer */ }
    }, 5000);
    return () => clearInterval(interval);
  }, [transactionId, step]);

  async function handleContinue() {
    if (!selectedCountry) { toast.error('Sélectionnez votre pays.'); return; }
    if (!selectedOperator) { toast.error('Sélectionnez un opérateur.'); return; }
    if (!payerPhone.trim()) { toast.error('Entrez votre numéro de téléphone.'); return; }

    setSubmitting(true);
    try {
      const currency = COUNTRY_CURRENCIES[selectedCountry] ?? 'XOF';
      const countryCode = COUNTRY_CODES[selectedCountry] ?? '';
      const res = await apiFetch('/api/ashtechpay/collect-vip', {
        method: 'POST',
        body: {
          phone: payerPhone.trim(),
          operator: selectedOperator,
          countryCode,
          currency,
        },
      });

      if (res.type === 'otp') {
        setCollectParams(res.collectParams);
        setExternalRef(res.externalRef);
        setOtpRef(res.reference);
        setOtpUssdCode(res.ussdCode);
        setStep('otp');
      } else if (res.type === 'wave') {
        setTransactionId(res.transactionId);
        setWaveUrl(res.waveUrl);
        setStep('wave');
      } else {
        setTransactionId(res.transactionId);
        setStep('waiting');
      }
    } catch (e: any) {
      toast.error(e?.message ?? 'Erreur lors du paiement.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleOtp() {
    if (!otpCode.trim()) { toast.error('Entrez le code OTP.'); return; }
    setSubmittingOtp(true);
    try {
      const res = await apiFetch('/api/ashtechpay/submit-otp-vip', {
        method: 'POST',
        body: {
          reference: otpRef,
          otp: otpCode.trim(),
          collectParams,
          externalRef,
        },
      });
      setTransactionId(res.transactionId);
      setStep('waiting');
    } catch (e: any) {
      toast.error(e?.message ?? 'Code OTP incorrect.');
    } finally {
      setSubmittingOtp(false);
    }
  }

  function reset() {
    setStep('form');
    setSelectedOperator('');
    setPayerPhone('');
    setOtpCode('');
    setTransactionId('');
    setWaveUrl('');
    setOtpRef('');
    setOtpUssdCode(null);
    setCollectParams(null);
    setExternalRef('');
  }

  return (
    <div className="min-h-screen bg-[#F4F6FB] pb-20 md:pb-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#1a2a5e] to-[#0f1a3e] p-6 pb-8">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => setLocation('/profile')} className="text-white/70 hover:text-white">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold text-white">Devenir VIP</h1>
        </div>
        <p className="text-white/60 text-sm">Accédez à des avantages exclusifs</p>
      </div>

      <div className="px-4 -mt-4 space-y-4">

        {/* Step: Form */}
        {step === 'form' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Price card */}
            <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50">
              <CardContent className="p-5 text-center">
                <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3">
                  <Star className="w-7 h-7 text-amber-600 fill-amber-400" />
                </div>
                <p className="text-3xl font-bold text-amber-700">{vipPrice.toLocaleString()} XOF</p>
                <p className="text-sm text-amber-600 mt-1">Paiement unique — accès à vie</p>
              </CardContent>
            </Card>

            {/* Benefits */}
            <Card>
              <CardContent className="p-5">
                <h3 className="font-bold text-foreground mb-4">Avantages VIP</h3>
                <div className="space-y-3">
                  {VIP_BENEFITS.map((b, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xl">{b.icon}</span>
                      <span className="text-sm text-foreground">{b.text}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Payment form */}
            <Card>
              <CardContent className="p-5 space-y-4">
                {/* Country */}
                <div className="space-y-2">
                  <Label>Votre pays</Label>
                  <select
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    value={selectedCountry}
                    onChange={e => setSelectedCountry(e.target.value)}
                  >
                    <option value="">Sélectionner un pays</option>
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Operators */}
                {selectedCountry && (
                  <div className="space-y-2">
                    <Label>Opérateur Mobile Money</Label>
                    {loadingOperators ? (
                      <div className="flex justify-center py-3">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      </div>
                    ) : countryOperators.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">Aucun opérateur disponible.</p>
                    ) : (
                      <div className="space-y-2">
                        {countryOperators.map(op => (
                          <button
                            key={op}
                            type="button"
                            onClick={() => setSelectedOperator(op)}
                            className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-colors text-left ${
                              selectedOperator === op ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                            }`}
                          >
                            <span className="font-semibold text-sm">{op}</span>
                            {selectedOperator === op && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Phone */}
                {selectedOperator && (
                  <div className="space-y-2">
                    <Label>Numéro de téléphone</Label>
                    <Input
                      placeholder="Ex: 90000000"
                      value={payerPhone}
                      onChange={e => setPayerPhone(e.target.value)}
                      type="tel"
                    />
                  </div>
                )}

                <Button
                  className="w-full h-12"
                  onClick={handleContinue}
                  disabled={submitting || !selectedCountry || !selectedOperator || !payerPhone.trim()}
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Payer {vipPrice.toLocaleString()} {selectedCountry ? (COUNTRY_CURRENCIES[selectedCountry] ?? 'XOF') : 'XOF'}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step: OTP */}
        {step === 'otp' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardContent className="p-5 space-y-4">
                <div className="text-center mb-2">
                  <p className="text-lg font-bold">Code de confirmation</p>
                  {otpUssdCode ? (
                    <div className="mt-2 space-y-2">
                      <p className="text-sm text-muted-foreground">Composez ce code USSD sur votre téléphone :</p>
                      <div className="bg-primary/10 rounded-lg p-3 inline-block">
                        <code className="text-primary font-bold text-base">{otpUssdCode}</code>
                      </div>
                      <p className="text-sm text-muted-foreground">Puis entrez le code reçu ci-dessous.</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Entrez le code OTP reçu par SMS</p>
                  )}
                </div>
                <Input
                  placeholder="Code OTP"
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value)}
                  className="text-center text-lg tracking-widest"
                />
                <Button className="w-full h-12" onClick={handleOtp} disabled={submittingOtp || !otpCode.trim()}>
                  {submittingOtp ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Valider le code
                </Button>
                <button onClick={reset} className="w-full text-center text-sm text-muted-foreground hover:text-foreground py-1">
                  ← Recommencer
                </button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step: Wave */}
        {step === 'wave' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardContent className="p-5 text-center space-y-4">
                <p className="text-lg font-bold">Finaliser via Wave</p>
                <p className="text-sm text-muted-foreground">Cliquez ci-dessous pour ouvrir la page Wave.</p>
                <Button className="w-full h-12" onClick={() => { window.open(waveUrl, '_blank'); setStep('waiting'); }}>
                  Ouvrir Wave
                </Button>
                <button onClick={() => setStep('waiting')} className="text-sm text-muted-foreground hover:text-foreground">
                  J'ai déjà payé, vérifier le statut
                </button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step: Waiting */}
        {step === 'waiting' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardContent className="py-16 text-center space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
                <p className="text-lg font-bold">Vérification en cours…</p>
                <p className="text-sm text-muted-foreground">Nous attendons la confirmation de votre paiement. Cette page se met à jour automatiquement.</p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step: Done */}
        {step === 'done' && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="border-green-200 bg-green-50">
              <CardContent className="py-12 text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                  <Check className="w-10 h-10 text-green-600" />
                </div>
                <p className="text-2xl font-bold text-green-800">Félicitations ! 🎉</p>
                <p className="text-sm text-green-700">Vous êtes maintenant membre VIP. Profitez de tous vos avantages dès maintenant.</p>
                <Button className="bg-green-600 hover:bg-green-700 w-full" onClick={() => setLocation('/')}>
                  Retour à l'accueil
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step: Failed */}
        {step === 'failed' && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="border-red-200 bg-red-50">
              <CardContent className="py-12 text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                  <span className="text-4xl">❌</span>
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
