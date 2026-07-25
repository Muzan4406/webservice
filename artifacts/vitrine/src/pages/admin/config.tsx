import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import {
  useGetPaymentConfig, useUpdatePaymentConfig,
  useConfirmVipPurchase, useGetAppSettings, useUpdateAppSettings,
  getGetPaymentConfigQueryKey, getGetAppSettingsQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft } from 'lucide-react';

export default function AdminConfigPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: config } = useGetPaymentConfig({ query: { queryKey: getGetPaymentConfigQueryKey() } });
  const { data: appSettings } = useGetAppSettings({ query: { queryKey: getGetAppSettingsQueryKey() } });
  const { mutate: updateConfig, isPending: isUpdating } = useUpdatePaymentConfig();
  const { mutate: confirmVip, isPending: isConfirming } = useConfirmVipPurchase();
  const { mutate: updateAppSettings, isPending: isUpdatingApp } = useUpdateAppSettings();

  const [form, setForm] = useState({
    tmoneyEnabled: true, moovMoneyEnabled: true,
    moovMoneyNumber: '', moovMoneyUssdCode: '',
    internationalPaymentApiUrl: '', internationalPaymentApiKey: '',
    sendavapayApiKey: '', sendavapayWebhookSecret: '',
  });
  const [appForm, setAppForm] = useState({
    maintenanceMode: false, maintenanceMessage: '',
    vipPriceFcfa: 5000,
    whatsappChannelUrl: '', whatsappSupport1Url: '', whatsappSupport2Url: '',
    telegramSupportUrl: '',
  });
  const [vipUserId, setVipUserId] = useState('');

  useEffect(() => {
    if (config) {
      setForm({
        tmoneyEnabled: config.tmoneyEnabled,
        moovMoneyEnabled: config.moovMoneyEnabled,
        moovMoneyNumber: config.moovMoneyNumber || '',
        moovMoneyUssdCode: config.moovMoneyUssdCode || '',
        internationalPaymentApiUrl: config.internationalPaymentApiUrl || '',
        internationalPaymentApiKey: config.internationalPaymentApiKey || '',
        sendavapayApiKey: (config as any).sendavapayApiKey || '',
        sendavapayWebhookSecret: (config as any).sendavapayWebhookSecret || '',
      });
    }
  }, [config]);

  useEffect(() => {
    if (appSettings) {
      setAppForm({
        maintenanceMode: appSettings.maintenanceMode,
        maintenanceMessage: appSettings.maintenanceMessage || '',
        vipPriceFcfa: appSettings.vipPriceFcfa,
        whatsappChannelUrl: appSettings.whatsappChannelUrl || '',
        whatsappSupport1Url: appSettings.whatsappSupport1Url || '',
        whatsappSupport2Url: appSettings.whatsappSupport2Url || '',
        telegramSupportUrl: appSettings.telegramSupportUrl || '',
      });
    }
  }, [appSettings]);

  const handleSaveConfig = () => {
    updateConfig({ data: form }, {
      onSuccess: () => { toast.success('Configuration paiements mise à jour.'); queryClient.invalidateQueries({ queryKey: getGetPaymentConfigQueryKey() }); },
      onError: () => toast.error('Impossible de mettre à jour.'),
    });
  };

  const handleSaveAppSettings = () => {
    updateAppSettings({
      data: {
        maintenanceMode: appForm.maintenanceMode,
        maintenanceMessage: appForm.maintenanceMessage || undefined,
        vipPriceFcfa: appForm.vipPriceFcfa,
        whatsappChannelUrl: appForm.whatsappChannelUrl || undefined,
        whatsappSupport1Url: appForm.whatsappSupport1Url || undefined,
        whatsappSupport2Url: appForm.whatsappSupport2Url || undefined,
        telegramSupportUrl: appForm.telegramSupportUrl || undefined,
      },
    }, {
      onSuccess: () => { toast.success('Paramètres app mis à jour.'); queryClient.invalidateQueries({ queryKey: getGetAppSettingsQueryKey() }); },
      onError: () => toast.error('Impossible de mettre à jour.'),
    });
  };

  const handleConfirmVip = () => {
    if (!vipUserId.trim()) { toast.error('Entrez l\'ID utilisateur.'); return; }
    confirmVip({ data: { userId: Number(vipUserId) } }, {
      onSuccess: () => { toast.success('Statut VIP accordé.'); setVipUserId(''); },
      onError: (err: any) => toast.error(err?.data?.error ?? 'Erreur.'),
    });
  };

  const sf = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const sa = (k: string, v: any) => setAppForm(f => ({ ...f, [k]: v }));

  return (
    <div className="min-h-screen bg-[#F4F6FB] pb-8">
      <div className="bg-gradient-to-br from-[#1a2a5e] to-[#0f1a3e] p-6 pb-8">
        <div className="flex items-center gap-3">
          <button onClick={() => setLocation('/admin')} className="text-white/70 hover:text-white"><ArrowLeft className="w-6 h-6" /></button>
          <h1 className="text-2xl font-bold text-white">Configuration</h1>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-4">
        {/* App Settings */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <p className="text-sm font-semibold text-muted-foreground uppercase">Paramètres Application</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Mode maintenance</p>
                <p className="text-xs text-muted-foreground">Affiche une page de maintenance aux utilisateurs</p>
              </div>
              <input type="checkbox" checked={appForm.maintenanceMode} onChange={e => sa('maintenanceMode', e.target.checked)} className="w-5 h-5 rounded" />
            </div>
            {appForm.maintenanceMode && (
              <div className="space-y-1.5">
                <Label>Message de maintenance</Label>
                <Input value={appForm.maintenanceMessage} onChange={e => sa('maintenanceMessage', e.target.value)} placeholder="Message affiché aux utilisateurs" />
              </div>
            )}
            <Separator />
            <div className="space-y-1.5">
              <Label>Prix VIP (FCFA)</Label>
              <Input type="number" value={appForm.vipPriceFcfa} onChange={e => sa('vipPriceFcfa', Number(e.target.value))} />
            </div>
            <Separator />
            <p className="text-sm font-medium text-muted-foreground">Liens Support</p>
            {[
              { key: 'whatsappChannelUrl', label: '📢 Canal WhatsApp', ph: 'https://wa.me/…' },
              { key: 'whatsappSupport1Url', label: '💬 Support WhatsApp 1', ph: 'https://wa.me/…' },
              { key: 'whatsappSupport2Url', label: '💬 Support WhatsApp 2', ph: 'https://wa.me/…' },
              { key: 'telegramSupportUrl', label: '✈️ Telegram Support', ph: 'https://t.me/…' },
            ].map(({ key, label, ph }) => (
              <div key={key} className="space-y-1.5">
                <Label>{label}</Label>
                <Input placeholder={ph} value={(appForm as any)[key]} onChange={e => sa(key, e.target.value)} />
              </div>
            ))}
            <Button className="w-full" onClick={handleSaveAppSettings} disabled={isUpdatingApp}>
              {isUpdatingApp ? 'Enregistrement…' : 'Enregistrer les paramètres'}
            </Button>
          </CardContent>
        </Card>

        {/* Payment Config */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <p className="text-sm font-semibold text-muted-foreground uppercase">Configuration Paiements</p>
            <div className="flex items-center justify-between">
              <p className="font-semibold">TMoney activé</p>
              <input type="checkbox" checked={form.tmoneyEnabled} onChange={e => sf('tmoneyEnabled', e.target.checked)} className="w-5 h-5 rounded" />
            </div>
            <div className="flex items-center justify-between">
              <p className="font-semibold">Moov Money activé</p>
              <input type="checkbox" checked={form.moovMoneyEnabled} onChange={e => sf('moovMoneyEnabled', e.target.checked)} className="w-5 h-5 rounded" />
            </div>
            <Separator />
            {[
              { key: 'moovMoneyNumber', label: 'Numéro Moov Money', ph: '9X XX XX XX' },
              { key: 'moovMoneyUssdCode', label: 'Code USSD Moov Money', ph: '*144#' },
              { key: 'internationalPaymentApiUrl', label: 'API URL (international)', ph: 'https://…' },
              { key: 'internationalPaymentApiKey', label: 'Clé API (international)', ph: 'sk_…' },
              { key: 'sendavapayApiKey', label: 'Clé API SendavaPay', ph: 'sp_…' },
              { key: 'sendavapayWebhookSecret', label: 'Secret Webhook SendavaPay', ph: 'whsec_…' },
            ].map(({ key, label, ph }) => (
              <div key={key} className="space-y-1.5">
                <Label>{label}</Label>
                <Input placeholder={ph} value={(form as any)[key]} onChange={e => sf(key, e.target.value)} type={key.includes('Key') || key.includes('Secret') ? 'password' : 'text'} />
              </div>
            ))}
            <Button className="w-full" onClick={handleSaveConfig} disabled={isUpdating}>
              {isUpdating ? 'Enregistrement…' : 'Enregistrer la configuration'}
            </Button>
          </CardContent>
        </Card>

        {/* VIP manual confirmation */}
        <Card>
          <CardContent className="p-5 space-y-3">
            <p className="text-sm font-semibold text-muted-foreground uppercase">Confirmation VIP manuelle</p>
            <p className="text-xs text-muted-foreground">Pour les paiements reçus hors système automatisé.</p>
            <div className="space-y-1.5">
              <Label>ID Utilisateur (base de données)</Label>
              <Input type="number" placeholder="Ex: 42" value={vipUserId} onChange={e => setVipUserId(e.target.value)} />
            </div>
            <Button className="w-full" onClick={handleConfirmVip} disabled={isConfirming}>
              {isConfirming ? 'Traitement…' : 'Confirmer le statut VIP'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
