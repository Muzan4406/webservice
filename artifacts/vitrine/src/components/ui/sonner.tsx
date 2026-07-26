'use client';

import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      position="bottom-center"
      className="toaster group"
      richColors={false}
      closeButton={false}
      gap={10}
      toastOptions={{
        duration: 3500,
        classNames: {
          toast: [
            'group toast',
            'flex items-center gap-3',
            'rounded-2xl px-4 py-3',
            'shadow-2xl',
            'text-sm font-medium',
            'min-w-[220px] max-w-[340px]',
            'border-0',
          ].join(' '),
          title: 'font-semibold text-sm leading-tight',
          description: 'text-xs opacity-70 mt-0.5 leading-snug',
          // Succès : vert profond avec icône blanche
          success: [
            '!bg-[#1a7a4a] !text-white',
            '[&>[data-icon]]:text-white',
            '[&>[data-icon]]:opacity-90',
          ].join(' '),
          // Erreur : rouge mat
          error: [
            '!bg-[#c0392b] !text-white',
            '[&>[data-icon]]:text-white',
            '[&>[data-icon]]:opacity-90',
          ].join(' '),
          // Avertissement : ambre foncé
          warning: [
            '!bg-[#d97706] !text-white',
            '[&>[data-icon]]:text-white',
            '[&>[data-icon]]:opacity-90',
          ].join(' '),
          // Info : marine Muzan
          info: [
            '!bg-[#1a2a5e] !text-white',
            '[&>[data-icon]]:text-white',
            '[&>[data-icon]]:opacity-90',
          ].join(' '),
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
