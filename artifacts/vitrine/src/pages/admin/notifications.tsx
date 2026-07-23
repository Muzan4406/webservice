import { useState } from 'react';
import { useLocation } from 'wouter';
import {
  useBroadcastNotification, useGetNotifications, useDeleteNotification,
  getGetNotificationsQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Send, Trash2 } from 'lucide-react';

const NOTIF_QUERY_KEY = getGetNotificationsQueryKey();

export default function AdminNotificationsPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  const { data, isLoading, refetch } = useGetNotifications({ query: { queryKey: NOTIF_QUERY_KEY, staleTime: 0 } });
  const { mutate: broadcast, isPending } = useBroadcastNotification();
  const { mutate: deleteNotif } = useDeleteNotification();

  const handleSubmit = () => {
    if (!title.trim() || !message.trim()) { toast.error('Le titre et le message sont obligatoires.'); return; }
    if (!window.confirm('Envoyer cette notification à TOUS les utilisateurs ?')) return;
    broadcast({ data: { title: title.trim(), message: message.trim() } }, {
      onSuccess: () => {
        toast.success('Notification diffusée à tous les utilisateurs.');
        setTitle(''); setMessage('');
        queryClient.invalidateQueries({ queryKey: NOTIF_QUERY_KEY });
      },
      onError: (err: any) => toast.error(err?.data?.error ?? 'Envoi échoué.'),
    });
  };

  const handleDelete = (id: number) => {
    if (!window.confirm('Supprimer cette notification ?')) return;
    deleteNotif({ id }, {
      onSuccess: () => { toast.success('Notification supprimée.'); queryClient.invalidateQueries({ queryKey: NOTIF_QUERY_KEY }); },
      onError: (err: any) => toast.error(err?.data?.error ?? 'Suppression échouée.'),
    });
  };

  const notifications: any[] = (data as any)?.notifications ?? [];

  return (
    <div className="min-h-screen bg-[#F4F6FB] pb-8">
      <div className="bg-gradient-to-br from-[#1a2a5e] to-[#0f1a3e] p-6 pb-8">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => setLocation('/admin')} className="text-white/70 hover:text-white"><ArrowLeft className="w-6 h-6" /></button>
          <h1 className="text-2xl font-bold text-white">Notifications</h1>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-4">
        {/* Compose */}
        <Card>
          <CardContent className="p-5 space-y-3">
            <p className="text-sm font-semibold text-muted-foreground uppercase">Nouvelle notification globale</p>
            <div className="space-y-1.5">
              <Label>Titre</Label>
              <Input placeholder="Titre de la notification" value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Message</Label>
              <Textarea placeholder="Contenu du message…" value={message} onChange={e => setMessage(e.target.value)} rows={3} />
            </div>
            <Button className="w-full" onClick={handleSubmit} disabled={isPending}>
              <Send className="w-4 h-4 mr-2" />
              {isPending ? 'Envoi…' : 'Diffuser à tous'}
            </Button>
          </CardContent>
        </Card>

        {/* History */}
        <p className="text-sm font-semibold text-muted-foreground uppercase px-1">Historique</p>
        {isLoading ? (
          <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
        ) : notifications.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">Aucune notification envoyée.</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {notifications.map((n: any) => (
              <Card key={n.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-1">{new Date(n.createdAt).toLocaleString('fr-FR')}</p>
                      <p className="font-semibold text-foreground">{n.title}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                    </div>
                    <button onClick={() => handleDelete(n.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg flex-shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
