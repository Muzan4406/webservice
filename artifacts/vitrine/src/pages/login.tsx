import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { useLogin } from '@workspace/api-client-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const BASE_URL = import.meta.env.BASE_URL;

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [, setLocation] = useLocation();
  const { login: authLogin } = useAuth();
  const loginMutation = useLogin();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    loginMutation.mutate(
      { data: { identifier, password } },
      {
        onSuccess: (data) => {
          authLogin(data.token, data.user);
          toast.success('Connexion réussie');
          setLocation('/');
        },
        onError: (error: any) => {
          toast.error(error?.data?.error || error?.message || 'Erreur de connexion');
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
            className="h-20 w-20 mx-auto"
          />
          <h1 className="text-3xl font-bold text-white">Connexion</h1>
          <p className="text-white/60">Connectez-vous à votre compte</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="identifier" className="text-white/80">
              Téléphone ou nom d'utilisateur
            </Label>
            <Input
              id="identifier"
              data-testid="input-identifier"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Votre téléphone ou nom d'utilisateur"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
              required
            />
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

          <Button
            data-testid="button-submit"
            type="submit"
            className="w-full h-12 bg-[#22C55E] hover:bg-[#22C55E]/90 text-white font-bold"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? 'Connexion...' : 'Connexion'}
          </Button>

          <div className="text-center">
            <Link href="/register" className="text-primary hover:underline text-sm">
              Pas encore de compte ? Inscrivez-vous
            </Link>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
