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
  // Dismissed only lasts for the current page session — reappears on refresh
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isInStandalone()) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

    if (isIos()) {
      setTimeout(() => setShowIosBanner(true), 1500);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setDismissed(true);
    }
  };

  const dismiss = () => {
    setDismissed(true);
    setDeferredPrompt(null);
    setShowIosBanner(false);
  };

  if (dismissed || isInStandalone()) return null;

  // Android / Chrome — native install prompt available
  if (deferredPrompt) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-[#1a2a5e] text-white px-4 py-3 flex items-center gap-3 shadow-lg"
        style={{ animation: 'slideDown 0.3s ease' }}>
        <img src="/icon-192.png" alt="Muzan" className="w-9 h-9 rounded-xl shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold leading-tight">Installer Muzan Service</p>
          <p className="text-xs text-white/60">Accès rapide depuis votre écran d'accueil</p>
        </div>
        <button
          onClick={handleInstall}
          className="bg-green-500 hover:bg-green-400 text-white text-xs font-bold px-3 py-2 rounded-xl shrink-0 flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          Installer
        </button>
        <button onClick={dismiss} className="text-white/40 hover:text-white shrink-0 ml-1">
          <X className="w-4 h-4" />
        </button>
        <style>{`
          @keyframes slideDown {
            from { opacity: 0; transform: translateY(-100%); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    );
  }

  // iOS Safari — manual instructions
  if (showIosBanner) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-[#1a2a5e] text-white px-4 py-3 shadow-lg"
        style={{ animation: 'slideDown 0.3s ease' }}>
        <div className="flex items-center gap-3 mb-1.5">
          <img src="/icon-192.png" alt="Muzan" className="w-9 h-9 rounded-xl shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold">Installer Muzan Service</p>
          </div>
          <button onClick={dismiss} className="text-white/40 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-white/70 leading-relaxed pl-12">
          Appuyez sur <Share className="w-3 h-3 inline mx-0.5 -mt-0.5" /> <strong>Partager</strong>{' '}
          puis <strong>« Sur l'écran d'accueil »</strong> pour installer l'application.
        </p>
        <style>{`
          @keyframes slideDown {
            from { opacity: 0; transform: translateY(-100%); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    );
  }

  return null;
}
