import { useState, useRef, useEffect } from 'react';
import { useCreateDeposit } from '@workspace/api-client-react';
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

type IntlStep = 'form' | 'otp' | 'wave' | 'waiting' | 'done' | 'failed';

const TMONEY_USSD = '*145*5*MONTANT*1181879*CODE SECRET#';

export default function DepositPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth() as any;
  const [activeTab, setActiveTab] = useState<'national' | 'international'>('national');

  const [paymentConfig, setPaymentConfig] = useState<{
    tmoneyEnabled: boolean;
    moovMoneyEnabled: boolean;
    moovMoneyNumber: string | null;
    moovMoneyUssdCode: string | null;
  } | null>(null);

  useEffect(() => {
    fetch('/api/config/payment')
      .then(r => r.json())
      .then(d => setPaymentConfig(d))
      .catch(() => {});
  }, []);

  // National — initialise l'opérateur par défaut selon ce qui est activé
  const defaultNational = (): 'tmoney' | 'moov_money' => {
    if (!paymentConfig) return 'tmoney';
    if (paymentConfig.tmoneyEnabled) return 'tmoney';
    if (paymentConfig.moovMoneyEnabled) return 'moov_money';
    return 'tmoney';
  };
  const [nationalOperator, setNationalOperator] = useState<'tmoney' | 'moov_money'>('tmoney');
  const [nationalAccountId, setNationalAccountId] = useState('');
  const [nationalAmount, setNationalAmount] = useState('');
  const [nationalReference, setNationalReference] = useState('');
  const [nationalScreenshot, setNationalScreenshot] = useState<File | null>(null);
  const [nationalScreenshotPreview, setNationalScreenshotPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const screenshotInputRef = useRef<HTMLInputElement>(null);

  // Synchroniser l'opérateur par défaut quand la config charge
  useEffect(() => {
    if (paymentConfig) {
      setNationalOperator(defaultNational());
    }
  }, [paymentConfig?.tmoneyEnabled, paymentConfig?.moovMoneyEnabled]);

  // International — AshtechPay
  const [intlStep, setIntlStep] = useState<IntlStep>('form');
  const [intlCountry, setIntlCountry] = useState('');
  const [intlAmount, setIntlAmount] = useState('');
  const [intlAccountId, setIntlAccountId] = useState('');
  const [intlPhone, setIntlPhone] = useState('');
  const [intlOperator, setIntlOperator] = useState('');
  const [intlCountryOperators, setIntlCountryOperators] = useState<string[]>([]);
  const [intlLoadingOperators, setIntlLoadingOperators] = useState(false);
  const [intlTransactionId, setIntlTransactionId] = useState('');
  const [intlWaveUrl, setIntlWaveUrl] = useState('');
  const [intlOtpRef, setIntlOtpRef] = useState('');
  const [intlOtpUssdCode, setIntlOtpUssdCode] = useState<string | null>(null);
  const [intlOtpCode, setIntlOtpCode] = useState('');
  const [intlSubmitting, setIntlSubmitting] = useState(false);
  const [intlSubmittingOtp, setIntlSubmittingOtp] = useState(false);
  const [intlCollectParams, setIntlCollectParams] = useState<any>(null);
  const [intlExternalRef, setIntlExternalRef] = useState('');

  const createDeposit = useCreateDeposit();

  // Charger les opérateurs quand le pays change
  useEffect(() => {
    if (!intlCountry) { setIntlCountryOperators([]); setIntlOperator(''); return; }
    const code = COUNTRY_CODES[intlCountry];
    if (!code) return;
    setIntlLoadingOperators(true);
    setIntlOperator('');
    apiFetch('/api/ashtechpay/countries')
      .then((countries: any[]) => {
        const found = countries.find((c: any) => c.code === code);
        setIntlCountryOperators(found?.operators ?? []);
      })
      .catch(() => setIntlCountryOperators([]))
      .finally(() => setIntlLoadingOperators(false));
  }, [intlCountry]);

  // Polling statut
  useEffect(() => {
    if (!intlTransactionId || intlStep !== 'waiting') return;
    const interval = setInterval(async () => {
      try {
        const data = await apiFetch(`/api/ashtechpay/status/${intlTransactionId}`);
        if (data.status === 'success') setIntlStep('done');
        else if (data.status === 'failed') setIntlStep('failed');
      } catch { /* ignorer */ }
    }, 5000);
    return () => clearInterval(interval);
  }, [intlTransactionId, intlStep]);

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
    if (!intlOperator) { toast.error('Sélectionnez un opérateur.'); return; }
    if (!intlPhone.trim()) { toast.error('Entrez votre numéro de téléphone.'); return; }

    setIntlSubmitting(true);
    try {
      const collectParams = {
        amount: Number(intlAmount),
        currency: COUNTRY_CURRENCIES[intlCountry] ?? 'XOF',
        phone: intlPhone.trim(),
        operator: intlOperator,
        countryCode: COUNTRY_CODES[intlCountry] ?? '',
        oneXbetAccountId: intlAccountId,
      };
      const res = await apiFetch('/api/ashtechpay/collect', { method: 'POST', body: collectParams });

      if (res.type === 'otp') {
        setIntlCollectParams(res.collectParams);
        setIntlExternalRef(res.externalRef);
        setIntlOtpRef(res.reference);
        setIntlOtpUssdCode(res.ussdCode);
        setIntlStep('otp');
      } else if (res.type === 'wave') {
        setIntlTransactionId(res.transactionId);
        setIntlWaveUrl(res.waveUrl);
        setIntlStep('wave');
      } else {
        setIntlTransactionId(res.transactionId);
        setIntlStep('waiting');
      }
    } catch (e: any) {
      toast.error(e?.message ?? 'Erreur lors du paiement.');
    } finally {
      setIntlSubmitting(false);
    }
  };

  const handleIntlOtp = async () => {
    if (!intlOtpCode.trim()) { toast.error('Entrez le code OTP.'); return; }
    setIntlSubmittingOtp(true);
    try {
      const res = await apiFetch('/api/ashtechpay/submit-otp', {
        method: 'POST',
        body: {
          reference: intlOtpRef,
          otp: intlOtpCode.trim(),
          collectParams: intlCollectParams,
          externalRef: intlExternalRef,
        },
      });
      setIntlTransactionId(res.transactionId);
      setIntlStep('waiting');
    } catch (e: any) {
      toast.error(e?.message ?? 'Code OTP incorrect.');
    } finally {
      setIntlSubmittingOtp(false);
    }
  };

  const resetIntl = () => {
    setIntlStep('form');
    setIntlOperator('');
    setIntlPhone('');
    setIntlOtpCode('');
    setIntlTransactionId('');
    setIntlWaveUrl('');
    setIntlOtpRef('');
    setIntlOtpUssdCode(null);
    setIntlCollectParams(null);
    setIntlExternalRef('');
  };

  const tmoneyVisible = !paymentConfig || paymentConfig.tmoneyEnabled;
  const moovVisible = !paymentConfig || paymentConfig.moovMoneyEnabled;
  const bothDisabled = paymentConfig && !paymentConfig.tmoneyEnabled && !paymentConfig.moovMoneyEnabled;

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
            {bothDisabled ? (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex flex-col items-center text-center gap-3">
                <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
                  <Wrench className="w-7 h-7 text-amber-500" />
                </div>
                <p className="font-bold text-gray-800 text-base">Dépôt national indisponible</p>
                <p className="text-sm text-gray-500">
                  Les dépôts nationaux sont temporairement suspendus. Veuillez utiliser le dépôt international ou réessayer plus tard.
                </p>
              </div>
            ) : (
              <form onSubmit={handleNationalSubmit} className="space-y-5">
                {/* Operator */}
                {(tmoneyVisible || moovVisible) && (
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-medium">Opérateur</Label>
                    <div className={`grid gap-3 ${tmoneyVisible && moovVisible ? 'grid-cols-2' : 'grid-cols-1'}`}>
                      {tmoneyVisible && (
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
                      )}
                      {moovVisible && (
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
                      )}
                    </div>
                  </div>
                )}

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
                {nationalOperator === 'tmoney' && tmoneyVisible && (
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

                {nationalOperator === 'moov_money' && moovVisible && !paymentConfig?.moovMoneyEnabled && (
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

                {/* Account ID, Reference and Submit — hidden when selected operator is disabled */}
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
            )}
          </div>
        )}

        {/* International Form — AshtechPay */}
        {activeTab === 'international' && (
          <div className="space-y-4">

            {/* Step: form */}
            {intlStep === 'form' && (
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-5">
                  <div className="flex items-center gap-2 text-purple-600 font-semibold text-sm mb-1">
                    <Globe className="w-4 h-4" />
                    Dépôt international — AshtechPay
                  </div>
                  <p className="text-sm text-gray-600">Payez depuis votre pays avec votre opérateur mobile local.</p>
                </div>
                <form onSubmit={handleInternationalSubmit} className="space-y-5">
                  {/* Pays */}
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

                  {/* Opérateurs */}
                  {intlCountry && (
                    <div className="space-y-2">
                      <Label className="text-gray-700 font-medium">Opérateur Mobile Money</Label>
                      {intlLoadingOperators ? (
                        <div className="flex justify-center py-4">
                          <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                        </div>
                      ) : intlCountryOperators.length === 0 ? (
                        <p className="text-sm text-gray-400 italic">Aucun opérateur disponible pour ce pays.</p>
                      ) : (
                        <div className="space-y-2">
                          {intlCountryOperators.map(op => (
                            <button
                              key={op}
                              type="button"
                              onClick={() => setIntlOperator(op)}
                              className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-colors text-left ${
                                intlOperator === op
                                  ? 'border-purple-600 bg-purple-50'
                                  : 'border-gray-200 hover:border-purple-300'
                              }`}
                            >
                              <span className="font-semibold text-sm">{op}</span>
                              {intlOperator === op && <Check className="w-5 h-5 text-purple-600 flex-shrink-0" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Numéro de téléphone */}
                  {intlOperator && (
                    <div className="space-y-2">
                      <Label className="text-gray-700 font-medium">Numéro de téléphone</Label>
                      <Input
                        type="tel"
                        value={intlPhone}
                        onChange={e => setIntlPhone(e.target.value)}
                        placeholder="Ex: 90000000"
                        required
                        className="h-14 text-base bg-gray-50 border-gray-200 rounded-xl"
                      />
                    </div>
                  )}

                  {/* Montant */}
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-medium">
                      Montant ({intlCountry ? (COUNTRY_CURRENCIES[intlCountry] ?? 'XOF') : 'XOF'})
                    </Label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={intlAmount}
                        onChange={e => setIntlAmount(e.target.value)}
                        placeholder="Ex: 5000"
                        required
                        className="pr-16 h-14 text-base bg-gray-50 border-gray-200 rounded-xl"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                        {intlCountry ? (COUNTRY_CURRENCIES[intlCountry] ?? 'XOF') : 'XOF'}
                      </span>
                    </div>
                  </div>

                  {/* ID 1xBet */}
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-medium">ID de compte 1xbet</Label>
                    <Input
                      value={intlAccountId}
                      onChange={e => setIntlAccountId(e.target.value)}
                      placeholder="Votre ID de compte 1xbet"
                      required
                      className="h-14 text-base bg-gray-50 border-gray-200 rounded-xl"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={intlSubmitting || !intlCountry || !intlOperator || !intlAmount || !intlAccountId || !intlPhone}
                    className="w-full h-14 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl text-base"
                  >
                    {intlSubmitting
                      ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Paiement en cours…</>
                      : `→  Payer ${intlAmount ? Number(intlAmount).toLocaleString() : ''} ${intlCountry ? (COUNTRY_CURRENCIES[intlCountry] ?? 'XOF') : 'XOF'}`}
                  </Button>
                </form>
              </div>
            )}

            {/* Step: OTP */}
            {intlStep === 'otp' && (
              <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
                <div className="text-center">
                  <p className="text-lg font-bold">Code de confirmation</p>
                  {intlOtpUssdCode ? (
                    <div className="mt-2 space-y-2">
                      <p className="text-sm text-gray-500">Composez ce code USSD sur votre téléphone pour recevoir l'OTP :</p>
                      <div className="bg-blue-50 rounded-lg p-3 border border-blue-200 inline-block">
                        <code className="text-[#1a3aff] font-bold text-base">{intlOtpUssdCode}</code>
                      </div>
                      <p className="text-sm text-gray-500">Puis entrez le code reçu ci-dessous.</p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 mt-1">Entrez le code OTP reçu par SMS</p>
                  )}
                </div>
                <Input
                  placeholder="Code OTP"
                  value={intlOtpCode}
                  onChange={e => setIntlOtpCode(e.target.value)}
                  className="text-center text-lg tracking-widest h-14 bg-gray-50 border-gray-200 rounded-xl"
                />
                <Button
                  onClick={handleIntlOtp}
                  disabled={intlSubmittingOtp || !intlOtpCode.trim()}
                  className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl"
                >
                  {intlSubmittingOtp ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Valider le code
                </Button>
                <button onClick={resetIntl} className="w-full text-center text-sm text-gray-400 hover:text-gray-700 py-2">← Recommencer</button>
              </div>
            )}

            {/* Step: Wave */}
            {intlStep === 'wave' && (
              <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4 text-center">
                <p className="text-lg font-bold">Finaliser via Wave</p>
                <p className="text-sm text-gray-500">Cliquez pour ouvrir la page de paiement Wave.</p>
                <Button
                  onClick={() => { window.open(intlWaveUrl, '_blank'); setIntlStep('waiting'); }}
                  className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl"
                >
                  Ouvrir Wave
                </Button>
                <button onClick={() => setIntlStep('waiting')} className="text-sm text-gray-400 hover:text-gray-700">
                  J'ai déjà payé, vérifier le statut
                </button>
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
                  <Button variant="outline" onClick={resetIntl} className="w-full border-red-300">Réessayer</Button>
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
