import { useGetProfile, useGetAppSettings, useLogout } from '@workspace/api-client-react';
import { useAuth } from '@/contexts/AuthContext';
import { BottomNav } from '@/components/BottomNav';
import { Star, ChevronRight, MessageCircle, Send, History, Users, LogOut, Calendar, Hash } from 'lucide-react';
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

  const user = profile.data;
  const settings = appSettings.data;

  return (
    <div className="min-h-screen bg-[#F4F6FB] pb-24">
      {/* Header */}
      <div className="bg-white px-4 pt-6 pb-4 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">Profil</h1>
      </div>

      {profile.isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1a3aff]" />
        </div>
      ) : user ? (
        <div className="pt-4 space-y-4 px-4">
          {/* Avatar + name card */}
          <div className="bg-white rounded-2xl p-5 flex flex-col items-center text-center space-y-3 shadow-sm">
            <div className="w-20 h-20 rounded-full bg-[#1a3aff]/10 flex items-center justify-center text-3xl font-bold text-[#1a3aff]">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center justify-center gap-2">
                <span className="text-xl font-bold text-gray-900">{user.username}</span>
                {user.isVip && (
                  <span className="inline-flex items-center gap-1 bg-[#FFD700] text-black text-xs font-bold px-2 py-0.5 rounded-full">
                    <Star className="w-3 h-3" />
                    VIP
                  </span>
                )}
              </div>
            </div>

            {/* Info rows */}
            <div className="w-full border-t border-gray-100 pt-3 space-y-2">
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Hash className="w-4 h-4 text-gray-400 shrink-0" />
                <span>{user.userId}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                <span>
                  Membre depuis{' '}
                  {format(new Date(user.createdAt), 'd MMMM yyyy', { locale: fr })}
                </span>
              </div>
            </div>
          </div>

          {/* FINANCES */}
          <div className="space-y-1">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">Finances</p>
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <button
                onClick={() => setLocation('/transactions')}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center">
                    <History className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="font-medium text-gray-800">Historique des transactions</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>

          {/* PARRAINAGE */}
          <div className="space-y-1">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">Parrainage</p>
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <button
                onClick={() => setLocation('/referral')}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center">
                    <Users className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs text-gray-500">Mon code</p>
                    <p className="text-base font-bold text-green-600 tracking-wider">
                      {user.referralCode}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>

          {/* SUPPORT */}
          <div className="space-y-1">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">Support</p>
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100">
              {/* WhatsApp channel */}
              {settings?.whatsappChannelUrl ? (
                <a
                  href={settings.whatsappChannelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center">
                      <MessageCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">Chaîne WhatsApp</p>
                      <p className="text-xs text-gray-400">Suivre nos annonces et actualités</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </a>
              ) : (
                <div className="flex items-center justify-between px-5 py-4 opacity-50">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                      <MessageCircle className="w-4 h-4 text-gray-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-500">Chaîne WhatsApp</p>
                      <p className="text-xs text-gray-400">Suivre nos annonces et actualités</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>
              )}

              {/* WhatsApp Support 1 */}
              {settings?.whatsappSupport1Url ? (
                <a
                  href={settings.whatsappSupport1Url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center">
                      <MessageCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">Service client WhatsApp 1</p>
                      <p className="text-xs text-gray-400">Contacter un conseiller</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </a>
              ) : (
                <div className="flex items-center justify-between px-5 py-4 opacity-50">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                      <MessageCircle className="w-4 h-4 text-gray-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-500">Service client WhatsApp 1</p>
                      <p className="text-xs text-gray-400">Contacter un conseiller</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>
              )}

              {/* WhatsApp Support 2 */}
              {settings?.whatsappSupport2Url ? (
                <a
                  href={settings.whatsappSupport2Url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center">
                      <MessageCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">Service client WhatsApp 2</p>
                      <p className="text-xs text-gray-400">Contacter un conseiller</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </a>
              ) : (
                <div className="flex items-center justify-between px-5 py-4 opacity-50">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                      <MessageCircle className="w-4 h-4 text-gray-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-500">Service client WhatsApp 2</p>
                      <p className="text-xs text-gray-400">Contacter un conseiller</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>
              )}

              {/* Telegram */}
              {settings?.telegramSupportUrl ? (
                <a
                  href={settings.telegramSupportUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
                      <Send className="w-4 h-4 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">Service client Telegram</p>
                      <p className="text-xs text-gray-400">Contacter un conseiller</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </a>
              ) : (
                <div className="flex items-center justify-between px-5 py-4 opacity-50">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                      <Send className="w-4 h-4 text-gray-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-500">Service client Telegram</p>
                      <p className="text-xs text-gray-400">Contacter un conseiller</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>
              )}
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
            className="w-full h-14 rounded-2xl border-2 border-red-200 bg-red-50 text-red-500 font-bold flex items-center justify-center gap-2 text-base hover:bg-red-100 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            {logoutMutation.isPending ? 'Déconnexion...' : 'Se déconnecter'}
          </button>
        </div>
      ) : null}

      <BottomNav />
    </div>
  );
}
