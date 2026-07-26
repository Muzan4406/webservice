import { useState, useEffect } from 'react';
import { Link, useLocation, useParams } from 'wouter';
import { motion } from 'framer-motion';
import { useRegister } from '@workspace/api-client-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/lib/toast';

const BASE_URL = import.meta.env.BASE_URL;

const COUNTRIES = [
  'Togo',
  'Bénin',
  'Côte d\'Ivoire',
  'Burkina Faso',
  'Cameroun',
  'Congo démocratique',
  'Congo Brazzaville',
];

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [, setLocation] = useLocation();
  const { login: authLogin } = useAuth();
  const registerMutation = useRegister();

  // Read referral code from URL path: /inscription/:code
  const params = useParams<{ code?: string }>();
  useEffect(() => {
    if (params.code) {
      setReferralCode(params.code.toUpperCase());
    }
  }, [params.code]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    registerMutation.mutate(
      {
        data: {
          username,
          phone,
          country,
          password,
          confirmPassword,
          referralCode: referralCode || undefined,
        },
      },
      {
        onSuccess: (data) => {
          authLogin(data.token, data.user);
          toast.success('Inscription réussie');
          setLocation('/');
        },
        onError: (error: any) => {
          toast.error(error?.data?.error || error?.message || 'Erreur d\'inscription');
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-[#060D1A] flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8"
      >
        <div className="text-center space-y-4">
          <img
            src={`${BASE_URL}logo.png`}
            alt="MUZAN SERVICE"
            className="h-28 w-28 mx-auto rounded-2xl shadow-lg"
          />
          <h1 className="text-3xl font-bold text-white">Inscription</h1>
          <p className="text-white/60">Créez votre compte</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-white/80">
              Nom d'utilisateur
            </Label>
            <Input
              id="username"
              data-testid="input-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Votre nom d'utilisateur"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-white/80">
              Téléphone
            </Label>
            <Input
              id="phone"
              data-testid="input-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Votre numéro de téléphone"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="country" className="text-white/80">
              Pays
            </Label>
            <Select value={country} onValueChange={setCountry} required>
              <SelectTrigger data-testid="select-country" className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Sélectionnez votre pays" />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-white/80">
              Mot de passe
            </Label>
            <Input
              id="password"
              data-testid="input-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Votre mot de passe"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-white/80">
              Confirmer le mot de passe
            </Label>
            <Input
              id="confirmPassword"
              data-testid="input-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirmez votre mot de passe"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="referralCode" className="text-white/80">
              Code de parrainage{' '}
              {params.code ? (
                <span className="text-green-400 text-xs">(appliqué automatiquement)</span>
              ) : (
                <span className="text-white/40 text-xs">(optionnel)</span>
              )}
            </Label>
            <Input
              id="referralCode"
              data-testid="input-referral-code"
              type="text"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              placeholder="Code de parrainage"
              className={`bg-white/5 border-white/10 text-white placeholder:text-white/40 ${
                params.code ? 'border-green-500/50 bg-green-500/5' : ''
              }`}
            />
          </div>

          <Button
            data-testid="button-submit"
            type="submit"
            className="w-full h-12 bg-[#22C55E] hover:bg-[#22C55E]/90 text-white font-bold"
            disabled={registerMutation.isPending}
          >
            {registerMutation.isPending ? 'Inscription...' : 'S\'inscrire'}
          </Button>

          <div className="text-center">
            <Link href="/login" className="text-primary hover:underline text-sm">
              Déjà un compte ? Connectez-vous
            </Link>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
