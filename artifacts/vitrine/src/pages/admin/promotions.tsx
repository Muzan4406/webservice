import { useState } from 'react';
import { useLocation } from 'wouter';
import {
  useGetPromotions, useCreatePromotion, useUpdatePromotion, useDeletePromotion,
  getGetPromotionsQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Pencil, Trash2, X } from 'lucide-react';

const PROMO_QUERY_KEY = getGetPromotionsQueryKey();

export default function AdminPromotionsPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ title: '', content: '', imageUrl: '', isActive: true });

  const { data, isLoading } = useGetPromotions({ query: { queryKey: PROMO_QUERY_KEY, staleTime: 0 } });
  const { mutate: createPromo, isPending: isCreating } = useCreatePromotion();
  const { mutate: updatePromo, isPending: isUpdating } = useUpdatePromotion();
  const { mutate: deletePromo } = useDeletePromotion();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: PROMO_QUERY_KEY });

  const openCreate = () => { setEditingId(null); setForm({ title: '', content: '', imageUrl: '', isActive: true }); setShowModal(true); };
  const openEdit = (p: any) => { setEditingId(p.id); setForm({ title: p.title, content: p.content ?? '', imageUrl: p.imageUrl || '', isActive: p.isActive }); setShowModal(true); };

  const handleSave = () => {
    if (!form.title.trim()) { toast.error('Le titre est obligatoire.'); return; }
    const payload = { ...form, imageUrl: form.imageUrl || undefined };
    const opts = {
      onSuccess: () => { toast.success(editingId ? 'Mise à jour.' : 'Promotion créée.'); setShowModal(false); invalidate(); },
      onError: (err: any) => toast.error(err?.data?.error ?? 'Erreur.'),
    };
    if (editingId) updatePromo({ id: editingId, data: payload }, opts);
    else createPromo({ data: payload }, opts);
  };

  const handleDelete = (id: number, title: string) => {
    if (!window.confirm(`Supprimer "${title}" ?`)) return;
    deletePromo({ id }, {
      onSuccess: () => { toast.success('Promotion supprimée.'); invalidate(); },
      onError: (err: any) => toast.error(err?.data?.error ?? 'Suppression échouée.'),
    });
  };

  const toggleActive = (item: any) => {
    updatePromo({ id: item.id, data: { ...item, isActive: !item.isActive } }, {
      onSuccess: () => invalidate(),
      onError: (err: any) => toast.error(err?.data?.error ?? 'Erreur.'),
    });
  };

  const promos: any[] = (data as any)?.promotions ?? [];

  return (
    <div className="min-h-screen bg-[#F4F6FB] pb-8">
      <div className="bg-gradient-to-br from-[#1a2a5e] to-[#0f1a3e] p-6 pb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setLocation('/admin')} className="text-white/70 hover:text-white"><ArrowLeft className="w-6 h-6" /></button>
            <h1 className="text-2xl font-bold text-white">Promotions</h1>
          </div>
          <button onClick={openCreate} className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30">
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
        ) : promos.length === 0 ? (
          <Card><CardContent className="py-10 text-center">
            <p className="text-muted-foreground mb-4">Aucune promotion.</p>
            <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Ajouter</Button>
          </CardContent></Card>
        ) : (
          promos.map((item: any) => (
            <Card key={item.id}>
              <CardContent className="p-4">
                {item.imageUrl && <img src={item.imageUrl} alt={item.title} className="w-full h-36 object-cover rounded-xl mb-3" />}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-1">
                    <p className="font-bold text-foreground">{item.title}</p>
                    {!item.isActive && <Badge variant="secondary" className="text-xs">Inactif</Badge>}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(item)} className="p-2 text-primary hover:bg-blue-50 rounded-lg"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(item.id, item.title)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                {item.content && <p className="text-sm text-muted-foreground mb-3">{item.content}</p>}
                <button
                  onClick={() => toggleActive(item)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${item.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {item.isActive ? '✓ Active' : 'Activer'}
                </button>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">{editingId ? 'Modifier' : 'Nouvelle'} promotion</h3>
                <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5"><Label>Titre *</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Contenu</Label><Textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} rows={3} /></div>
                <div className="space-y-1.5"><Label>URL image</Label><Input placeholder="https://…" value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })} /></div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4 rounded" />
                    <span className="text-sm font-medium">Promotion active</span>
                  </label>
                </div>
              </div>
              <Button className="w-full" onClick={handleSave} disabled={isCreating || isUpdating}>
                {isCreating || isUpdating ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
