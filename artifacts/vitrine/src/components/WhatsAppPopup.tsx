import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useGetAppSettings } from '@workspace/api-client-react';

const MESSAGES = [
  'Recevez les coupons du jour en avant-première, avant tout le monde !',
  'Des codes promo exclusifs partagés chaque semaine — ne les manquez pas.',
  'Soyez le premier informé des concours, récompenses et offres spéciales.',
];

export function WhatsAppPopup() {
  const [visible, setVisible] = useState(false);
  const { data: settings } = useGetAppSettings();
  const channelUrl = (settings as any)?.whatsappChannelUrl;

  const [message] = useState(() => MESSAGES[Math.floor(Math.random() * MESSAGES.length)]);

  useEffect(() => {
    if (!channelUrl) return;
    const timer = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(timer);
  }, [channelUrl]);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => setVisible(false), 9000);
    return () => clearTimeout(timer);
  }, [visible]);

  if (!visible || !channelUrl) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={() => setVisible(false)}
        style={{ animation: 'waBgIn 0.25s ease' }}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6 pointer-events-none sm:items-center">
        <div
          className="w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden pointer-events-auto"
          style={{ animation: 'waSlideUp 0.35s cubic-bezier(0.34,1.4,0.64,1)' }}
        >
          {/* Header */}
          <div className="relative bg-gradient-to-br from-[#1FAD53] to-[#25D366] px-5 pt-5 pb-6">
            <button
              onClick={() => setVisible(false)}
              className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              aria-label="Fermer"
            >
              <X className="w-4 h-4 text-white" />
            </button>

            {/* Logo + name */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shadow-inner">
                <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </div>
              <div>
                <p className="text-white font-bold text-base leading-tight">Chaîne WhatsApp Officielle</p>
                <p className="text-white/70 text-xs font-medium mt-0.5">Muzan Service</p>
              </div>
            </div>

            {/* Message */}
            <p className="text-white/95 text-sm leading-relaxed font-medium">{message}</p>
          </div>

          {/* Body */}
          <div className="bg-white px-5 py-5 space-y-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Ce que vous y trouverez</p>

            {[
              { icon: '⚽', text: 'Coupons & pronostics gratuits chaque jour' },
              { icon: '🏆', text: 'Résultats des concours et liste des gagnants' },
              { icon: '🎁', text: 'Offres exclusives et codes promo réservés aux membres' },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-sm text-gray-700">
                <span className="text-base w-6 text-center shrink-0">{icon}</span>
                <p className="font-medium leading-snug">{text}</p>
              </div>
            ))}

            <a
              href={channelUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setVisible(false)}
              className="flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#20c05a] active:bg-[#1aaa50] text-white text-center font-bold text-sm py-3.5 rounded-2xl transition-colors mt-2 shadow-sm shadow-green-200"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white shrink-0">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Rejoindre maintenant
            </a>

            <button
              onClick={() => setVisible(false)}
              className="w-full text-gray-400 text-xs text-center py-1.5 hover:text-gray-600 transition-colors font-medium"
            >
              Non merci, peut-être plus tard
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes waBgIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes waSlideUp {
          from { opacity: 0; transform: translateY(32px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  );
}
