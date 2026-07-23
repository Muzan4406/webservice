import { useState } from 'react';
import { useCreateWithdrawal } from '@workspace/api-client-react';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Info, MapPin } from 'lucide-react';
import { useLocation } from 'wouter';

const COUNTRY_OPERATORS: Record<string, { label: string; value: string }[]> = {
  Togo: [
    { label: 'T-Money', value: 'tmoney' },
    { label: 'Moov', value: 'moov_money' },
  ],
  Bénin: [
    { label: 'MTN MoMo', value: 'mtn_momo' },
    { label: 'Moov', value: 'moov_money' },
  ],
  "Côte d'Ivoire": [
    { label: 'Orange Money', value: 'orange_money' },
    { label: 'MTN MoMo', value: 'mtn_momo' },
    { label: 'Wave', value: 'wave' },
    { label: 'Moov', value: 'moov_money' },
  ],
  'Burkina Faso': [
    { label: 'Orange Money', value: 'orange_money' },
    { label: 'Moov', value: 'moov_money' },
    { label: 'Wave', value: 'wave' },
  ],
  Cameroun: [
    { label: 'Orange Money', value: 'orange_money' },
    { label: 'MTN MoMo', value: 'mtn_momo' },
  ],
  'Congo démocratique': [
    { label: 'Airtel Money', value: 'airtel_money' },
    { label: 'Orange Money', value: 'orange_money' },
    { label: 'M-Pesa', value: 'mpesa' },
  ],
  'Congo Brazzaville': [
    { label: 'Airtel Money', value: 'airtel_money' },
    { label: 'MTN MoMo', value: 'mtn_momo' },
  ],
};

function StepIndicator({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-center gap-0 py-4">
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
          step >= 1 ? 'bg-[#1a3aff] text-white' : 'bg-gray-200 text-gray-500'
        }`}
      >
        1
      </div>
      <div className={`h-0.5 w-16 ${step >= 2 ? 'bg-[#1a3aff]' : 'bg-gray-200'}`} />
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
          step >= 2 ? 'bg-[#1a3aff] text-white' : 'bg-gray-200 text-gray-500'
        }`}
      >
        2
      </div>
    </div>
  );
}

export default function WithdrawalPage() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);

  const [country, setCountry] = useState('Togo');
  const [operator, setOperator] = useState('tmoney');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [code, setCode] = useState('');

  const createWithdrawal = useCreateWithdrawal();

  const availableOperators = COUNTRY_OPERATORS[country] ?? [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createWithdrawal.mutate(
      {
        data: {
          amount: Number(amount),
          phone,
          country,
          operator,
          code,
        },
      },
      {
        onSuccess: () => {
          toast.success('Demande de retrait soumise avec succès');
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
          onClick={() => (step === 1 ? setLocation('/') : setStep(1))}
          className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">Retrait</h1>
      </div>

      <StepIndicator step={step} />

      <div className="px-4 space-y-4">
        {/* Step 1 — Instructions */}
        {step === 1 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Obtenir le code 1xBet</h2>

            {/* Info box */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-[#1a3aff] mt-0.5 shrink-0" />
                <p className="text-sm font-semibold text-[#1a3aff]">Important</p>
              </div>
              <div className="text-sm text-gray-700 space-y-2 pl-6">
                <p>
                  Dès que vous accédez à la partie <strong>Retrait</strong> sur 1xBet, faites défiler
                  vers le bas puis sélectionnez <strong>Espèces</strong> (logo 1xbet).
                </p>
                <p>
                  Choisissez ensuite Ville : <strong>Tsevie</strong> et Rue :{' '}
                  <strong>Kpali24</strong>, indiquez le montant puis confirmez votre demande.
                </p>
                <p>Revenez ensuite en haut de la page de retrait pour voir le retrait en attente.</p>
                <p>Une fois votre retrait approuvé, vous recevrez un code de retrait.</p>
              </div>
            </div>

            {/* Point de retrait */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
              <MapPin className="w-5 h-5 text-green-600 shrink-0" />
              <div>
                <p className="text-xs text-green-600 font-medium">Point de retrait à sélectionner</p>
                <p className="text-base font-bold text-green-700">Tsevie — Kpali24</p>
              </div>
            </div>

            <Button
              onClick={() => setStep(2)}
              className="w-full h-14 bg-[#1a3aff] hover:bg-[#1a3aff]/90 text-white font-bold rounded-2xl text-base"
            >
              J'ai le code — Continuer →
            </Button>

            <p className="text-xs text-center text-gray-400">
              Votre demande sera traitée dans les 24 heures par notre équipe.
            </p>
          </div>
        )}

        {/* Step 2 — Form */}
        {step === 2 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-5">Vos informations</h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Country */}
              <div className="space-y-2">
                <Label className="text-gray-700 font-medium">Pays</Label>
                <Select
                  value={country}
                  onValueChange={(val) => {
                    setCountry(val);
                    const ops = COUNTRY_OPERATORS[val];
                    setOperator(ops?.[0]?.value ?? '');
                  }}
                >
                  <SelectTrigger className="h-14 text-base bg-gray-50 border-gray-200 rounded-xl">
                    <SelectValue placeholder="Sélectionner votre pays" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(COUNTRY_OPERATORS).map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Operator */}
              <div className="space-y-2">
                <Label className="text-gray-700 font-medium">Opérateur mobile</Label>
                <div className="grid grid-cols-2 gap-3">
                  {availableOperators.map((op) => (
                    <button
                      key={op.value}
                      type="button"
                      onClick={() => setOperator(op.value)}
                      className={`py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
                        operator === op.value
                          ? 'border-[#1a3aff] text-[#1a3aff] bg-blue-50'
                          : 'border-gray-200 text-gray-500 bg-gray-50'
                      }`}
                    >
                      {op.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label className="text-gray-700 font-medium">Montant (FCFA)</Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Ex: 10000"
                    required
                    className="pr-16 h-14 text-base bg-gray-50 border-gray-200 rounded-xl"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                    FCFA
                  </span>
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label className="text-gray-700 font-medium">Numéro de téléphone</Label>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+228 XX XX XX XX"
                  required
                  className="h-14 text-base bg-gray-50 border-gray-200 rounded-xl"
                />
              </div>

              {/* Code */}
              <div className="space-y-2">
                <Label className="text-gray-700 font-medium">Code 1xBet reçu</Label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Code de confirmation"
                  required
                  className="h-14 text-base bg-gray-50 border-gray-200 rounded-xl"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-14 h-14 rounded-2xl border-2 border-gray-200 flex items-center justify-center text-gray-500 bg-gray-50 shrink-0"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <Button
                  type="submit"
                  disabled={createWithdrawal.isPending}
                  className="flex-1 h-14 bg-[#1a3aff] hover:bg-[#1a3aff]/90 text-white font-bold rounded-2xl text-base"
                >
                  {createWithdrawal.isPending ? 'Envoi...' : '↑  Envoyer la demande'}
                </Button>
              </div>

              <p className="text-xs text-center text-gray-400">
                Votre demande sera traitée dans les 24 heures par notre équipe.
              </p>
            </form>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
