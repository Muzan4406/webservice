import { useGetProfile, useGetAppSettings, useLogout } from '@workspace/api-client-react';
import { useAuth } from '@/contexts/AuthContext';
import { BottomNav } from '@/components/BottomNav';
import {
  Star, ChevronRight, MessageCircle, Send, History, Users,
  LogOut, Calendar, AtSign, Smartphone, Shield, Phone,
} from 'lucide-react';
import { useLocation } from 'wouter';
import { toast } from '@/lib/toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const BASE_URL = import.meta.env.BASE_URL;

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <div className="w-9 h-9 rounded-xl bg-[#1a2a5e]/8 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="font-bold text-gray-900 text-sm truncate">{value}</p>
      </div>
    </div>
  );
}

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

      {/* Hero header */}
      <div className="bg-gradient-to-br from-[#1a2a5e] to-[#0f1a3e] px-5 pt-14 pb-16 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />

        {profile.isLoading ? (
          <div className="flex justify-center py-4">
            <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
          </div>
        ) : user ? (
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-white/20 shrink-0">
              <img
                src={user.photoUrl || `${BASE_URL}logo.png`}
                alt={user.username}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-lg font-bold text-white truncate">{user.username}</span>
                {user.isVip && (
                  <span className="inline-flex items-center gap-1 bg-[#FFD700] text-black text-[11px] font-bold px-2 py-0.5 rounded-full">
                    <Star className="w-3 h-3" /> VIP
                  </span>
                )}
              </div>
              <p className="text-white/50 text-xs mt-0.5">ID: {user.userId}</p>
              <p className="text-white/40 text-xs">{user.country}</p>
            </div>
          </div>
        ) : null}
      </div>

      {/* Content overlaps header */}
      {user && (
        <div className="relative z-10 px-4 -mt-6 space-y-3">

          {/* Admin shortcut */}
          {user.isAdmin && (
            <button
              onClick={() => setLocation('/admin')}
              className="w-full bg-[#1a2a5e] rounded-2xl p-4 flex items-center gap-3 shadow-md text-left active:scale-[0.99] transition-transform"
            >
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white text-sm">Administration</p>
                <p className="text-white/55 text-xs">Gérer dépôts, retraits & concours</p>
              </div>
              <ChevronRight className="w-4 h-4 text-white/40 shrink-0" />
            </button>
          )}

          {/* Informations */}
          <Section label="Informations">
            {user.phone && (
              <InfoRow
                icon={<Phone className="w-4 h-4 text-[#1a2a5e]" />}
                label="Téléphone"
                value={user.phone}
              />
            )}
            <Divider />
            <InfoRow
              icon={<AtSign className="w-4 h-4 text-[#1a2a5e]" />}
              label="Nom d'utilisateur"
              value={user.username}
            />
            <Divider />
            <InfoRow
              icon={<Smartphone className="w-4 h-4 text-[#1a2a5e]" />}
              label="ID utilisateur"
              value={user.userId}
            />
            <Divider />
            <InfoRow
              icon={<Calendar className="w-4 h-4 text-[#1a2a5e]" />}
              label="Membre depuis"
              value={format(new Date(user.createdAt), 'd MMMM yyyy', { locale: fr })}
            />
          </Section>

          {/* Finances */}
          <Section label="Finances">
            <NavRow
              icon={<History className="w-4 h-4 text-green-600" />}
              iconBg="bg-green-50"
              label="Historique des transactions"
              onClick={() => setLocation('/transactions')}
            />
          </Section>

          {/* Parrainage */}
          <Section label="Parrainage">
            <NavRow
              icon={<Users className="w-4 h-4 text-green-600" />}
              iconBg="bg-green-50"
              label={
                <span className="flex flex-col">
                  <span className="text-xs text-gray-400 font-normal">Mon code</span>
                  <span className="text-green-600 font-bold tracking-wider">{user.referralCode}</span>
                </span>
              }
              onClick={() => setLocation('/referral')}
            />
          </Section>

          {/* Support */}
          {(settings?.whatsappChannelUrl || settings?.whatsappSupport1Url || settings?.whatsappSupport2Url || settings?.telegramSupportUrl) && (
            <Section label="Support">
              {settings?.whatsappChannelUrl && (
                <a href={settings.whatsappChannelUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                      <MessageCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 text-sm">Chaîne WhatsApp</p>
                      <p className="text-xs text-gray-400">Suivre nos annonces</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </a>
              )}
              {settings?.whatsappSupport1Url && <><Divider />
                <a href={settings.whatsappSupport1Url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                      <MessageCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 text-sm">WhatsApp Support 1</p>
                      <p className="text-xs text-gray-400">Contacter un conseiller</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </a>
              </>}
              {settings?.whatsappSupport2Url && <><Divider />
                <a href={settings.whatsappSupport2Url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                      <MessageCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 text-sm">WhatsApp Support 2</p>
                      <p className="text-xs text-gray-400">Contacter un conseiller</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </a>
              </>}
              {settings?.telegramSupportUrl && <><Divider />
                <a href={settings.telegramSupportUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                      <Send className="w-4 h-4 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 text-sm">Telegram Support</p>
                      <p className="text-xs text-gray-400">Contacter un conseiller</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </a>
              </>}
            </Section>
          )}

          {/* Déconnexion */}
          <button
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
            className="w-full h-12 rounded-2xl bg-red-50 border border-red-100 text-red-500 font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.99] transition-all hover:bg-red-100"
          >
            <LogOut className="w-4 h-4" />
            {logoutMutation.isPending ? 'Déconnexion...' : 'Se déconnecter'}
          </button>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

/* ─── Helpers ─── */
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-1">{label}</p>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100">
        {children}
      </div>
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-gray-100 mx-5" />;
}

function NavRow({ icon, iconBg, label, onClick }: {
  icon: React.ReactNode;
  iconBg: string;
  label: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
          {icon}
        </div>
        <span className="text-sm font-medium text-gray-800">{label}</span>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-300" />
    </button>
  );
}
