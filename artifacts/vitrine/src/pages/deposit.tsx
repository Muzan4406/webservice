import { useState, useRef } from 'react';
import { useCreateDeposit, useGetPaymentConfig, getGetPaymentConfigQueryKey } from '@workspace/api-client-react';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Globe, Smartphone, Info, Wrench, ImagePlus, X } from 'lucide-react';
import { useLocation } from 'wouter';

async function uploadImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = (reader.result as string).split(',')[1];
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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

const TMONEY_USSD = '*145*5*MONTANT*1181879*CODE SECRET#';

export default function DepositPage() {
  const [, setLocation] = useLocation();
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

  // International
  const [intlCountry, setIntlCountry] = useState('');
  const [intlAmount, setIntlAmount] = useState('');
  const [intlAccountId, setIntlAccountId] = useState('');

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

  const handleInternationalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createDeposit.mutate(
      {
        data: {
          type: 'international',
          operator: 'other',
          oneXbetAccountId: intlAccountId,
          amount: Number(intlAmount),
          country: intlCountry,
        },
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

        {/* International Form */}
        {activeTab === 'international' && (
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            {/* SendavaPay banner */}
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-5">
              <div className="flex items-center gap-2 text-purple-600 font-semibold text-sm mb-1">
                <Globe className="w-4 h-4" />
                Dépôt via SendavaPay
              </div>
              <p className="text-sm text-gray-600">
                Payez depuis votre pays avec votre opérateur mobile local.
              </p>
            </div>

            <form onSubmit={handleInternationalSubmit} className="space-y-5">
              {/* Amount */}
              <div className="space-y-2">
                <Label className="text-gray-700 font-medium">Montant (FCFA)</Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={intlAmount}
                    onChange={(e) => setIntlAmount(e.target.value)}
                    placeholder="Ex: 5000"
                    required
                    className="pr-16 h-14 text-base bg-gray-50 border-gray-200 rounded-xl"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                    FCFA
                  </span>
                </div>
              </div>

              {/* Account ID */}
              <div className="space-y-2">
                <Label className="text-gray-700 font-medium">ID de compte 1xbet</Label>
                <Input
                  value={intlAccountId}
                  onChange={(e) => setIntlAccountId(e.target.value)}
                  placeholder="Votre ID de compte 1xbet"
                  required
                  className="h-14 text-base bg-gray-50 border-gray-200 rounded-xl"
                />
              </div>

              {/* Country */}
              <div className="space-y-2">
                <Label className="text-gray-700 font-medium">Votre pays</Label>
                <Select value={intlCountry} onValueChange={setIntlCountry} required>
                  <SelectTrigger className="h-14 text-base bg-gray-50 border-gray-200 rounded-xl">
                    <SelectValue placeholder="Sélectionner votre pays" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((country) => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="submit"
                disabled={createDeposit.isPending}
                className="w-full h-14 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl text-base"
              >
                {createDeposit.isPending ? 'Redirection...' : '→  Continuer vers le paiement'}
              </Button>
            </form>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
