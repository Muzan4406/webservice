import { useLocation, useParams } from 'wouter';
import { useGetAdminDeposits } from '@workspace/api-client-react';
import { ArrowLeft, Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdminDepositDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const depositId = parseInt(id ?? '0', 10);

  // Fetch all statuses to find the deposit
  const { data: pendingData } = useGetAdminDeposits({ status: 'pending', page: 1 });
  const { data: validatedData } = useGetAdminDeposits({ status: 'validated', page: 1 });
  const { data: rejectedData } = useGetAdminDeposits({ status: 'rejected', page: 1 });

  const allDeposits: any[] = [
    ...((pendingData as any)?.deposits ?? []),
    ...((validatedData as any)?.deposits ?? []),
    ...((rejectedData as any)?.deposits ?? []),
  ];

  const deposit = allDeposits.find((d: any) => d.id === depositId);

  const statusLabel: Record<string, { label: string; color: string }> = {
    pending: { label: 'En attente', color: 'bg-amber-100 text-amber-700' },
    validated: { label: 'Validé', color: 'bg-green-100 text-green-700' },
    rejected: { label: 'Rejeté', color: 'bg-red-100 text-red-700' },
  };

  const s = deposit ? (statusLabel[deposit.status] ?? { label: deposit.status, color: 'bg-gray-100 text-gray-700' }) : null;

  return (
    <div className="min-h-screen bg-[#0d1120] flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#1a2a5e] to-[#0f1a3e] p-6 pb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLocation('/admin/deposits')}
            className="text-white/70 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold text-white">Capture du dépôt #{depositId}</h1>
        </div>
      </div>

      {!deposit ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-white/50 text-sm">Dépôt introuvable ou en cours de chargement…</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          {/* Info bar */}
          <div className="bg-[#111827] border-b border-white/10 px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
            <span className="text-white font-bold text-base">{deposit.amount?.toLocaleString()} XOF</span>
            <span className="text-white/60">{deposit.username ?? '—'}</span>
            {deposit.phone && <span className="text-white/60">{deposit.phone}</span>}
            {deposit.oneXbetAccountId && (
              <span className="text-white/80">
                <span className="text-white/40">1xBet : </span>
                <span className="font-mono font-semibold">{deposit.oneXbetAccountId}</span>
              </span>
            )}
            {deposit.operator && <span className="text-white/60">{deposit.operator}</span>}
            {deposit.referenceId && (
              <span className="text-white/60">
                <span className="text-white/40">Réf : </span>{deposit.referenceId}
              </span>
            )}
            {s && <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${s.color}`}>{s.label}</span>}
            <span className="text-white/40 ml-auto text-xs">
              {new Date(deposit.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* Screenshot */}
          {deposit.screenshotUrl ? (
            <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">
              <img
                src={deposit.screenshotUrl}
                alt="Capture du paiement"
                className="max-w-full max-h-[70vh] rounded-2xl object-contain shadow-2xl border border-white/10"
              />
              <div className="flex gap-3">
                <a
                  href={deposit.screenshotUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Ouvrir l'original
                </a>
                <a
                  href={deposit.screenshotUrl}
                  download
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Télécharger
                </a>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-white/40 text-sm">Aucune capture d'écran soumise.</p>
            </div>
          )}

          {/* Rejection reason if any */}
          {deposit.rejectionReason && (
            <div className="mx-4 mb-4 p-4 rounded-xl bg-red-900/30 border border-red-500/30">
              <p className="text-red-300 text-sm"><span className="font-semibold">Motif du rejet : </span>{deposit.rejectionReason}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
