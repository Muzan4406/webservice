import { Wrench, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

interface MaintenancePageProps {
  message?: string | null;
}

export default function MaintenancePage({ message }: MaintenancePageProps) {
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#060D1A] via-[#0f1a3e] to-[#1a2a5e] px-6 text-center overflow-hidden relative">

      {/* Cercles décoratifs flous en arrière-plan */}
      <div className="absolute top-[-80px] right-[-80px] w-72 h-72 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-60px] left-[-60px] w-60 h-60 rounded-full bg-[#1a2a5e]/60 blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="flex flex-col items-center max-w-sm w-full"
      >
        {/* Icône animée */}
        <motion.div
          animate={{ rotate: [0, -12, 12, -8, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut' }}
          className="w-24 h-24 rounded-3xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center mb-8 shadow-lg shadow-amber-500/10"
        >
          <Wrench className="w-11 h-11 text-amber-400" />
        </motion.div>

        {/* Badge */}
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/15 border border-amber-400/25 text-amber-300 text-xs font-semibold tracking-wide uppercase mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          Maintenance
        </span>

        {/* Titre */}
        <h1 className="text-2xl font-bold text-white mb-3 leading-tight">
          Nous revenons bientôt
        </h1>

        {/* Message */}
        <p className="text-white/55 text-sm leading-relaxed mb-10">
          {message || "L'application est temporairement indisponible pour des améliorations. Merci de votre patience."}
        </p>

        {/* Bouton actualiser */}
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 active:scale-95 transition-all text-white text-sm font-semibold border border-white/15"
        >
          <RefreshCw className="w-4 h-4" />
          Actualiser la page
        </button>
      </motion.div>
    </div>
  );
}
