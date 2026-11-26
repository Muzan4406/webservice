import { useGetProfile, useGetAppSettings, useLogout } from '@workspace/api-client-react';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { BottomNav } from '@/components/BottomNav';
import {
  Star, ChevronRight, MessageCircle, Send, History, Users,
  LogOut, Calendar, AtSign, Smartphone, Shield, Phone, UserRound,
} from 'lucide-react';
import { useLocation } from 'wouter';
import { toast } from '@/lib/toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const BASE_URL = import.meta.env.BASE_URL;

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex min-h-[72px] items-center gap-3.5 px-4 py-3 sm:px-5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef1fa] text-[#1a2a5e]">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="truncate text-sm font-semibold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { logout: authLogout, updateUser, user: cachedUser } = useAuth();
  const [, setLocation] = useLocation();
  const profile = useGetProfile();
  const appSettings = useGetAppSettings();
  const logoutMutation = useLogout();

  // Sync fresh profile data back into AuthContext so other pages reflect VIP status immediately.
  useEffect(() => {
    const fresh = profile.data as any;
    if (fresh) {
      updateUser({
        isVip: fresh.isVip,
        vipExpiresAt: fresh.vipExpiresAt ?? null,
        username: fresh.username,
        referralCount: fresh.referralCount,
      });
    }
  }, [profile.data]);

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        authLogout();
        toast.success('Déconnexion réussie');
        setLocation('/login');
      },
    });
  };

  const user = (profile.data ?? cachedUser) as any;
  const settings = appSettings.data as any;
  const profileErrorMessage = profile.error instanceof Error
    ? profile.error.message
    : 'Impossible de récupérer les informations du profil.';

  return (
    <div className="min-h-[100dvh] bg-[#f3f5fa] pb-24">
      <header className="relative overflow-hidden bg-gradient-to-br from-[#1a2a5e] via-[#19285a] to-[#111c42] px-4 pb-14 pt-10 text-white sm:px-8 sm:pb-[4.5rem] sm:pt-12">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full border border-white/[0.08]" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-4 -top-12 h-48 w-48 rounded-full border border-white/[0.08]" />
        <div className="relative mx-auto max-w-5xl">
          <div className="mb-5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/50">
            <UserRound className="h-3.5 w-3.5" /> Mon compte
          </div>
          {profile.isLoading ? (
            <div className="flex items-center gap-4" aria-label="Chargement du profil">
              <div className="h-16 w-16 animate-pulse rounded-2xl bg-white/15" />
              <div className="space-y-2">
                <div className="h-5 w-36 animate-pulse rounded bg-white/15" />
                <div className="h-3 w-24 animate-pulse rounded bg-white/10" />
              </div>
            </div>
          ) : user ? (
            <div className="flex items-center gap-4">
              <div className="h-[68px] w-[68px] shrink-0 overflow-hidden rounded-2xl border border-white/25 bg-white/10 shadow-lg">
                <img src={user.photoUrl || `${BASE_URL}logo.png`} alt={user.username} className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="max-w-full truncate text-xl font-extrabold tracking-tight sm:text-2xl">{user.username}</h1>
                  {user.isVip && (
                    <motion.span
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="inline-flex items-center gap-1 rounded-full bg-[#f4c64e] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-[#3c2e0b]"
                    >
                      <Star className="h-3 w-3 fill-current" /> VIP
                    </motion.span>
                  )}
                </div>
                <p className="mt-1 text-xs font-medium tracking-wide text-white/60">ID : {user.userId}</p>
              </div>
            </div>
          ) : (
            <div>
              <h1 className="text-2xl font-extrabold">Mon compte</h1>
              <p className="mt-1 text-sm text-white/60">Vos informations personnelles</p>
            </div>
          )}
        </div>
      </header>

      {user && (
        <main className="relative z-10 mx-auto -mt-6 max-w-5xl space-y-5 px-4 sm:px-8">
          {profile.isError && (
            <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 shadow-sm">
              <p className="font-bold">Profil affiché depuis cet appareil</p>
              <p className="mt-1 text-amber-900/80">{profileErrorMessage}</p>
              <button
                onClick={() => void profile.refetch()}
                disabled={profile.isFetching}
                className="mt-3 min-h-10 rounded-xl bg-amber-800 px-4 text-sm font-bold text-white transition hover:bg-amber-900 disabled:opacity-60"
              >
                {profile.isFetching ? 'Actualisation...' : 'Réessayer'}
              </button>
            </div>
          )}

          {user.isAdmin && (
            <button
              onClick={() => setLocation('/admin')}
              className="flex min-h-[76px] w-full items-center gap-3 rounded-2xl bg-[#1a2a5e] p-4 text-left shadow-md transition hover:bg-[#22366f] active:scale-[0.995]"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10"><Shield className="h-5 w-5 text-white" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-white">Administration</span>
                <span className="mt-0.5 block text-xs text-white/60">Gérer dépôts, retraits & concours</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-white/50" />
            </button>
          )}

          <Section label="Informations">
            {user.phone && <InfoRow icon={<Phone className="h-4 w-4" />} label="Téléphone" value={user.phone} />}
            <Divider />
            <InfoRow icon={<AtSign className="h-4 w-4" />} label="Nom d'utilisateur" value={user.username} />
            <Divider />
            <InfoRow icon={<Smartphone className="h-4 w-4" />} label="ID utilisateur" value={user.userId} />
            <Divider />
            <InfoRow icon={<Calendar className="h-4 w-4" />} label="Membre depuis" value={format(new Date(user.createdAt), 'd MMMM yyyy', { locale: fr })} />
          </Section>

          <Section label="Accès VIP">
            <div className="p-4 sm:p-5">
              <div className="flex items-start gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff6df] text-amber-600">
                  <Star className="h-4 w-4 fill-amber-400" />
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-xs font-medium text-slate-500">Statut</p>
                  <p className="mt-0.5 text-sm font-bold text-slate-900">{user.isVip ? 'VIP actif' : 'VIP inactif'}</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                    {user.isVip
                      ? user.vipExpiresAt
                        ? `Valide jusqu’au ${format(new Date(user.vipExpiresAt), 'd MMMM yyyy', { locale: fr })}`
                        : 'Votre accès actuel reste actif; le prochain paiement définira son échéance.'
                      : 'L’accès VIP dure 30 jours après confirmation du paiement.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setLocation('/vip-purchase')}
                className="mt-4 min-h-12 w-full rounded-xl bg-[#e8ae32] px-4 text-sm font-extrabold text-[#332607] transition hover:bg-[#dda127] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
              >
                {user.isVip ? 'Renouveler mon VIP' : 'Activer mon VIP'}
              </button>
            </div>
          </Section>

          <Section label="Finances">
            <NavRow icon={<History className="h-4 w-4" />} iconBg="bg-emerald-50 text-emerald-700" label="Historique des transactions" onClick={() => setLocation('/transactions')} />
          </Section>

          <Section label="Parrainage">
            <NavRow
              icon={<Users className="h-4 w-4" />}
              iconBg="bg-emerald-50 text-emerald-700"
              label={<span className="flex flex-col gap-0.5"><span className="text-xs font-medium text-slate-500">Mon code</span><span className="font-bold tracking-wider text-emerald-700">{user.referralCode}</span></span>}
              onClick={() => setLocation('/referral')}
            />
          </Section>

          {(settings?.whatsappChannelUrl || settings?.whatsappSupport1Url || settings?.whatsappSupport2Url || settings?.telegramSupportUrl) && (
            <Section label="Support">
              {settings?.whatsappChannelUrl && <SupportLink href={settings.whatsappChannelUrl} icon={<MessageCircle className="h-4 w-4" />} label="Chaîne WhatsApp" detail="Suivre nos annonces" tone="green" />}
              {settings?.whatsappSupport1Url && <><Divider /><SupportLink href={settings.whatsappSupport1Url} icon={<MessageCircle className="h-4 w-4" />} label="WhatsApp Support 1" detail="Contacter un conseiller" tone="green" /></>}
              {settings?.whatsappSupport2Url && <><Divider /><SupportLink href={settings.whatsappSupport2Url} icon={<MessageCircle className="h-4 w-4" />} label="WhatsApp Support 2" detail="Contacter un conseiller" tone="green" /></>}
              {settings?.telegramSupportUrl && <><Divider /><SupportLink href={settings.telegramSupportUrl} icon={<Send className="h-4 w-4" />} label="Telegram Support" detail="Contacter un conseiller" tone="blue" /></>}
            </Section>
          )}

          <button
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 text-sm font-bold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
          >
            <LogOut className="h-4 w-4" />
            {logoutMutation.isPending ? 'Déconnexion...' : 'Se déconnecter'}
          </button>
        </main>
      )}

      {!user && profile.isError && (
        <div role="alert" className="relative z-10 mx-4 -mt-6 rounded-2xl border border-rose-200 bg-white p-5 shadow-sm sm:mx-auto sm:max-w-2xl">
          <p className="font-bold text-slate-900">Le profil ne peut pas être chargé.</p>
          <p className="mt-1 text-sm text-slate-600">{profileErrorMessage}</p>
          <button onClick={() => void profile.refetch()} disabled={profile.isFetching} className="mt-4 min-h-11 rounded-xl bg-[#1a2a5e] px-4 text-sm font-semibold text-white disabled:opacity-60">
            {profile.isFetching ? 'Actualisation...' : 'Réessayer'}
          </button>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="px-1 text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-500">{label}</h2>
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_2px_10px_rgba(20,35,75,0.045)] divide-y divide-slate-100">
        {children}
      </div>
    </section>
  );
}

function Divider() {
  return <div className="mx-4 h-px bg-slate-100 sm:mx-5" />;
}

function NavRow({ icon, iconBg, label, onClick }: {
  icon: React.ReactNode;
  iconBg: string;
  label: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="flex min-h-[68px] w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-50 sm:px-5">
      <span className="flex min-w-0 items-center gap-3.5">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>{icon}</span>
        <span className="text-sm font-semibold text-slate-800">{label}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
    </button>
  );
}

function SupportLink({ href, icon, label, detail, tone }: {
  href: string; icon: React.ReactNode; label: string; detail: string; tone: 'green' | 'blue';
}) {
  const tint = tone === 'green' ? 'bg-emerald-50 text-emerald-700' : 'bg-sky-50 text-sky-700';
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="flex min-h-[68px] items-center justify-between gap-3 px-4 py-3 transition hover:bg-slate-50 sm:px-5">
      <span className="flex min-w-0 items-center gap-3.5">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tint}`}>{icon}</span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-slate-800">{label}</span>
          <span className="mt-0.5 block text-xs text-slate-500">{detail}</span>
        </span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
    </a>
  );
}
