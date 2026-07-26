import { useState } from 'react';
import { useLocation } from 'wouter';
import {
  useGetAdminUsers, useUpdateAdminUser, useDeleteAdminUser, useResetAdminUserPassword,
} from '@workspace/api-client-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Search, Shield, Star, Ban, Trash2, Key, ChevronLeft, ChevronRight } from 'lucide-react';

export default function AdminUsersPage() {
  const [, setLocation] = useLocation();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [resetModal, setResetModal] = useState<{ id: number; username: string } | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const { data, isLoading } = useGetAdminUsers({ page, search: search || undefined });
  const { mutate: updateUser } = useUpdateAdminUser();
  const { mutate: deleteUser } = useDeleteAdminUser();
  const { mutate: resetPassword, isPending: isResetting } = useResetAdminUserPassword();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });

  const handle = (id: number, payload: any) => {
    updateUser({ id, data: payload }, {
      onSuccess: () => { toast.success('Modification enregistrée.'); invalidate(); },
      onError: (err: any) => toast.error(err?.data?.error ?? 'Opération échouée.'),
    });
  };

  const handleDelete = (id: number, username: string) => {
    if (id === (currentUser as any)?.id) { toast.error('Vous ne pouvez pas supprimer votre propre compte.'); return; }
    if (!window.confirm(`Supprimer définitivement "${username}" ?`)) return;
    deleteUser({ id }, {
      onSuccess: () => { toast.success(`${username} supprimé.`); invalidate(); },
      onError: (err: any) => toast.error(err?.data?.error ?? 'Suppression échouée.'),
    });
  };

  const handleResetPassword = () => {
    if (!resetModal) return;
    if (newPassword.length < 6) { toast.error('Le mot de passe doit faire au moins 6 caractères.'); return; }
    resetPassword({ id: resetModal.id, data: { newPassword } }, {
      onSuccess: () => { toast.success('Mot de passe réinitialisé.'); setResetModal(null); setNewPassword(''); },
      onError: (err: any) => toast.error(err?.data?.error ?? 'Échec.'),
    });
  };

  const users: any[] = (data as any)?.users ?? [];
  const total: number = (data as any)?.total ?? 0;

  return (
    <div className="min-h-screen bg-[#F4F6FB]">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#1a2a5e] to-[#0f1a3e] px-5 pt-8 pb-10">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => setLocation('/admin')} className="text-white/70 hover:text-white transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold text-white">Utilisateurs</h1>
        </div>
        <p className="text-white/50 text-sm ml-9">{total} utilisateur(s) au total</p>
      </div>

      <div className="px-4 -mt-5 pb-8 space-y-3">
        {/* Search bar */}
        <div className="bg-white rounded-2xl shadow-sm flex items-center gap-3 px-4 py-3">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            placeholder="Rechercher par nom ou téléphone…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="flex-1 text-sm outline-none bg-transparent text-gray-800 placeholder:text-gray-400"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1a2a5e]" />
          </div>
        ) : users.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
            <p className="text-gray-400 text-sm">Aucun utilisateur trouvé.</p>
          </div>
        ) : (
          <>
            {users.map((u: any) => (
              <div key={u.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {/* User info row */}
                <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                  <div className="w-11 h-11 rounded-full overflow-hidden shrink-0">
                    <img src="/logo.png" alt="avatar" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-bold text-gray-900 text-sm">{u.username}</p>
                      {u.isVip && (
                        <span className="bg-yellow-100 text-yellow-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">VIP</span>
                      )}
                      {u.isAdmin && (
                        <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">Admin</span>
                      )}
                      {u.isBanned && (
                        <span className="bg-red-100 text-red-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">Banni</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{u.phone ?? u.userId}</p>
                  </div>
                  <p className="text-[11px] text-gray-400 shrink-0">{new Date(u.createdAt).toLocaleDateString('fr-FR')}</p>
                </div>

                {/* Actions row */}
                <div className="border-t border-gray-100 grid grid-cols-5 divide-x divide-gray-100">
                  <button
                    onClick={() => handle(u.id, { isVip: !u.isVip })}
                    className={`flex flex-col items-center gap-1 py-2.5 transition-colors ${u.isVip ? 'text-yellow-600 bg-yellow-50' : 'text-gray-500 hover:bg-gray-50'}`}
                  >
                    <Star className="w-4 h-4" />
                    <span className="text-[10px] font-medium">{u.isVip ? 'VIP ✓' : 'VIP'}</span>
                  </button>
                  <button
                    onClick={() => handle(u.id, { isBanned: !u.isBanned })}
                    className={`flex flex-col items-center gap-1 py-2.5 transition-colors ${u.isBanned ? 'text-orange-600 bg-orange-50' : 'text-gray-500 hover:bg-gray-50'}`}
                  >
                    <Ban className="w-4 h-4" />
                    <span className="text-[10px] font-medium">{u.isBanned ? 'Banni' : 'Bannir'}</span>
                  </button>
                  <button
                    onClick={() => handle(u.id, { isAdmin: !u.isAdmin })}
                    className={`flex flex-col items-center gap-1 py-2.5 transition-colors ${u.isAdmin ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:bg-gray-50'}`}
                  >
                    <Shield className="w-4 h-4" />
                    <span className="text-[10px] font-medium">{u.isAdmin ? 'Admin ✓' : 'Admin'}</span>
                  </button>
                  <button
                    onClick={() => setResetModal({ id: u.id, username: u.username })}
                    className="flex flex-col items-center gap-1 py-2.5 text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    <Key className="w-4 h-4" />
                    <span className="text-[10px] font-medium">MDP</span>
                  </button>
                  <button
                    onClick={() => handleDelete(u.id, u.username)}
                    className="flex flex-col items-center gap-1 py-2.5 text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="text-[10px] font-medium">Sup.</span>
                  </button>
                </div>
              </div>
            ))}

            {/* Pagination */}
            <div className="flex items-center justify-between pt-1">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white shadow-sm text-sm text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" /> Précédent
              </button>
              <span className="text-sm text-gray-500 font-medium">Page {page}</span>
              <button
                disabled={users.length < 20}
                onClick={() => setPage(p => p + 1)}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white shadow-sm text-sm text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Suivant <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Reset password modal */}
      {resetModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => { setResetModal(null); setNewPassword(''); }}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                <Key className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Réinitialiser le MDP</h3>
                <p className="text-xs text-gray-500">Pour <span className="font-semibold">{resetModal.username}</span></p>
              </div>
            </div>
            <Input
              type="password"
              placeholder="Nouveau mot de passe (min. 6 caractères)"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="h-12 rounded-xl"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setResetModal(null); setNewPassword(''); }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600"
              >
                Annuler
              </button>
              <button
                onClick={handleResetPassword}
                disabled={isResetting}
                className="flex-1 py-2.5 rounded-xl bg-[#1a2a5e] text-white text-sm font-medium disabled:opacity-60"
              >
                {isResetting ? 'Envoi…' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
