import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import {
  useGetCurrentContest, useGetContestLeaderboard, useCreateContest, useUpdateContest,
  getGetCurrentContestQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';

export default function AdminContestPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: contest, isLoading } = useGetCurrentContest({ query: { queryKey: getGetCurrentContestQueryKey() } });
  const { data: leaderboard } = useGetContestLeaderboard();
  const { mutate: createContest, isPending: isCreating } = useCreateContest();
  const { mutate: updateContest, isPending: isUpdating } = useUpdateContest();

  const [form, setForm] = useState({ title: '', description: '', reward: '', startDate: '', endDate: '' });

  useEffect(() => {
    if (contest) {
      setForm({
        title: contest.title,
        description: contest.description,
        reward: contest.reward,
        startDate: contest.startDate.slice(0, 10),
        endDate: contest.endDate.slice(0, 10),
      });
    }
  }, [contest]);

  const handleSave = () => {
    if (!form.startDate || !form.endDate) { toast.error('Veuillez renseigner les dates.'); return; }
    const opts = {
      onSuccess: () => { toast.success(contest?.id ? 'Concours mis à jour.' : 'Concours créé.'); queryClient.invalidateQueries({ queryKey: getGetCurrentContestQueryKey() }); },
      onError: (err: any) => toast.error(err?.data?.error ?? 'Erreur.'),
    };
    if (contest?.id) updateContest({ id: contest.id, data: form }, opts);
    else createContest({ data: form }, opts);
  };

  const entries: any[] = (leaderboard as any)?.entries ?? [];

  return (
    <div className="min-h-screen bg-[#F4F6FB] pb-8">
      <div className="bg-gradient-to-br from-[#1a2a5e] to-[#0f1a3e] p-6 pb-8">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => setLocation('/admin')} className="text-white/70 hover:text-white"><ArrowLeft className="w-6 h-6" /></button>
          <h1 className="text-2xl font-bold text-white">Concours</h1>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-4">
        {/* Config form */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-muted-foreground uppercase">Configuration</p>
              {(contest as any)?.isActive && <Badge className="bg-green-100 text-green-700">ACTIF</Badge>}
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5"><Label>Titre</Label><Input placeholder="Titre du concours" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Description</Label><Textarea placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} /></div>
              <div className="space-y-1.5"><Label>Récompense</Label><Input placeholder="Ex: 50.000 XOF" value={form.reward} onChange={e => setForm({ ...form, reward: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Date de début</Label><Input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Date de fin</Label><Input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} /></div>
              </div>
            </div>
            <Button className="w-full" onClick={handleSave} disabled={isCreating || isUpdating}>
              {isCreating || isUpdating ? 'Enregistrement…' : contest ? 'Mettre à jour' : 'Créer le concours'}
            </Button>
          </CardContent>
        </Card>

        {/* Leaderboard */}
        <p className="text-sm font-semibold text-muted-foreground uppercase px-1">Classement actuel</p>
        {entries.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">Aucun participant pour l'instant.</CardContent></Card>
        ) : (
          <Card>
            <CardContent className="p-0 divide-y">
              {entries.map((entry: any) => (
                <div key={entry.rank} className="flex items-center gap-3 p-4">
                  <span className="text-sm font-bold text-muted-foreground w-8">#{entry.rank}</span>
                  <div className="w-8 h-8 rounded-full overflow-hidden">
                    <img src="/logo.png" alt="avatar" className="w-full h-full object-cover" />
                  </div>
                  <span className="flex-1 text-sm font-semibold">{entry.username}</span>
                  <span className="text-sm font-bold text-primary">{entry.referralCount} pts</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
