import { useState } from 'react';
import { useLocation } from 'wouter';
import {
  useGetAdminWithdrawals, useProcessWithdrawal, useDeleteWithdrawal, useRejectWithdrawal,
  getGetAdminWithdrawalsQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Check, Trash2, XCircle } from 'lucide-react';

type Status = 'pending' | 'processed' | 'rejected';

export default function AdminWithdrawalsPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<Status>('pending');
  const [page, setPage] = useState(1);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const qKey = getGetAdminWithdrawalsQueryKey({ status, page });
  const { data, isLoading } = useGetAdminWithdrawals({ status, page }, { query: { queryKey: qKey } });
  const { mutate: process } = useProcessWithdrawal();
  const { mutate: del } = useDeleteWithdrawal();
  const { mutate: reject, isPending: isRejecting } = useRejectWithdrawal();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: qKey });

  const handleProcess = (id: number) => {
    if (!window.confirm('Confirmer que vous avez envoyé les fonds ?')) return;
    process({ id }, {
      onSuccess: () => { toast.success('Retrait traité.'); invalidate(); },
      onError: (err: any) => toast.error(err?.data?.error ?? 'Impossible de traiter.'),
    });
  };

  const handleDelete = (id: number) => {
    if (!window.confirm('Supprimer définitivement ce retrait ?')) return;
    del({ id }, {
      onSuccess: () => { toast.success('Supprimé.'); invalidate(); },
      onError: (err: any) => toast.error(err?.data?.error ?? 'Impossible de supprimer.'),
    });
  };

  const openReject = (id: number) => {
    setRejectingId(id);
    setRejectReason('');
  };

  const handleReject = () => {
    if (!rejectingId) return;
    const reason = rejectReason.trim() || "Retrait rejeté par l'administrateur";
    reject({ id: rejectingId, reason }, {
      onSuccess: () => {
        toast.success('Retrait rejeté.');
        setRejectingId(null);
        invalidate();
      },
      onError: (err: any) => toast.error(err?.data?.error ?? 'Impossible de rejeter.'),
    });
  };

  const withdrawals: any[] = (data as any)?.withdrawals ?? [];
  const STATUS_TABS: Status[] = ['pending', 'processed', 'rejected'];
  const STATUS_LABELS: Record<Status, string> = { pending: 'En attente', processed: 'Traités', rejected: 'Rejetés' };

  return (
    <div className="min-h-screen bg-[#F4F6FB] pb-8">
      <div className="bg-gradient-to-br from-[#1a2a5e] to-[#0f1a3e] p-6 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => setLocation('/admin')} className="text-white/70 hover:text-white"><ArrowLeft className="w-6 h-6" /></button>
          <h1 className="text-2xl font-bold text-white">Retraits</h1>
        </div>
      </div>

      <div className="flex border-b bg-white">
        {STATUS_TABS.map(s => (
          <button key={s} onClick={() => { setStatus(s); setPage(1); }}
            className={`flex-1 py-3 text-sm font-semibold uppercase ${status === s ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}>
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="px-4 pt-4 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
        ) : withdrawals.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">Aucun retrait.</CardContent></Card>
        ) : (
          <>
            {withdrawals.map((item: any) => (
              <Card key={item.id}>
                <CardContent className="p-0">
                  <div className="flex justify-between items-center p-4 border-b">
                    <span className="text-lg font-bold text-red-600">{item.amount.toLocaleString()} XOF</span>
                    <span className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="p-4 space-y-2">
                    {[
                      ['Utilisateur', item.username],
                      ['Téléphone', item.phone],
                      ['Opérateur', item.operator?.toUpperCase()],
                      ['Pays', item.country],
                      item.code && ['Code', item.code],
                    ].filter(Boolean).map(([k, v]: any) => v && (
                      <div key={k} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{k}</span>
                        <span className="font-medium">{v}</span>
                      </div>
                    ))}
                  </div>
                  {status === 'pending' && (
                    <div className="flex border-t divide-x">
                      <button onClick={() => handleProcess(item.id)} className="flex-1 flex items-center justify-center gap-2 py-3 text-green-600 font-semibold text-sm hover:bg-green-50">
                        <Check className="w-4 h-4" />Traité / Envoyé
                      </button>
                      <button onClick={() => openReject(item.id)} className="flex-1 flex items-center justify-center gap-2 py-3 text-red-600 font-semibold text-sm hover:bg-red-50">
                        <XCircle className="w-4 h-4" />Rejeter
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="px-4 flex items-center justify-center text-muted-foreground hover:bg-muted">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  {status !== 'pending' && (
                    <div className="flex border-t">
                      <button onClick={() => handleDelete(item.id)} className="flex-1 flex items-center justify-center gap-2 py-3 text-red-600 text-sm hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />Supprimer
                      </button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Précédent</Button>
              <span className="text-sm text-muted-foreground">Page {page}</span>
              <Button variant="outline" size="sm" disabled={withdrawals.length < 20} onClick={() => setPage(p => p + 1)}>Suivant</Button>
            </div>
          </>
        )}
      </div>

      {/* Reject modal */}
      {rejectingId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Rejeter le retrait</h2>
            <p className="text-sm text-gray-500">Indiquez un motif (optionnel). L'utilisateur sera notifié.</p>
            <textarea
              className="w-full border border-gray-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
              rows={3}
              placeholder="Motif du rejet…"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setRejectingId(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleReject}
                disabled={isRejecting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60"
              >
                {isRejecting ? 'Rejet…' : 'Confirmer le rejet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
