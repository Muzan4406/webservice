import { PhoneCall } from 'lucide-react';

type UssdDialButtonProps = {
  code: string | null;
  className?: string;
};

export function UssdDialButton({ code, className = '' }: UssdDialButtonProps) {
  const enabledStyles = 'bg-[#1a3aff] text-white hover:bg-blue-700 focus-visible:ring-blue-500';
  const disabledStyles = 'cursor-not-allowed bg-gray-200 text-gray-500';

  return (
    <button
      type="button"
      disabled={!code}
      aria-label="Ouvrir le téléphone avec le code USSD prérempli"
      onClick={() => {
        if (code) window.location.href = `tel:${encodeURIComponent(code)}`;
      }}
      className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-center text-sm font-bold shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
        code ? enabledStyles : disabledStyles
      } ${className}`}
    >
      <PhoneCall className="h-4 w-4 shrink-0" />
      Ouvrir le téléphone avec le code prérempli
    </button>
  );
}
