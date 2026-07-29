import { useState, useRef, useEffect } from 'react';
import {
  useCreateDeposit,
  useGetPaymentConfig,
  getGetPaymentConfigQueryKey,
  useCreateDepositPayment,
  useGetSendavapayOperators,
  useInitiateSendavapayPayment,
  useSubmitPaymentOtp,
  useGetSendavapayPaymentStatus,
} from '@workspace/api-client-react';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/lib/toast';
import { ArrowLeft, Globe, Smartphone, Info, Wrench, ImagePlus, X, Check, Loader2 } from 'lucide-react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';

async function uploadImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = (reader.result as string).split(',')[1];
        const token = localStorage.getItem('muzan_auth_token');
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ base64, mimeType: file.type }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Upload échoué');
        resolve(data.url);
      } catch (err: any) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Lecture du fichier échouée'));
    reader.readAsDataURL(file);
  });
}

const COUNTRIES = [
  'Togo',
  'Bénin',
  "Côte d'Ivoire",
  'Burkina Faso',
  'Cameroun',
  'Congo démocratique',
  'Congo Brazzaville',
  'Sénégal',
  'Mali',
  'Niger',
];

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

type IntlStep = 'form' | 'operators' | 'otp' | 'redirect' | 'waiting' | 'done' | 'failed';

const TMONEY_USSD = '*145*5*MONTANT*1181879*CODE SECRET#';

