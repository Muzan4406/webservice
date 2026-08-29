import { useState } from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronDown,
  Gift,
  Headphones,
  Menu,
  ShieldCheck,
  Sparkles,
  Trophy,
  WalletCards,
  X,
  Zap,
} from 'lucide-react';

const BASE_URL = import.meta.env.BASE_URL;

const features = [
  {
    icon: BarChart3,
    title: 'Des coupons qui font la différence',
    description:
      'Retrouve chaque jour une sélection claire pour suivre tes opportunités sportives en toute simplicité.',
    accent: 'from-lime-300/20 to-lime-400/5',
    iconColor: 'text-lime-300',
  },
  {
    icon: WalletCards,
    title: 'Dépôts et retraits simplifiés',
    description:
      'Gère ton solde rapidement avec des moyens de paiement adaptés à ton quotidien en Afrique.',
    accent: 'from-amber-300/20 to-amber-400/5',
    iconColor: 'text-amber-300',
  },
  {
    icon: Gift,
    title: 'Un programme VIP généreux',
    description:
      'Débloque des avantages exclusifs, des coupons premium et un accompagnement encore plus proche.',
    accent: 'from-sky-300/20 to-sky-400/5',
    iconColor: 'text-sky-300',
  },
];

const steps = [
  {
    number: '01',
    title: 'Crée ton compte',
    description: 'Inscris-toi en quelques secondes avec ton téléphone ou ton adresse e-mail.',
  },
  {
    number: '02',
    title: 'Explore les opportunités',
    description: 'Accède aux coupons, promotions et services réunis dans un seul espace.',
  },
  {
    number: '03',
    title: 'Joue avec confiance',
    description: 'Profite d’un support disponible et d’une plateforme pensée pour toi.',
  },
];

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <main className="min-h-screen overflow-hidden bg-[#050b14] text-white selection:bg-lime-300 selection:text-[#08100b]">
      <section
        className="relative isolate"
        style={{
          background:
            'radial-gradient(circle at 78% 12%, rgba(111, 255, 31, 0.14), transparent 24%), radial-gradient(circle at 8% 26%, rgba(42, 74, 154, 0.22), transparent 30%), #050b14',
        }}
      >
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-40 [background-image:linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] [background-size:72px_72px] [mask-image:linear-gradient(to_bottom,black,transparent_78%)]" />

        <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
          <Link href="/" className="flex items-center gap-3" onClick={closeMenu}>
            <img
              src={`${BASE_URL}logo.png`}
              alt="Muzan Service"
              className="h-11 w-11 rounded-xl object-cover shadow-[0_0_28px_rgba(136,255,0,0.18)]"
            />
            <div className="leading-none">
              <p className="text-[15px] font-extrabold tracking-[0.16em] text-white">MUZAN</p>
              <p className="mt-1 text-[9px] font-bold tracking-[0.32em] text-lime-300">SERVICE</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-white/60 lg:flex">
            <a href="#fonctionnalites" className="transition hover:text-white">Fonctionnalités</a>
            <a href="#parcours" className="transition hover:text-white">Comment ça marche</a>
            <a href="#confiance" className="transition hover:text-white">Pourquoi Muzan</a>
          </nav>

          <div className="hidden items-center gap-3 sm:flex">
            <Link
              href="/login"
              className="rounded-full px-4 py-2.5 text-sm font-semibold text-white/75 transition hover:bg-white/5 hover:text-white"
            >
              Se connecter
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-full bg-lime-300 px-5 py-2.5 text-sm font-extrabold text-[#08100b] shadow-[0_10px_30px_rgba(155,255,50,0.16)] transition hover:-translate-y-0.5 hover:bg-lime-200"
            >
              Commencer
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <button
            type="button"
            aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            className="rounded-xl border border-white/10 p-2.5 text-white sm:hidden"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </header>

        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-5 rounded-2xl border border-white/10 bg-[#0c1724]/95 p-3 shadow-2xl backdrop-blur-xl sm:hidden"
          >
            <div className="flex flex-col gap-1 text-sm font-semibold text-white/75">
              <a href="#fonctionnalites" onClick={closeMenu} className="rounded-xl px-4 py-3 hover:bg-white/5">Fonctionnalités</a>
              <a href="#parcours" onClick={closeMenu} className="rounded-xl px-4 py-3 hover:bg-white/5">Comment ça marche</a>
              <a href="#confiance" onClick={closeMenu} className="rounded-xl px-4 py-3 hover:bg-white/5">Pourquoi Muzan</a>
              <div className="mt-2 grid grid-cols-2 gap-2 border-t border-white/10 pt-3">
                <Link href="/login" onClick={closeMenu} className="rounded-xl px-4 py-3 text-center hover:bg-white/5">Connexion</Link>
                <Link href="/register" onClick={closeMenu} className="rounded-xl bg-lime-300 px-4 py-3 text-center font-extrabold text-[#08100b]">Créer un compte</Link>
              </div>
            </div>
          </motion.div>
        )}

        <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 pb-20 pt-14 sm:px-8 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:px-10 lg:pb-28 lg:pt-24">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl"
          >
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-lime-300/20 bg-lime-300/[0.08] px-3.5 py-2 text-xs font-bold text-lime-200">
              <Sparkles className="h-3.5 w-3.5" />
              La plateforme pensée pour les passionnés
            </div>
            <h1 className="text-5xl font-extrabold leading-[1.04] tracking-[-0.05em] text-white sm:text-6xl lg:text-7xl">
              Ta passion.
              <span className="block bg-gradient-to-r from-lime-200 via-lime-300 to-emerald-400 bg-clip-text text-transparent">
                Tes opportunités.
              </span>
              <span className="block">Ton service.</span>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-white/60 sm:text-lg">
              Muzan Service réunit coupons, promotions, paiements et avantages VIP dans une expérience simple, rapide et sécurisée.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-lime-300 px-6 py-3.5 text-sm font-extrabold text-[#08100b] shadow-[0_14px_40px_rgba(155,255,50,0.2)] transition hover:-translate-y-0.5 hover:bg-lime-200"
              >
                Créer mon compte gratuitement
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </Link>
              <a
                href="#fonctionnalites"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 px-6 py-3.5 text-sm font-bold text-white/80 transition hover:border-white/30 hover:bg-white/5 hover:text-white"
              >
                Découvrir Muzan
                <ChevronDown className="h-4 w-4" />
              </a>
            </div>
            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-semibold text-white/45">
              <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-lime-300" />Inscription rapide</span>
              <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-lime-300" />Support réactif</span>
              <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-lime-300" />Espace sécurisé</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.12 }}
            className="relative mx-auto w-full max-w-[510px]"
          >
            <div className="absolute -inset-12 rounded-full bg-lime-300/10 blur-3xl" />
            <div className="relative rounded-[2rem] border border-white/10 bg-white/[0.07] p-3 shadow-2xl backdrop-blur-sm">
              <div className="overflow-hidden rounded-[1.55rem] border border-white/10 bg-[#0a1422]">
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                  <div className="flex items-center gap-2.5">
                    <img src={`${BASE_URL}logo.png`} alt="" className="h-8 w-8 rounded-lg object-cover" />
                    <div>
                      <p className="text-[10px] font-extrabold tracking-[0.16em] text-white">MUZAN SERVICE</p>
                      <p className="mt-1 text-[9px] text-white/40">TON ESPACE, TES RÈGLES</p>
                    </div>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-lime-300/10">
                    <Zap className="h-4 w-4 text-lime-300" />
                  </div>
                </div>
                <div className="p-5 sm:p-7">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xs font-medium text-white/45">Bonjour, champion</p>
                      <p className="mt-1 text-xl font-extrabold text-white">Prêt à jouer ?</p>
                    </div>
                    <span className="rounded-full border border-lime-300/20 bg-lime-300/10 px-2.5 py-1 text-[10px] font-extrabold text-lime-200">ACTIF</span>
                  </div>
                  <div className="mt-6 rounded-2xl bg-gradient-to-br from-[#183561] to-[#10253c] p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[11px] text-white/55">Solde disponible</p>
                        <p className="mt-2 text-3xl font-extrabold tracking-tight text-white">24 850 <span className="text-base text-white/50">FCFA</span></p>
                      </div>
                      <div className="rounded-xl bg-lime-300 p-2.5 text-[#08100b]">
                        <WalletCards className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="mt-6 flex items-center gap-2 text-[10px] font-bold text-lime-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-lime-300" />
                      Compte vérifié et sécurisé
                    </div>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                      <div className="flex items-center gap-2 text-lime-300"><BarChart3 className="h-4 w-4" /><span className="text-[10px] font-bold">COUPONS</span></div>
                      <p className="mt-3 text-sm font-bold text-white">Du jour</p>
                      <p className="mt-1 text-[10px] text-white/40">Sélection premium</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                      <div className="flex items-center gap-2 text-amber-300"><Gift className="h-4 w-4" /><span className="text-[10px] font-bold">AVANTAGES</span></div>
                      <p className="mt-3 text-sm font-bold text-white">Programme VIP</p>
                      <p className="mt-1 text-[10px] text-white/40">Accès exclusif</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-5 -left-5 hidden items-center gap-3 rounded-2xl border border-white/10 bg-[#101d2c]/95 px-4 py-3 shadow-xl backdrop-blur sm:flex">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-lime-300/15 text-lime-300"><Trophy className="h-4 w-4" /></div>
              <div><p className="text-[10px] font-extrabold text-white">Nouveaux avantages</p><p className="mt-1 text-[10px] text-white/45">Chaque semaine</p></div>
            </div>
          </motion.div>
        </div>

        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-px border-y border-white/10 bg-white/10 sm:grid-cols-3">
          {[
            ['01', 'Coupons & promotions', 'Pour ne rien manquer'],
            ['02', 'Paiements rapides', 'Simple au quotidien'],
            ['03', 'Support 24/7', 'Une équipe à ton écoute'],
          ].map(([number, title, subtitle]) => (
            <div key={number} className="bg-[#08111d] px-6 py-5 sm:px-8">
              <div className="flex items-center gap-4">
                <span className="text-xs font-extrabold text-lime-300">{number}</span>
                <div>
                  <p className="text-sm font-bold text-white">{title}</p>
                  <p className="mt-1 text-xs text-white/40">{subtitle}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="fonctionnalites" className="bg-[#f5f7f2] px-5 py-24 text-[#0c1722] sm:px-8 lg:px-10 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-[#5d9716]">Tout au même endroit</p>
            <h2 className="mt-4 text-4xl font-extrabold tracking-[-0.04em] sm:text-5xl">L’essentiel, sans complication.</h2>
            <p className="mt-5 text-base leading-7 text-[#0c1722]/60">Une expérience fluide et des outils utiles pour avancer à ton rythme.</p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.article
                  key={feature.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ delay: index * 0.08 }}
                  className="group rounded-3xl border border-[#0c1722]/10 bg-white p-7 shadow-[0_16px_45px_rgba(20,40,20,0.06)] transition hover:-translate-y-1"
                >
                  <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.accent}`}>
                    <Icon className={`h-6 w-6 ${feature.iconColor}`} />
                  </div>
                  <h3 className="mt-7 text-xl font-extrabold tracking-tight">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#0c1722]/55">{feature.description}</p>
                  <div className="mt-7 flex items-center gap-2 text-xs font-extrabold text-[#5d9716]">
                    En savoir plus <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
                  </div>
                </motion.article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="parcours" className="bg-[#0a1420] px-5 py-24 sm:px-8 lg:px-10 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-lime-300">Simple dès le départ</p>
            <h2 className="mt-4 text-4xl font-extrabold tracking-[-0.04em] text-white sm:text-5xl">Commence en trois étapes.</h2>
            <p className="mt-5 max-w-md text-base leading-7 text-white/50">Pas de parcours compliqué. Tu crées ton compte et tu retrouves immédiatement les services qui comptent.</p>
            <Link href="/register" className="mt-8 inline-flex items-center gap-2 text-sm font-extrabold text-lime-300 transition hover:text-lime-200">
              Rejoindre Muzan Service <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-4">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, x: 16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ delay: index * 0.1 }}
                className="flex gap-5 rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:p-6"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-lime-300 text-xs font-extrabold text-[#08100b]">{step.number}</span>
                <div><h3 className="font-extrabold text-white">{step.title}</h3><p className="mt-1.5 text-sm leading-6 text-white/45">{step.description}</p></div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="confiance" className="bg-[#f5f7f2] px-5 py-24 text-[#0c1722] sm:px-8 lg:px-10 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-[#5d9716]">Une plateforme qui te respecte</p>
            <h2 className="mt-4 max-w-xl text-4xl font-extrabold tracking-[-0.04em] sm:text-5xl">Plus de clarté. Plus de contrôle. Plus de confiance.</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                ['Espace sécurisé', 'Tes informations restent protégées.'],
                ['Support disponible', 'Une équipe pour répondre à tes questions.'],
                ['Expérience mobile', 'Muzan te suit partout, simplement.'],
                ['Avantages exclusifs', 'Des récompenses pour les membres actifs.'],
              ].map(([title, description]) => (
                <div key={title} className="flex gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#6ead16]" />
                  <div><p className="text-sm font-extrabold">{title}</p><p className="mt-1 text-xs leading-5 text-[#0c1722]/55">{description}</p></div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative overflow-hidden rounded-[2rem] bg-[#10253a] p-8 text-white sm:p-10">
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-lime-300/15 blur-3xl" />
            <Headphones className="relative h-8 w-8 text-lime-300" />
            <p className="relative mt-10 text-2xl font-extrabold leading-tight">Besoin d’aide ?<br />On est là pour toi.</p>
            <p className="relative mt-4 text-sm leading-6 text-white/50">Une question sur ton compte, un dépôt ou un coupon ? Notre support est à ton écoute.</p>
            <Link href="/register" className="relative mt-8 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-extrabold text-[#10253a] transition hover:bg-lime-200">
              Créer mon compte <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-[#050b14] px-5 py-20 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-4xl rounded-[2rem] border border-lime-300/20 bg-gradient-to-br from-[#132d31] to-[#0b1722] px-6 py-12 text-center sm:px-12">
          <Sparkles className="mx-auto h-7 w-7 text-lime-300" />
          <h2 className="mt-5 text-3xl font-extrabold tracking-[-0.04em] text-white sm:text-4xl">Prêt à passer au niveau supérieur ?</h2>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-white/50">Rejoins la communauté Muzan Service et découvre une nouvelle façon de gérer ton expérience.</p>
          <Link href="/register" className="mt-8 inline-flex items-center gap-2 rounded-full bg-lime-300 px-6 py-3.5 text-sm font-extrabold text-[#08100b] transition hover:bg-lime-200">
            Commencer maintenant <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-[#050b14] px-5 py-8 sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
          <div className="flex items-center gap-3">
            <img src={`${BASE_URL}logo.png`} alt="" className="h-8 w-8 rounded-lg object-cover" />
            <p className="text-xs font-bold text-white/55">© {new Date().getFullYear()} Muzan Service. Tous droits réservés.</p>
          </div>
          <div className="flex items-center gap-5 text-xs font-semibold text-white/40">
            <Link href="/login" className="transition hover:text-white">Connexion</Link>
            <Link href="/register" className="transition hover:text-white">Inscription</Link>
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-lime-300" />Sécurisé</span>
          </div>
        </div>
      </footer>
    </main>
  );
}