import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  useGetAppSettings,
  useGetSendavapayOperators,
  useCreateVipPayment,
  useInitiateSendavapayPayment,
  useSubmitPaymentOtp,
  useGetSendavapayPaymentStatus,
} from '@workspace/api-client-react';
import { useAuth } from '@/contexts/AuthContext';
import { BottomNav } from '@/components/BottomNav';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, Check, Star, Loader2 } from 'lucide-react';
import { useLocation } from 'wouter';

const COUNTRIES = ['Togo','Bénin',"Côte d'Ivoire",'Burkina Faso','Cameroun','Congo démocratique','Congo Brazzaville'];
const COUNTRY_CODES: Record<string, string> = {
  'Togo': 'TG', 'Bénin': 'BJ', "Côte d'Ivoire": 'CI',
  'Burkina Faso': 'BF', 'Cameroun': 'CM', 'Congo démocratique': 'CD', 'Congo Brazzaville': 'CG',
};

const VIP_BENEFITS = [
  { icon: '⚽', text: 'Jeux virtuels FIFA (accès exclusif VIP)' },
  { icon: '📈', text: 'Coupon montante (gains progressifs)' },
  { icon: '🎁', text: 'Un coupon sûr offert chaque jour' },
  { icon: '🏆', text: 'Accès aux concours VIP exclusifs' },
  { icon: '⭐', text: 'Badge Premium visible sur votre profil' },
  { icon: '🎧', text: 'Priorité sur le service client' },
];

type Step = 'form' | 'operators' | 'otp' | 'redirect' | 'waiting' | 'done' | 'failed';

