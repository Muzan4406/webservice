import { useState, useRef } from 'react';
import { useLocation } from 'wouter';
import {
  useGetAllCoupons, useCreateCoupon, useDeleteCoupon, getGetAllCouponsQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, Trash2, X, ImagePlus } from 'lucide-react';

async function uploadImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = (reader.result as string).split(',')[1];
        const token = localStorage.getItem('muzan_auth_token');
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ base64, mimeType: file.type }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Upload échoué');
        resolve(data.url);
      } catch (err: any) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Lecture du fichier échouée'));
    reader.readAsDataURL(file);
  });
}

type CouponType = 'daily' | 'vip' | 'validated' | 'montante';

const TAB_CONFIG: { type: CouponType; label: string }[] = [
  { type: 'daily',     label: 'Quotidien'  },
  { type: 'vip',       label: 'VIP'        },
  { type: 'validated', label: 'Validés'    },
  { type: 'montante',  label: 'Montantes'  },
];

export default function AdminCouponsPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [type, setType] = useState<CouponType>('daily');
  const [showModal, setShowModal] = useState(false);

  const todayStr = () => new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({ title: '', couponCode: '', odds: '', date: todayStr() });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const queryKey = getGetAllCouponsQueryKey({ type });
  const { data, isLoading } = useGetAllCoupons({ type } as any, { query: { queryKey, staleTime: 0 } });
  const { mutate: createCoupon, isPending: isCreating } = useCreateCoupon();
  const { mutate: deleteCoupon } = useDeleteCoupon();

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const resetForm = () => {
    setForm({ title: '', couponCode: '', odds: '', date: todayStr() });
    setImageFile(null);
    setImagePreview(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const switchTab = (t: CouponType) => {
    setType(t);
    setShowModal(false);
    resetForm();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const handleCreate = async () => {
    if (!form.title.trim()) { toast.error('Le titre est obligatoire.'); return; }
    if (!form.date.trim()) { toast.error('La date est obligatoire.'); return; }

    let imageUrl: string | undefined;
    if (imageFile) {
      try {
        setIsUploading(true);
        imageUrl = await uploadImage(imageFile);
      } catch (err: any) {
        toast.error(err?.message ?? 'Erreur lors de l\'upload de l\'image');
        setIsUploading(false);
        return;
      } finally {
        setIsUploading(false);
      }
    }

    createCoupon({
      data: {
        type: type as any,
        title: form.title.trim(),
        content: form.couponCode.trim() || undefined,
        date: new Date(form.date) as any,
        odds: form.odds ? parseFloat(form.odds) : undefined,
        imageUrl,
      } as any,
    }, {
      onSuccess: () => {
        toast.success('Coupon créé.');
        setShowModal(false);
        resetForm();
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

  const tabBadge = (t: CouponType) => {
    if (t === 'vip') return <span className="ml-1 text-[10px] bg-amber-400 text-black font-bold px-1.5 py-0.5 rounded-full">VIP</span>;
    if (t === 'montante') return <span className="ml-1 text-[10px] bg-amber-400 text-black font-bold px-1.5 py-0.5 rounded-full">VIP</span>;
    if (t === 'validated') return <span className="ml-1 text-[10px] bg-emerald-500 text-white font-bold px-1.5 py-0.5 rounded-full">✓</span>;
    return null;
  };

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
      <div className="flex border-b bg-white overflow-x-auto">
        {TAB_CONFIG.map(({ type: t, label }) => (
          <button
            key={t}
            onClick={() => switchTab(t)}
            className={`flex-1 min-w-[80px] py-3 text-xs font-semibold uppercase flex items-center justify-center gap-0.5 whitespace-nowrap px-2 ${
              type === t ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'
            }`}
          >
            {label}{tabBadge(t)}
          </button>
        ))}
      </div>

      <div className="px-4 pt-4 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
        ) : coupons.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-muted-foreground mb-4">
                {type === 'daily' ? 'Aucun coupon quotidien.' :
                 type === 'vip' ? 'Aucun coupon VIP.' :
                 type === 'validated' ? 'Aucun coupon validé.' :
                 'Aucune montante VIP.'}
              </p>
              <Button onClick={() => setShowModal(true)}><Plus className="w-4 h-4 mr-2" />Ajouter un coupon</Button>
            </CardContent>
          </Card>
        ) : (
          coupons.map((item: any) => (
            <Card key={item.id} className={
              item.type === 'validated' ? 'border-emerald-200 bg-emerald-50/30' :
              item.type === 'montante' ? 'border-amber-200 bg-amber-50/30' : ''
            }>
              <CardContent className="p-4">
                {item.imageUrl && <img src={item.imageUrl} alt={item.title} className="w-full max-h-64 object-contain rounded-xl mb-3 bg-gray-50" />}
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
                <h3 className="text-lg font-bold">
                  {type === 'validated' ? 'Coupon Validé' :
                   type === 'montante' ? 'Montante VIP' :
                   'Nouveau Coupon'}
                </h3>
                <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Titre *</Label>
                  <Input placeholder="Titre du coupon" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>{type === 'validated' ? 'Résultat / Détails' : 'Code du coupon'}</Label>
                  <Input
                    placeholder={type === 'validated' ? 'PSG 2-1 OM — Validé ✓' : 'PSG vs OM — 1X2'}
                    value={form.couponCode}
                    onChange={e => setForm({ ...form, couponCode: e.target.value })}
                  />
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
                  <Label>Image (optionnel)</Label>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                  {imagePreview ? (
                    <div className="relative rounded-xl overflow-hidden border border-gray-200">
                      <img src={imagePreview} alt="Aperçu" className="w-full max-h-48 object-contain bg-gray-50" />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      className="w-full h-24 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-primary hover:text-primary transition-colors bg-gray-50"
                    >
                      <ImagePlus className="w-6 h-6" />
                      <span className="text-sm font-medium">Importer une image</span>
                    </button>
                  )}
                </div>
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={isCreating || isUploading}>
                {isUploading ? 'Upload…' : isCreating ? 'Création…' : 'Créer le coupon'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
