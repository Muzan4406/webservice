import { useState } from 'react';
import { useLocation } from 'wouter';
import {
  useGetAdminUsers, useUpdateAdminUser, useDeleteAdminUser, useResetAdminUserPassword,
} from '@workspace/api-client-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Search, Shield, Star, Ban, Trash2, Key } from 'lucide-react';

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
    <div className="min-h-screen bg-[#F4F6FB] pb-8">
      <div className="bg-gradient-to-br from-[#1a2a5e] to-[#0f1a3e] p-6 pb-8">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => setLocation('/admin')} className="text-white/70 hover:text-white">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold text-white">Utilisateurs</h1>
        </div>
        <p className="text-white/60 text-sm">{total} utilisateur(s) au total</p>
      </div>

      <div className="px-4 -mt-4 space-y-4">
        {/* Search */}
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom ou téléphone…"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="border-0 shadow-none p-0 h-8 focus-visible:ring-0"
              />
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
        ) : users.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">Aucun utilisateur trouvé.</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {users.map((u: any) => (
              <Card key={u.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                        {u.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{u.username}</p>
                          {u.isVip && <Badge className="bg-yellow-100 text-yellow-700 text-xs">VIP</Badge>}
                          {u.isAdmin && <Badge className="bg-blue-100 text-blue-700 text-xs">Admin</Badge>}
                          {u.isBanned && <Badge variant="destructive" className="text-xs">Banni</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">{u.phone ?? u.userId}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => handle(u.id, { isVip: !u.isVip })} className="h-8 text-xs gap-1">
                      <Star className="w-3 h-3" />{u.isVip ? 'Retirer VIP' : 'Mettre VIP'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handle(u.id, { isBanned: !u.isBanned })} className="h-8 text-xs gap-1">
                      <Ban className="w-3 h-3" />{u.isBanned ? 'Débannir' : 'Bannir'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handle(u.id, { isAdmin: !u.isAdmin })} className="h-8 text-xs gap-1">
                      <Shield className="w-3 h-3" />{u.isAdmin ? 'Retirer Admin' : 'Admin'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setResetModal({ id: u.id, username: u.username })} className="h-8 text-xs gap-1">
                      <Key className="w-3 h-3" />MDP
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(u.id, u.username)} className="h-8 text-xs gap-1">
                      <Trash2 className="w-3 h-3" />Supprimer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Pagination */}
            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Précédent</Button>
              <span className="text-sm text-muted-foreground">Page {page}</span>
              <Button variant="outline" size="sm" disabled={users.length < 20} onClick={() => setPage(p => p + 1)}>Suivant</Button>
            </div>
          </div>
        )}
      </div>

      {/* Reset password modal */}
      {resetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm">
            <CardContent className="p-5 space-y-4">
              <h3 className="text-lg font-bold">Réinitialiser le mot de passe</h3>
              <p className="text-sm text-muted-foreground">Nouveau mot de passe pour <strong>{resetModal.username}</strong></p>
              <Input
                type="password"
                placeholder="Nouveau mot de passe (min 6 caractères)"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => { setResetModal(null); setNewPassword(''); }}>Annuler</Button>
                <Button className="flex-1" onClick={handleResetPassword} disabled={isResetting}>
                  {isResetting ? 'Envoi…' : 'Réinitialiser'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
