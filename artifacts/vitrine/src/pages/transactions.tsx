import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGetTransactions } from '@workspace/api-client-react';
import { BottomNav } from '@/components/BottomNav';
import { ArrowDownToLine, ArrowUpFromLine, ChevronLeft, ChevronRight, Receipt } from 'lucide-react';
import { useLocation } from 'wouter';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: 'En attente', color: 'text-amber-700',  bg: 'bg-amber-100'  },
  validated: { label: 'Validé',     color: 'text-green-700',  bg: 'bg-green-100'  },
  processed: { label: 'Traité',     color: 'text-blue-700',   bg: 'bg-blue-100'   },
  rejected:  { label: 'Rejeté',     color: 'text-red-700',    bg: 'bg-red-100'    },
};

export default function TransactionsPage() {
  const [, setLocation] = useLocation();
  const [page, setPage] = useState(1);
  const transactions = useGetTransactions({ page });

  const totalPages = transactions.data
    ? Math.ceil(transactions.data.total / transactions.data.limit)
    : 1;

  return (
    <div className="min-h-screen bg-[#F4F6FB] pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#1a2a5e] to-[#0f1a3e] px-5 pt-10 pb-6 relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-white/5 pointer-events-none" />
        <div className="flex items-center gap-3">
          <button onClick={() => setLocation('/')}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors active:scale-95">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">Transactions</h1>
            <p className="text-white/50 text-xs mt-0.5">Historique de vos opérations</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-2">
        {transactions.isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-[#1a2a5e]/20 border-t-[#1a2a5e] animate-spin" />
          </div>
        ) : transactions.data?.transactions && transactions.data.transactions.length > 0 ? (
          <>
            {transactions.data.transactions.map((tx, index) => {
              const isDeposit = tx.kind === 'deposit';
              const status = STATUS_CONFIG[tx.status] ?? { label: tx.status, color: 'text-gray-600', bg: 'bg-gray-100' };

              return (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className="bg-white rounded-2xl px-4 py-3.5 shadow-sm flex items-center gap-3"
                >
                  {/* Icon */}
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                    isDeposit ? 'bg-blue-50' : 'bg-orange-50'
                  }`}>
                    {isDeposit
                      ? <ArrowDownToLine className="w-5 h-5 text-blue-500" />
                      : <ArrowUpFromLine className="w-5 h-5 text-orange-500" />}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-bold text-gray-900 text-sm">
                        {isDeposit ? 'Dépôt' : 'Retrait'}
                      </p>
                      {tx.operator && (
                        <span className="text-[11px] text-gray-400 truncate">• {tx.operator}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}>
                        {status.label}
                      </span>
                      {tx.createdAt && (
                        <span className="text-[11px] text-gray-400">
                          {format(new Date(tx.createdAt), 'dd MMM HH:mm', { locale: fr })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Amount */}
                  <p className={`font-bold text-base shrink-0 ${isDeposit ? 'text-blue-600' : 'text-orange-600'}`}>
                    {isDeposit ? '+' : '-'}{tx.amount.toLocaleString()} F
                  </p>
                </motion.div>
              );
            })}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-3 pb-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex items-center gap-1 px-4 py-2 rounded-xl bg-white text-gray-700 text-sm font-semibold shadow-sm disabled:opacity-40 active:scale-95 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" /> Précédent
                </button>
                <span className="text-sm text-gray-500 font-medium">{page} / {totalPages}</span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= totalPages}
                  className="flex items-center gap-1 px-4 py-2 rounded-xl bg-white text-gray-700 text-sm font-semibold shadow-sm disabled:opacity-40 active:scale-95 transition-all"
                >
                  Suivant <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <Receipt className="w-8 h-8 text-gray-300" />
            </div>
            <p className="font-bold text-gray-600 mb-1">Aucune transaction</p>
            <p className="text-sm text-gray-400">Vos opérations apparaîtront ici</p>
          </motion.div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