export default function VipPurchasePage() {
  const [, setLocation] = useLocation();
  const { user, updateUser } = useAuth() as any;
  const { data: appSettings } = useGetAppSettings();
  const vipPrice = appSettings?.vipPriceFcfa ? Number(appSettings.vipPriceFcfa) : 5000;

  const [step, setStep] = useState<Step>('form');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedOperator, setSelectedOperator] = useState<any>(null);
  const [payerPhone, setPayerPhone] = useState('');
  const [paymentToken, setPaymentToken] = useState('');
  const [spReference, setSpReference] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [redirectUrl, setRedirectUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const countryCode = COUNTRY_CODES[selectedCountry] ?? '';
  const { data: operatorsData, isLoading: loadingOperators } = useGetSendavapayOperators(
    countryCode || '_',
    { query: { enabled: !!countryCode && step === 'operators' } }
  );
  const operators: any[] = (operatorsData as any)?.operators ?? [];

  const { mutateAsync: createVipPayment, isPending: creatingPayment } = useCreateVipPayment();
  const { mutateAsync: initiatePayment, isPending: initiating } = useInitiateSendavapayPayment();
  const { mutateAsync: submitOtp, isPending: submittingOtp } = useSubmitPaymentOtp();

  const { data: statusData } = useGetSendavapayPaymentStatus(
    spReference || '_',
    { query: { enabled: !!spReference && step === 'waiting', refetchInterval: 5000 } }
  );

  useEffect(() => {
    if (!statusData) return;
    const s = (statusData as any)?.status;
    if (s === 'completed') {
      if (user && !user.isVip && updateUser) updateUser({ ...user, isVip: true });
      setStep('done');
    } else if (s === 'failed' || s === 'expired') {
      setStep('failed');
    }
  }, [statusData]);

  async function handleContinue() {
    if (!selectedCountry) { toast.error('Sélectionnez votre pays.'); return; }
    try {
      const res: any = await createVipPayment({ data: {} });
      setPaymentToken(res.paymentToken);
      setStep('operators');
    } catch (e: any) {
      toast.error(e?.data?.error ?? 'Erreur lors de la création du paiement.');
    }
  }

  async function handleSelectOperator(op: any) {
    setSelectedOperator(op);
  }

  async function handleInitiate() {
    if (!payerPhone.trim()) { toast.error('Entrez votre numéro de téléphone.'); return; }
    try {
      const res: any = await initiatePayment({
        data: { paymentToken, operatorCode: selectedOperator.code, payerPhone, countryCode },
      });
      if (res.redirectUrl) { setRedirectUrl(res.redirectUrl); setStep('redirect'); }
      else if (res.otpToken) { setOtpToken(res.otpToken); setStep('otp'); }
      else { toast.error('Réponse inattendue de l\'opérateur.'); }
    } catch (e: any) {
      toast.error(e?.data?.error ?? 'Erreur lors de l\'initiation du paiement.');
    }
  }

  async function handleOtp() {
    if (!otpCode.trim()) { toast.error('Entrez le code OTP.'); return; }
    try {
      const res: any = await submitOtp({ data: { otpToken, otpCode } });
      setSpReference(res.reference);
      setStep('waiting');
    } catch (e: any) {
      toast.error(e?.data?.error ?? 'Code OTP incorrect.');
    }
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

            {/* Country selector */}
            <Card>
              <CardContent className="p-5 space-y-4">
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
                <Button className="w-full h-12" onClick={handleContinue} disabled={creatingPayment || !selectedCountry}>
                  {creatingPayment ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Continuer vers le paiement
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step: Operators */}
        {step === 'operators' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <Card>
              <CardContent className="p-5">
                <h3 className="text-lg font-bold mb-1">Choisir l'opérateur</h3>
                <p className="text-sm text-muted-foreground mb-4">Sélectionnez votre opérateur Mobile Money</p>
                {loadingOperators ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                ) : (
                  <div className="space-y-3">
                    {operators.map((op: any) => (
                      <button
                        key={op.code}
                        onClick={() => setSelectedOperator(op)}
                        className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-colors ${selectedOperator?.code === op.code ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}
                      >
                        <span className="font-semibold">{op.name}</span>
                        {selectedOperator?.code === op.code && <Check className="w-5 h-5 text-primary" />}
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {selectedOperator && (
              <Card>
                <CardContent className="p-5 space-y-4">
                  <div className="space-y-2">
                    <Label>Numéro de téléphone</Label>
                    <Input
                      placeholder="Ex: 90000000"
                      value={payerPhone}
                      onChange={e => setPayerPhone(e.target.value)}
                      type="tel"
                    />
                  </div>
                  <Button className="w-full h-12" onClick={handleInitiate} disabled={initiating}>
                    {initiating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Payer {vipPrice.toLocaleString()} XOF
                  </Button>
                </CardContent>
              </Card>
            )}
            <button onClick={() => setStep('form')} className="w-full text-center text-sm text-muted-foreground hover:text-foreground py-2">
              ← Retour
            </button>
          </motion.div>
        )}

        {/* Step: OTP */}
        {step === 'otp' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardContent className="p-5 space-y-4">
                <div className="text-center mb-2">
                  <p className="text-lg font-bold">Code de confirmation</p>
                  <p className="text-sm text-muted-foreground">Entrez le code OTP reçu par SMS</p>
                </div>
                <Input placeholder="Code OTP" value={otpCode} onChange={e => setOtpCode(e.target.value)} className="text-center text-lg tracking-widest" />
                <Button className="w-full h-12" onClick={handleOtp} disabled={submittingOtp}>
                  {submittingOtp ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Valider le code
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step: Redirect */}
        {step === 'redirect' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardContent className="p-5 text-center space-y-4">
                <p className="text-lg font-bold">Finaliser le paiement</p>
                <p className="text-sm text-muted-foreground">Cliquez ci-dessous pour être redirigé vers la page de paiement de votre opérateur.</p>
                <Button className="w-full h-12" onClick={() => { window.open(redirectUrl, '_blank'); setStep('waiting'); }}>
                  Ouvrir la page de paiement
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
                <Button variant="outline" onClick={() => setStep('form')} className="w-full border-red-300">
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
