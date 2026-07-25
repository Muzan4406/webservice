import { useGetProfile, useGetAppSettings, useLogout } from '@workspace/api-client-react';
import { useAuth } from '@/contexts/AuthContext';
import { BottomNav } from '@/components/BottomNav';
import {
  Star, ChevronRight, MessageCircle, Send, History, Users,
  LogOut, Calendar, AtSign, Smartphone, Hash, Shield, Phone,
} from 'lucide-react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function ProfilePage() {
  const { logout: authLogout } = useAuth();
  const [, setLocation] = useLocation();
  const profile = useGetProfile();
  const appSettings = useGetAppSettings();
  const logoutMutation = useLogout();

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        authLogout();
        toast.success('Déconnexion réussie');
        setLocation('/login');
      },
    });
  };

  const user = profile.data as any;
  const settings = appSettings.data as any;

  return (
    <div className="min-h-screen bg-[#F4F6FB] pb-24">
      {/* Top bar */}
      <div className="bg-white px-5 pt-6 pb-4 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">Profil</h1>
      </div>

      {profile.isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : user ? (
        <div className="pt-4 space-y-4 px-4">

          {/* ── User card ── */}
          <div className="bg-white rounded-2xl p-5 flex items-center gap-4 shadow-sm border border-gray-100">
            {user.photoUrl ? (
              <img src={user.photoUrl} alt={user.username} className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary shrink-0">
                {user.username.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-lg font-bold text-gray-900">{user.username}</span>
                {user.isVip && (
                  <span className="inline-flex items-center gap-1 bg-[#FFD700] text-black text-xs font-bold px-2 py-0.5 rounded-full">
                    <Star className="w-3 h-3" /> VIP
                  </span>
                )}
              </div>
              <p className="text-gray-500 text-sm mt-0.5">ID: {user.userId}</p>
            </div>
          </div>

          {/* ── Administration (admin only) ── */}
          {user.isAdmin && (
            <button
              onClick={() => setLocation('/admin')}
              className="w-full bg-[#1a2a5e] rounded-2xl p-4 flex items-center gap-4 shadow-sm text-left"
            >
              <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white">Administration</p>
                <p className="text-white/60 text-sm">Gérer les dépôts, retraits et concours</p>
              </div>
              <ChevronRight className="w-5 h-5 text-white/50 shrink-0" />
            </button>
          )}

          {/* ── INFORMATIONS ── */}
          <div className="space-y-1">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">Informations</p>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-100">
              {user.phone && (
                <div className="flex items-center gap-3 px-5 py-4">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Téléphone</p>
                    <p className="font-bold text-gray-900">{user.phone}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3 px-5 py-4">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <AtSign className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Nom d'utilisateur</p>
                  <p className="font-bold text-gray-900">{user.username}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 px-5 py-4">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <Smartphone className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">ID utilisateur</p>
                  <p className="font-bold text-gray-900">{user.userId}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 px-5 py-4">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Membre depuis</p>
                  <p className="font-bold text-gray-900">
                    {format(new Date(user.createdAt), 'd MMMM yyyy', { locale: fr })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── FINANCES ── */}
          <div className="space-y-1">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">Finances</p>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <button
                onClick={() => setLocation('/transactions')}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
                    <History className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="font-medium text-gray-800">Historique des transactions</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>

          {/* ── PARRAINAGE ── */}
          <div className="space-y-1">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">Parrainage</p>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <button
                onClick={() => setLocation('/referral')}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
                    <Users className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs text-gray-400">Mon code</p>
                    <p className="text-base font-bold text-green-600 tracking-wider">{user.referralCode}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>

          {/* ── SUPPORT ── */}
          {(settings?.whatsappChannelUrl || settings?.whatsappSupport1Url || settings?.whatsappSupport2Url || settings?.telegramSupportUrl) && (
            <div className="space-y-1">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">Support</p>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-100">
                {settings?.whatsappChannelUrl && (
                  <a href={settings.whatsappChannelUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
                        <MessageCircle className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">Chaîne WhatsApp</p>
                        <p className="text-xs text-gray-400">Suivre nos annonces</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </a>
                )}
                {settings?.whatsappSupport1Url && (
                  <a href={settings.whatsappSupport1Url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
                        <MessageCircle className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">Service client WhatsApp 1</p>
                        <p className="text-xs text-gray-400">Contacter un conseiller</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </a>
                )}
                {settings?.whatsappSupport2Url && (
                  <a href={settings.whatsappSupport2Url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
                        <MessageCircle className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">Service client WhatsApp 2</p>
                        <p className="text-xs text-gray-400">Contacter un conseiller</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </a>
                )}
                {settings?.telegramSupportUrl && (
                  <a href={settings.telegramSupportUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                        <Send className="w-4 h-4 text-blue-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">Service client Telegram</p>
                        <p className="text-xs text-gray-400">Contacter un conseiller</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* ── Logout ── */}
          <button
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
            className="w-full h-13 rounded-2xl border border-red-200 bg-red-50 text-red-500 font-semibold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            {logoutMutation.isPending ? 'Déconnexion...' : 'Se déconnecter'}
          </button>
        </div>
      ) : null}

      <BottomNav />
    </div>
  );
}
