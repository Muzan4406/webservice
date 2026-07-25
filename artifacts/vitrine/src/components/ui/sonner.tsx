'use client';

import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      richColors
      closeButton
      gap={8}
      toastOptions={{
        duration: 4000,
        classNames: {
          toast: [
            'group toast',
            'flex items-start gap-3',
            'rounded-2xl px-4 py-3.5',
            'shadow-xl border-0',
            'text-sm font-semibold',
            'backdrop-blur-md',
          ].join(' '),
          title: 'font-bold text-sm leading-snug',
          description: 'font-normal text-xs opacity-75 mt-0.5 leading-relaxed',
          success: '!bg-emerald-500 !text-white [&>[data-icon]]:text-white',
          error: '!bg-red-500 !text-white [&>[data-icon]]:text-white',
          warning: '!bg-amber-400 !text-amber-900 [&>[data-icon]]:text-amber-900',
          info: '!bg-[#1a2a5e] !text-white [&>[data-icon]]:text-white',
          closeButton: [
            '!bg-white/20 !border-0 !text-current',
            'hover:!bg-white/30 rounded-full',
          ].join(' '),
          actionButton: '!bg-white/20 !text-current hover:!bg-white/30 rounded-xl font-bold',
          cancelButton: '!bg-white/10 !text-current hover:!bg-white/20 rounded-xl',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
