import { useState } from 'react';
import { useLocation } from 'wouter';
import {
  useGetAllCoupons, useCreateCoupon, useDeleteCoupon, getGetAllCouponsQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, Trash2, X } from 'lucide-react';

type CouponType = 'daily' | 'vip';

export default function AdminCouponsPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [type, setType] = useState<CouponType>('daily');
  const [showModal, setShowModal] = useState(false);

  const todayStr = () => new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({ title: '', couponCode: '', odds: '', imageUrl: '', date: todayStr() });

  const queryKey = getGetAllCouponsQueryKey({ type });
  const { data, isLoading } = useGetAllCoupons({ type }, { query: { queryKey, staleTime: 0 } });
  const { mutate: createCoupon, isPending: isCreating } = useCreateCoupon();
  const { mutate: deleteCoupon } = useDeleteCoupon();

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const handleCreate = () => {
    if (!form.title.trim()) { toast.error('Le titre est obligatoire.'); return; }
    if (!form.date.trim()) { toast.error('La date est obligatoire.'); return; }
    createCoupon({
      data: {
        type: type as any,
        title: form.title.trim(),
        content: form.couponCode.trim() || undefined,
        date: new Date(form.date) as any,
        odds: form.odds ? parseFloat(form.odds) : undefined,
        imageUrl: form.imageUrl || undefined,
      } as any,
    }, {
      onSuccess: () => {
        toast.success('Coupon créé.');
        setShowModal(false);
        setForm({ title: '', couponCode: '', odds: '', imageUrl: '', date: todayStr() });
        invalidate();
      },
      onError: (err: any) => toast.error(err?.data?.error ?? 'Création échouée.'),
    });
  };

  const handleDelete = (id: number) => {
    if (!window.confirm('Supprimer ce coupon définitivement ?')) return;
    deleteCoupon({ id }, {
      onSuccess: () => { toast.success('Coupon supprimé.'); invalidate(); },
      onError: (err: any) => toast.error(err?.data?.error ?? 'Suppression échouée.'),
    });
  };

  const coupons: any[] = (data as any)?.coupons ?? [];

  return (
    <div className="min-h-screen bg-[#F4F6FB] pb-8">
      <div className="bg-gradient-to-br from-[#1a2a5e] to-[#0f1a3e] p-6 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setLocation('/admin')} className="text-white/70 hover:text-white"><ArrowLeft className="w-6 h-6" /></button>
            <h1 className="text-2xl font-bold text-white">Coupons</h1>
          </div>
          <button onClick={() => setShowModal(true)} className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30">
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b bg-white">
        {(['daily', 'vip'] as CouponType[]).map(t => (
          <button key={t} onClick={() => setType(t)}
            className={`flex-1 py-3 text-sm font-semibold uppercase ${type === t ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}>
            {t === 'daily' ? 'Quotidien' : 'VIP'}
          </button>
        ))}
      </div>

      <div className="px-4 pt-4 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
        ) : coupons.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-muted-foreground mb-4">Aucun coupon {type === 'daily' ? 'quotidien' : 'VIP'}.</p>
              <Button onClick={() => setShowModal(true)}><Plus className="w-4 h-4 mr-2" />Ajouter un coupon</Button>
            </CardContent>
          </Card>
        ) : (
          coupons.map((item: any) => (
            <Card key={item.id}>
              <CardContent className="p-4">
                {item.imageUrl && <img src={item.imageUrl} alt={item.title} className="w-full h-40 object-cover rounded-xl mb-3" />}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-bold text-foreground">{item.title}</p>
                    {item.content && <p className="text-sm text-muted-foreground mt-1">{item.content}</p>}
                    <div className="flex gap-3 mt-2">
                      <span className="text-xs text-muted-foreground">{new Date(item.date).toLocaleDateString('fr-FR')}</span>
                      {item.odds && <span className="text-xs font-semibold text-primary">Cote: {item.odds}</span>}
                    </div>
                  </div>
                  <button onClick={() => handleDelete(item.id)} className="ml-3 p-2 text-red-500 hover:bg-red-50 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">Nouveau Coupon</h3>
                <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Titre *</Label>
                  <Input placeholder="Titre du coupon" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Code du coupon</Label>
                  <Input placeholder="PSG vs OM — 1X2" value={form.couponCode} onChange={e => setForm({ ...form, couponCode: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Date *</Label>
                  <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Cote totale</Label>
                  <Input type="number" placeholder="Ex: 3.50" value={form.odds} onChange={e => setForm({ ...form, odds: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>URL de l'image (optionnel)</Label>
                  <Input placeholder="https://…" value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })} />
                </div>
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={isCreating}>
                {isCreating ? 'Création…' : 'Créer le coupon'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
