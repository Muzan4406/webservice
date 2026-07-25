import { useState } from 'react';
import { useLocation } from 'wouter';
import {
  useGetAdminDeposits, useValidateDeposit, useRejectDeposit, useDeleteDeposit,
  getGetAdminDepositsQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Check, X, Trash2, ImageIcon } from 'lucide-react';

type Status = 'pending' | 'validated' | 'rejected';

export default function AdminDepositsPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<Status>('pending');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [rejectModal, setRejectModal] = useState<{ id: number } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const qKey = getGetAdminDepositsQueryKey({ status, page });
  const { data, isLoading } = useGetAdminDeposits({ status, page }, { query: { queryKey: qKey } });
  const { mutate: validate, isPending: isValidating } = useValidateDeposit();
  const { mutate: reject, isPending: isRejecting } = useRejectDeposit();
  const { mutate: del } = useDeleteDeposit();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: qKey });

  const handleValidate = (id: number) => {
    if (!window.confirm('Valider ce dépôt ?')) return;
    validate({ id }, {
      onSuccess: () => { toast.success('Dépôt validé.'); invalidate(); },
      onError: (err: any) => toast.error(err?.data?.error ?? 'Impossible de valider.'),
    });
  };

  const confirmReject = () => {
    if (!rejectModal || !rejectReason.trim()) { toast.error('Veuillez indiquer un motif.'); return; }
    reject({ id: rejectModal.id, data: { reason: rejectReason } }, {
      onSuccess: () => { toast.success('Dépôt rejeté.'); setRejectModal(null); invalidate(); },
      onError: (err: any) => toast.error(err?.data?.error ?? 'Impossible de rejeter.'),
    });
  };

  const handleDelete = (id: number) => {
    if (!window.confirm('Supprimer définitivement ce dépôt ?')) return;
    del({ id }, {
      onSuccess: () => { toast.success('Supprimé.'); invalidate(); },
      onError: (err: any) => toast.error(err?.data?.error ?? 'Impossible de supprimer.'),
    });
  };

  const deposits: any[] = (data as any)?.deposits ?? [];

  const STATUS_TABS: Status[] = ['pending', 'validated', 'rejected'];
  const STATUS_LABELS: Record<Status, string> = { pending: 'En attente', validated: 'Validés', rejected: 'Rejetés' };

  return (
    <div className="min-h-screen bg-[#F4F6FB] pb-8">
      <div className="bg-gradient-to-br from-[#1a2a5e] to-[#0f1a3e] p-6 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => setLocation('/admin')} className="text-white/70 hover:text-white"><ArrowLeft className="w-6 h-6" /></button>
          <h1 className="text-2xl font-bold text-white">Dépôts</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b bg-white">
        {STATUS_TABS.map(s => (
          <button
            key={s}
            onClick={() => { setStatus(s); setPage(1); }}
            className={`flex-1 py-3 text-sm font-semibold uppercase transition-colors ${status === s ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="px-4 pt-4 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
        ) : deposits.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">Aucun dépôt.</CardContent></Card>
        ) : (
          <>
            {deposits.map((item: any) => (
              <Card key={item.id}>
                <CardContent className="p-0">
                  <div className="flex justify-between items-center p-4 border-b">
                    <span className="text-lg font-bold text-primary">{item.amount.toLocaleString()} XOF</span>
                    <span className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="p-4 space-y-2">
                    {[
                      ['Utilisateur', item.username],
                      ['Téléphone', item.phone],
                      ['ID 1xBet', item.oneXbetAccountId],
                      ['Opérateur', item.operator],
                      ['Pays', item.country],
                      ['Référence', item.referenceId],
                      item.rejectionReason && ['Motif rejet', item.rejectionReason],
                    ].filter(Boolean).map(([k, v]: any) => v && (
                      <div key={k} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{k}</span>
                        <span className="font-medium max-w-[60%] text-right font-mono">{v}</span>
                      </div>
                    ))}
                    {item.screenshotUrl && (
                      <div className="pt-1">
                        <button
                          onClick={() => setLocation(`/admin/deposits/${item.id}`)}
                          className="flex items-center gap-2 w-full py-2 px-3 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-medium transition-colors border border-blue-200"
                        >
                          <ImageIcon className="w-4 h-4" />
                          Voir la capture d'écran
                        </button>
                      </div>
                    )}
                  </div>
                  {status === 'pending' && (
                    <div className="flex border-t divide-x">
                      <button onClick={() => handleValidate(item.id)} disabled={isValidating} className="flex-1 flex items-center justify-center gap-2 py-3 text-green-600 font-semibold text-sm hover:bg-green-50">
                        <Check className="w-4 h-4" />Valider
                      </button>
                      <button onClick={() => { setRejectModal({ id: item.id }); setRejectReason(''); }} className="flex-1 flex items-center justify-center gap-2 py-3 text-red-600 font-semibold text-sm hover:bg-red-50">
                        <X className="w-4 h-4" />Rejeter
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="flex items-center justify-center gap-2 px-4 py-3 text-muted-foreground hover:bg-muted">
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
              <Button variant="outline" size="sm" disabled={deposits.length < 20} onClick={() => setPage(p => p + 1)}>Suivant</Button>
            </div>
          </>
        )}
      </div>

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm">
            <CardContent className="p-5 space-y-4">
              <h3 className="text-lg font-bold">Motif du rejet</h3>
              <Input placeholder="Expliquez la raison du rejet…" value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setRejectModal(null)}>Annuler</Button>
                <Button variant="destructive" className="flex-1" onClick={confirmReject} disabled={isRejecting}>
                  {isRejecting ? 'Envoi…' : 'Rejeter'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