export default function DepositPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth() as any;
  const [activeTab, setActiveTab] = useState<'national' | 'international'>('national');

  const { data: paymentConfig } = useGetPaymentConfig({ query: { queryKey: getGetPaymentConfigQueryKey() } });

  // National
  const [nationalOperator, setNationalOperator] = useState<'tmoney' | 'moov_money'>('tmoney');
  const [nationalAccountId, setNationalAccountId] = useState('');
  const [nationalAmount, setNationalAmount] = useState('');
  const [nationalReference, setNationalReference] = useState('');
  const [nationalScreenshot, setNationalScreenshot] = useState<File | null>(null);
  const [nationalScreenshotPreview, setNationalScreenshotPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const screenshotInputRef = useRef<HTMLInputElement>(null);

  // International — multi-step SendavaPay
  const [intlStep, setIntlStep] = useState<IntlStep>('form');
  const [intlCountry, setIntlCountry] = useState('');
  const [intlAmount, setIntlAmount] = useState('');
  const [intlAccountId, setIntlAccountId] = useState('');
  const [intlPaymentToken, setIntlPaymentToken] = useState('');
  const [intlSpReference, setIntlSpReference] = useState('');
  const [intlSelectedOperator, setIntlSelectedOperator] = useState<any>(null);
  const [intlPayerPhone, setIntlPayerPhone] = useState('');
  const [intlOtpToken, setIntlOtpToken] = useState('');
  const [intlOtpCode, setIntlOtpCode] = useState('');
  const [intlRedirectUrl, setIntlRedirectUrl] = useState('');

  const intlCountryCode = COUNTRY_CODES[intlCountry] ?? '';
  const { data: intlOperatorsData, isLoading: intlLoadingOperators } = useGetSendavapayOperators(
    intlCountryCode || '_',
    { query: { enabled: !!intlCountryCode && intlStep === 'operators' } }
  );
  const intlOperators: any[] = (intlOperatorsData as any)?.operators ?? [];

  const { mutateAsync: createDepositPayment, isPending: intlCreating } = useCreateDepositPayment();
  const { mutateAsync: intlInitiate, isPending: intlInitiating } = useInitiateSendavapayPayment();
  const { mutateAsync: intlSubmitOtp, isPending: intlSubmittingOtp } = useSubmitPaymentOtp();

  const { data: intlStatusData } = useGetSendavapayPaymentStatus(
    intlSpReference || '_',
    { query: { enabled: !!intlSpReference && intlStep === 'waiting', refetchInterval: 5000 } }
  );

  useEffect(() => {
    if (!intlStatusData) return;
    const s = (intlStatusData as any)?.status;
    if (s === 'completed') setIntlStep('done');
    else if (s === 'failed' || s === 'expired') setIntlStep('failed');
  }, [intlStatusData]);

  const createDeposit = useCreateDeposit();

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNationalScreenshot(file);
    setNationalScreenshotPreview(URL.createObjectURL(file));
  };

  const removeScreenshot = () => {
    setNationalScreenshot(null);
    setNationalScreenshotPreview(null);
    if (screenshotInputRef.current) screenshotInputRef.current.value = '';
  };

  const handleNationalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nationalScreenshot) {
      toast.error('Veuillez importer la capture d\'écran du paiement');
      return;
    }
    let screenshotUrl: string | undefined;
    try {
      setIsUploading(true);
      screenshotUrl = await uploadImage(nationalScreenshot);
    } catch (err: any) {
      toast.error(err?.message ?? 'Erreur lors de l\'upload de la capture');
      setIsUploading(false);
      return;
    } finally {
      setIsUploading(false);
    }
    createDeposit.mutate(
      {
        data: {
          type: 'national',
          operator: nationalOperator,
          oneXbetAccountId: nationalAccountId,
          amount: Number(nationalAmount),
          referenceId: nationalReference,
          screenshotUrl,
          country: 'Togo',
        } as any,
      },
      {
        onSuccess: () => {
          toast.success('Demande de dépôt soumise avec succès');
          setLocation('/transactions');
        },
        onError: (error: any) => {
          toast.error(error?.error || 'Erreur lors de la soumission');
        },
      }
    );
  };

  const handleInternationalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!intlCountry) { toast.error('Sélectionnez votre pays.'); return; }
    try {
      const res: any = await createDepositPayment({
        data: {
          amount: Number(intlAmount),
          currency: COUNTRY_CURRENCIES[intlCountry] ?? 'XOF',
          payerCountry: intlCountryCode,
          oneXbetAccountId: intlAccountId,
        },
      });
      setIntlPaymentToken(res.paymentToken);
      setIntlStep('operators');
    } catch (e: any) {
      toast.error(e?.data?.error ?? 'Erreur lors de la création du paiement.');
    }
  };

  const handleIntlInitiate = async () => {
    if (!intlPayerPhone.trim()) { toast.error('Entrez votre numéro de téléphone.'); return; }
    try {
      const res: any = await intlInitiate({
        data: { paymentToken: intlPaymentToken, operatorId: intlSelectedOperator.id, payerPhone: intlPayerPhone, payerCountry: intlCountryCode, payerName: user?.username ?? 'User' },
      });
      if (res.redirectUrl) { setIntlRedirectUrl(res.redirectUrl); setIntlStep('redirect'); }
      else if (res.otpToken) { setIntlOtpToken(res.otpToken); setIntlStep('otp'); }
      else if (res.reference) { setIntlSpReference(res.reference); setIntlStep('waiting'); }
      else { toast.error("Réponse inattendue de l'opérateur."); }
    } catch (e: any) {
      toast.error(e?.data?.error ?? "Erreur lors de l'initiation.");
    }
  };

  const handleIntlOtp = async () => {
    if (!intlOtpCode.trim()) { toast.error('Entrez le code OTP.'); return; }
    try {
      const res: any = await intlSubmitOtp({ data: { otpToken: intlOtpToken, otpCode: intlOtpCode } });
      setIntlSpReference(res.reference);
      setIntlStep('waiting');
    } catch (e: any) {
      toast.error(e?.data?.error ?? 'Code OTP incorrect.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6FB] pb-24">
      {/* Header */}
      <div className="bg-white px-4 pt-4 pb-4 flex items-center gap-3 border-b border-gray-100">
        <button
          onClick={() => setLocation('/')}
          className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">Dépôt</h1>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Tab toggle */}
        <div className="bg-gray-100 rounded-xl p-1 flex gap-1">
          <button
            onClick={() => setActiveTab('national')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'national'
                ? 'bg-[#1a3aff] text-white shadow'
                : 'text-gray-500'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            National
          </button>
          <button
            onClick={() => setActiveTab('international')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'international'
                ? 'bg-[#1a3aff] text-white shadow'
                : 'text-gray-500'
            }`}
          >
            <Globe className="w-4 h-4" />
            International
          </button>
        </div>

        {/* National Form */}
        {activeTab === 'national' && (
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <form onSubmit={handleNationalSubmit} className="space-y-5">
              {/* Operator */}
              <div className="space-y-2">
                <Label className="text-gray-700 font-medium">Opérateur</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNationalOperator('tmoney')}
                    className={`py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
                      nationalOperator === 'tmoney'
                        ? 'border-[#1a3aff] text-[#1a3aff] bg-blue-50'
                        : 'border-gray-200 text-gray-500 bg-gray-50'
                    }`}
                  >
                    T-Money
                  </button>
                  <button
                    type="button"
                    onClick={() => setNationalOperator('moov_money')}
                    className={`py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
                      nationalOperator === 'moov_money'
                        ? 'border-[#1a3aff] text-[#1a3aff] bg-blue-50'
                        : 'border-gray-200 text-gray-500 bg-gray-50'
                    }`}
                  >
                    Moov
                  </button>
                </div>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label className="text-gray-700 font-medium">Montant (FCFA)</Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={nationalAmount}
                    onChange={(e) => setNationalAmount(e.target.value)}
                    placeholder="Ex: 5000"
                    required
                    className="pr-16 h-14 text-base bg-gray-50 border-gray-200 rounded-xl"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                    FCFA
                  </span>
                </div>
              </div>

              {/* USSD Instructions */}
              {nationalOperator === 'tmoney' && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-[#1a3aff] font-semibold text-sm">
                    <Info className="w-4 h-4" />
                    Comment payer
                  </div>
                  <p className="text-sm text-gray-700">
                    1. Composez le code USSD sur votre téléphone :
                  </p>
                  <div className="bg-white rounded-lg p-3 border border-blue-200">
                    <code className="text-[#1a3aff] font-bold text-sm break-all">{TMONEY_USSD}</code>
                  </div>
                  <p className="text-sm text-gray-700">
                    2. Notez le <strong>numéro de référence</strong> reçu par SMS.
                  </p>
                  <p className="text-sm text-gray-700">
                    3. Entrez-le dans le champ ci-dessous.
                  </p>
                </div>
              )}
              {nationalOperator === 'moov_money' && paymentConfig && !paymentConfig.moovMoneyEnabled && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex flex-col items-center text-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
                    <Wrench className="w-7 h-7 text-amber-500" />
                  </div>
                  <p className="font-bold text-gray-800 text-base">Dépôt Moov Money indisponible</p>
                  <p className="text-sm text-gray-500">
                    Ce mode de paiement est temporairement suspendu pour maintenance. Veuillez utiliser T-Money ou réessayer plus tard.
                  </p>
                </div>
              )}

              {nationalOperator === 'moov_money' && (!paymentConfig || paymentConfig.moovMoneyEnabled) && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-[#1a3aff] font-semibold text-sm">
                    <Info className="w-4 h-4" />
                    Comment payer
                  </div>
                  <p className="text-sm text-gray-700">
                    Effectuez un transfert Moov Money vers le numéro indiqué par votre agent, puis entrez votre ID de compte 1xBet et la référence de la transaction.
                  </p>
                </div>
              )}

              {/* Account ID, Reference and Submit — hidden when Moov is disabled */}
              {(nationalOperator !== 'moov_money' || !paymentConfig || paymentConfig.moovMoneyEnabled) && (
                <>
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-medium">ID de compte 1xbet</Label>
                    <Input
                      value={nationalAccountId}
                      onChange={(e) => setNationalAccountId(e.target.value)}
                      placeholder="Votre ID de compte 1xbet"
                      required
                      className="h-14 text-base bg-gray-50 border-gray-200 rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-700 font-medium">Numéro de référence</Label>
                    <Input
                      value={nationalReference}
                      onChange={(e) => setNationalReference(e.target.value)}
                      placeholder="Référence de la transaction"
                      className="h-14 text-base bg-gray-50 border-gray-200 rounded-xl"
                    />
                  </div>

                  {/* Screenshot upload */}
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-medium">
                      Capture d'écran du paiement <span className="text-red-500">*</span>
                    </Label>
                    <input
                      ref={screenshotInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleScreenshotChange}
                    />
                    {nationalScreenshotPreview ? (
                      <div className="relative rounded-xl overflow-hidden border border-gray-200">
                        <img
                          src={nationalScreenshotPreview}
                          alt="Capture du paiement"
                          className="w-full max-h-56 object-contain bg-gray-50"
                        />
                        <button
                          type="button"
                          onClick={removeScreenshot}
                          className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => screenshotInputRef.current?.click()}
                        className="w-full h-28 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-[#1a3aff] hover:text-[#1a3aff] transition-colors bg-gray-50"
                      >
                        <ImagePlus className="w-7 h-7" />
                        <span className="text-sm font-medium">Importer la capture d'écran</span>
                        <span className="text-xs">JPG, PNG — max 10 Mo</span>
                      </button>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={createDeposit.isPending || isUploading}
                    className="w-full h-14 bg-[#1a3aff] hover:bg-[#1a3aff]/90 text-white font-bold rounded-2xl text-base"
                  >
                    {isUploading ? 'Upload en cours...' : createDeposit.isPending ? 'Envoi en cours...' : '→  Soumettre le dépôt'}
                  </Button>
                </>
              )}
            </form>
          </div>
        )}

        {/* International Form — multi-step SendavaPay */}
        {activeTab === 'international' && (
          <div className="space-y-4">

            {/* Step: form */}
            {intlStep === 'form' && (
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-5">
                  <div className="flex items-center gap-2 text-purple-600 font-semibold text-sm mb-1">
                    <Globe className="w-4 h-4" />
                    Dépôt via SendavaPay
                  </div>
                  <p className="text-sm text-gray-600">Payez depuis votre pays avec votre opérateur mobile local.</p>
                </div>
                <form onSubmit={handleInternationalSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-medium">Montant (FCFA)</Label>
                    <div className="relative">
                      <Input type="number" value={intlAmount} onChange={e => setIntlAmount(e.target.value)}
                        placeholder="Ex: 5000" required className="pr-16 h-14 text-base bg-gray-50 border-gray-200 rounded-xl" />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">FCFA</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-medium">ID de compte 1xbet</Label>
                    <Input value={intlAccountId} onChange={e => setIntlAccountId(e.target.value)}
                      placeholder="Votre ID de compte 1xbet" required className="h-14 text-base bg-gray-50 border-gray-200 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-medium">Votre pays</Label>
                    <Select value={intlCountry} onValueChange={setIntlCountry} required>
                      <SelectTrigger className="h-14 text-base bg-gray-50 border-gray-200 rounded-xl">
                        <SelectValue placeholder="Sélectionner votre pays" />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" disabled={intlCreating || !intlCountry || !intlAmount || !intlAccountId}
                    className="w-full h-14 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl text-base">
                    {intlCreating ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Création...</> : '→  Continuer vers le paiement'}
                  </Button>
                </form>
              </div>
            )}

            {/* Step: operators */}
            {intlStep === 'operators' && (
              <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
                <div>
                  <h3 className="text-lg font-bold mb-1">Choisir l'opérateur</h3>
                  <p className="text-sm text-gray-500">Sélectionnez votre opérateur Mobile Money</p>
                </div>
                {intlLoadingOperators ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-purple-600" /></div>
                ) : (
                  <div className="space-y-3">
                    {intlOperators.map((op: any) => (
                      <button key={op.id} onClick={() => setIntlSelectedOperator(op)}
                        className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-colors ${intlSelectedOperator?.id === op.id ? 'border-purple-600 bg-purple-50' : 'border-gray-200 hover:border-purple-300'}`}>
                        <span className="font-semibold">{op.name}</span>
                        {intlSelectedOperator?.id === op.id && <Check className="w-5 h-5 text-purple-600" />}
                      </button>
                    ))}
                  </div>
                )}
                {intlSelectedOperator && (
                  <div className="space-y-3 pt-2">
                    <div className="space-y-2">
                      <Label className="text-gray-700 font-medium">Numéro de téléphone</Label>
                      <Input placeholder="Ex: 90000000" value={intlPayerPhone} onChange={e => setIntlPayerPhone(e.target.value)} type="tel"
                        className="h-14 text-base bg-gray-50 border-gray-200 rounded-xl" />
                    </div>
                    <Button onClick={handleIntlInitiate} disabled={intlInitiating} className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl">
                      {intlInitiating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Payer {Number(intlAmount).toLocaleString()} {COUNTRY_CURRENCIES[intlCountry] ?? 'XOF'}
                    </Button>
                  </div>
                )}
                <button onClick={() => setIntlStep('form')} className="w-full text-center text-sm text-gray-400 hover:text-gray-700 py-2">← Retour</button>
              </div>
            )}

            {/* Step: OTP */}
            {intlStep === 'otp' && (
              <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
                <div className="text-center">
                  <p className="text-lg font-bold">Code de confirmation</p>
                  <p className="text-sm text-gray-500">Entrez le code OTP reçu par SMS</p>
                </div>
                <Input placeholder="Code OTP" value={intlOtpCode} onChange={e => setIntlOtpCode(e.target.value)}
                  className="text-center text-lg tracking-widest h-14 bg-gray-50 border-gray-200 rounded-xl" />
                <Button onClick={handleIntlOtp} disabled={intlSubmittingOtp} className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl">
                  {intlSubmittingOtp ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Valider le code
                </Button>
              </div>
            )}

            {/* Step: redirect */}
            {intlStep === 'redirect' && (
              <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4 text-center">
                <p className="text-lg font-bold">Finaliser le paiement</p>
                <p className="text-sm text-gray-500">Cliquez pour être redirigé vers la page de paiement de votre opérateur.</p>
                <Button onClick={() => { window.open(intlRedirectUrl, '_blank'); setIntlStep('waiting'); }}
                  className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl">
                  Ouvrir la page de paiement
                </Button>
                <button onClick={() => setIntlStep('waiting')} className="text-sm text-gray-400 hover:text-gray-700">J'ai déjà payé, vérifier le statut</button>
              </div>
            )}

            {/* Step: waiting */}
            {intlStep === 'waiting' && (
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="py-12 text-center space-y-4">
                  <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto" />
                  <p className="text-lg font-bold">Vérification en cours…</p>
                  <p className="text-sm text-gray-500">Nous attendons la confirmation de votre paiement. Cette page se met à jour automatiquement.</p>
                </div>
              </div>
            )}

            {/* Step: done */}
            {intlStep === 'done' && (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-green-200 bg-green-50">
                <div className="py-10 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                    <Check className="w-8 h-8 text-green-600" />
                  </div>
                  <p className="text-xl font-bold text-green-800">Paiement reçu ! 🎉</p>
                  <p className="text-sm text-green-700">Votre dépôt est en cours de traitement.</p>
                  <Button onClick={() => setLocation('/transactions')} className="bg-green-600 hover:bg-green-700 w-full">Voir mes transactions</Button>
                </div>
              </div>
            )}

            {/* Step: failed */}
            {intlStep === 'failed' && (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-red-200 bg-red-50">
                <div className="py-10 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                    <span className="text-3xl">❌</span>
                  </div>
                  <p className="text-xl font-bold text-red-800">Paiement échoué</p>
                  <p className="text-sm text-red-700">Le paiement a échoué ou a expiré. Veuillez réessayer.</p>
                  <Button variant="outline" onClick={() => { setIntlStep('form'); setIntlSelectedOperator(null); setIntlPayerPhone(''); setIntlOtpCode(''); }}
                    className="w-full border-red-300">Réessayer</Button>
                </div>
              </div>
            )}

          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
