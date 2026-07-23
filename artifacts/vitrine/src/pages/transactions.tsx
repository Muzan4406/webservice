import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGetTransactions } from '@workspace/api-client-react';
import { BottomNav } from '@/components/BottomNav';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowDownToLine, ArrowUpFromLine, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocation } from 'wouter';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'En attente', variant: 'secondary' },
  validated: { label: 'Validé', variant: 'default' },
  processed: { label: 'Traité', variant: 'default' },
  rejected: { label: 'Rejeté', variant: 'destructive' },
};

export default function TransactionsPage() {
  const [, setLocation] = useLocation();
  const [page, setPage] = useState(1);
  const transactions = useGetTransactions({ page });

  return (
    <div className="min-h-screen bg-[#F4F6FB] pb-20 md:pb-6">
      <div className="bg-gradient-to-br from-[#1a2a5e] to-[#0f1a3e] p-6 pb-8">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => setLocation('/')} className="text-white">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold text-white">Transactions</h1>
        </div>
        <p className="text-white/60 text-sm">Historique de vos opérations</p>
      </div>

      <div className="px-6 -mt-4 space-y-4">
        {transactions.isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : transactions.data?.transactions && transactions.data.transactions.length > 0 ? (
          <>
            {transactions.data.transactions.map((transaction, index) => {
              const statusInfo = STATUS_LABELS[transaction.status] || { label: transaction.status, variant: 'outline' };
              const isDeposit = transaction.kind === 'deposit';
              
              return (
                <motion.div
                  key={transaction.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card>
                    <CardContent className="py-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          isDeposit ? 'bg-blue-500/20' : 'bg-orange-500/20'
                        }`}>
                          {isDeposit ? (
                            <ArrowDownToLine className={`w-6 h-6 ${isDeposit ? 'text-blue-500' : 'text-orange-500'}`} />
                          ) : (
                            <ArrowUpFromLine className={`w-6 h-6 text-orange-500`} />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold">
                              {isDeposit ? 'Dépôt' : 'Retrait'}
                            </p>
                            {transaction.operator && (
                              <span className="text-xs text-muted-foreground">
                                via {transaction.operator}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={statusInfo.variant} className="text-xs">
                              {statusInfo.label}
                            </Badge>
                            {transaction.createdAt && (
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(transaction.createdAt), 'dd MMM yyyy HH:mm', { locale: fr })}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className={`font-bold text-lg ${isDeposit ? 'text-blue-600' : 'text-orange-600'}`}>
                            {isDeposit ? '+' : '-'}{transaction.amount.toLocaleString()} F
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}

            {transactions.data.total > transactions.data.limit && (
              <div className="flex items-center justify-between pt-4">
                <Button
                  data-testid="button-prev"
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Précédent
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page} sur {Math.ceil(transactions.data.total / transactions.data.limit)}
                </span>
                <Button
                  data-testid="button-next"
                  variant="outline"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page * transactions.data.limit >= transactions.data.total}
                >
                  Suivant
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Aucune transaction pour le moment
            </CardContent>
          </Card>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
