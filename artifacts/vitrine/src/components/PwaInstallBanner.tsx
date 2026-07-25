import { useEffect, useState } from 'react';
import { X, Download, Share } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const isIos = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) &&
  !(window.navigator as any).standalone;

const isInStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (window.navigator as any).standalone === true;

export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosBanner, setShowIosBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isInStandalone()) return;
    if (localStorage.getItem('pwa-banner-dismissed')) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Show iOS banner after a short delay
    if (isIos()) {
      setTimeout(() => setShowIosBanner(true), 2000);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  };

  const dismiss = () => {
    setDismissed(true);
    setDeferredPrompt(null);
    setShowIosBanner(false);
    localStorage.setItem('pwa-banner-dismissed', '1');
  };

  if (dismissed || isInStandalone()) return null;

  // Android / Chrome — native install prompt available
  if (deferredPrompt) {
    return (
      <div className="fixed bottom-20 left-4 right-4 z-50 bg-[#1a2a5e] text-white rounded-2xl shadow-xl p-4 flex items-center gap-3 animate-fade-in">
        <img src="/icon-192.png" alt="Muzan" className="w-10 h-10 rounded-xl shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold">Installer Muzan Service</p>
          <p className="text-xs text-white/60">Accès rapide depuis votre écran d'accueil</p>
        </div>
        <button
          onClick={handleInstall}
          className="bg-green-500 hover:bg-green-400 text-white text-xs font-bold px-3 py-2 rounded-xl shrink-0 flex items-center gap-1"
        >
          <Download className="w-3.5 h-3.5" />
          Installer
        </button>
        <button onClick={dismiss} className="text-white/40 hover:text-white/80 shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // iOS Safari — manual instructions
  if (showIosBanner) {
    return (
      <div className="fixed bottom-20 left-4 right-4 z-50 bg-[#1a2a5e] text-white rounded-2xl shadow-xl p-4 animate-fade-in">
        <div className="flex items-center gap-3 mb-2">
          <img src="/icon-192.png" alt="Muzan" className="w-9 h-9 rounded-xl shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold">Installer Muzan Service</p>
          </div>
          <button onClick={dismiss} className="text-white/40 hover:text-white/80">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-white/70 leading-relaxed">
          Appuyez sur <Share className="w-3.5 h-3.5 inline mx-0.5 -mt-0.5" /> <strong>Partager</strong> puis{' '}
          <strong>« Sur l'écran d'accueil »</strong> pour installer l'application.
        </p>
      </div>
    );
  }

  return null;
}
