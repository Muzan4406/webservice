'use client';

import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <>
      {/* Centre exact de l'écran, style toast Android */}
      <style>{`
        [data-sonner-toaster][data-x-position="center"][data-y-position="top"] {
          top: 50% !important;
          transform: translateX(-50%) translateY(-50%) !important;
        }
        [data-sonner-toaster] [data-sonner-toast] {
          border-radius: 999px !important;
          min-width: 180px !important;
          max-width: 300px !important;
          padding: 10px 20px !important;
          justify-content: center !important;
          font-size: 14px !important;
          font-weight: 600 !important;
          pointer-events: none !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.28) !important;
          border: none !important;
        }
        [data-sonner-toaster] [data-sonner-toast] [data-icon] {
          display: none !important;
        }
        [data-sonner-toaster] [data-sonner-toast] [data-close-button] {
          display: none !important;
        }
        [data-sonner-toaster] [data-sonner-toast][data-type="success"] {
          background: #1a7a4a !important;
          color: white !important;
        }
        [data-sonner-toaster] [data-sonner-toast][data-type="error"] {
          background: #c0392b !important;
          color: white !important;
        }
        [data-sonner-toaster] [data-sonner-toast][data-type="warning"] {
          background: #d97706 !important;
          color: white !important;
        }
        [data-sonner-toaster] [data-sonner-toast][data-type="info"] {
          background: #1a2a5e !important;
          color: white !important;
        }
        [data-sonner-toaster] [data-sonner-toast]:not([data-type]) {
          background: #222 !important;
          color: white !important;
        }
      `}</style>
      <Sonner
        position="top-center"
        richColors={false}
        closeButton={false}
        gap={8}
        toastOptions={{
          duration: 2500,
          classNames: {
            toast: 'text-center',
            title: 'font-semibold text-sm',
            description: 'hidden',
          },
        }}
        {...props}
      />
    </>
  );
};

export { Toaster };
