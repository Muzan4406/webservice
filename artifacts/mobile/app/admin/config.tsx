import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useToast } from '@/contexts/ToastContext';
import {
  useGetPaymentConfig,
  useUpdatePaymentConfig,
  useConfirmVipPurchase,
  useGetAppSettings,
  useUpdateAppSettings,
  getGetPaymentConfigQueryKey,
  getGetAppSettingsQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';

export default function AdminConfig() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  
  const { data: config, isLoading } = useGetPaymentConfig({
    query: { queryKey: getGetPaymentConfigQueryKey() }
  });
  const { data: appSettings, isLoading: isLoadingAppSettings } = useGetAppSettings({
    query: { queryKey: getGetAppSettingsQueryKey() }
  });

  const { mutate: updateConfig, isPending: isUpdating } = useUpdatePaymentConfig();
  const { mutate: confirmVip, isPending: isConfirming } = useConfirmVipPurchase();
  const { mutate: updateAppSettings, isPending: isUpdatingAppSettings } = useUpdateAppSettings();

  const [form, setForm] = useState({
    tmoneyEnabled: true,
    moovMoneyEnabled: true,
    moovMoneyNumber: '',
    moovMoneyUssdCode: '',
    internationalPaymentApiUrl: '',
    internationalPaymentApiKey: '',
    sendavapayApiKey: '',
    sendavapayWebhookSecret: '',
  });
  const [appForm, setAppForm] = useState({
    maintenanceMode: false,
    maintenanceMessage: '',
    vipPriceFcfa: 5000,
    whatsappChannelUrl: '',
    whatsappSupport1Url: '',
    whatsappSupport2Url: '',
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
      onSuccess: () => {
        showSuccess('Succès', 'Configuration paiements mise à jour.');
        queryClient.invalidateQueries({ queryKey: getGetPaymentConfigQueryKey() });
      },
      onError: () => showError('Erreur', 'Impossible de mettre à jour la configuration.'),
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
      }
    }, {
      onSuccess: () => {
        showSuccess('Succès', 'Paramètres de l\'application mis à jour.');
        queryClient.invalidateQueries({ queryKey: getGetAppSettingsQueryKey() });
      },
      onError: () => showError('Erreur', 'Impossible de mettre à jour les paramètres.'),
    });
  };

  const handleConfirmVip = () => {
    const id = parseInt(vipUserId);
    if (isNaN(id)) return showError('ID invalide', 'Veuillez entrer un ID numérique valide.');
    confirmVip({ data: { userId: id } }, {
      onSuccess: () => {
        showSuccess('Succès', 'Utilisateur défini comme VIP.');
        setVipUserId('');
      },
      onError: () => showError('Erreur', 'Impossible de définir l\'utilisateur comme VIP.'),
    });
  };

  if (isLoading || isLoadingAppSettings) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.root, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>

      {/* ── Moyens de paiement ────────────────────────────── */}
      <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Moyens de paiement</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.row}>
          <View>
            <Text style={[styles.label, { color: colors.foreground }]}>T-Money</Text>
            <Text style={[styles.sub, { color: colors.mutedForeground }]}>Dépôts nationaux</Text>
          </View>
          <Switch 
            value={form.tmoneyEnabled} 
            onValueChange={(v) => setForm({ ...form, tmoneyEnabled: v })} 
            trackColor={{ true: colors.primary }}
          />
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.row}>
          <View>
            <Text style={[styles.label, { color: colors.foreground }]}>Moov Money</Text>
            <Text style={[styles.sub, { color: colors.mutedForeground }]}>Dépôts nationaux</Text>
          </View>
          <Switch 
            value={form.moovMoneyEnabled} 
            onValueChange={(v) => setForm({ ...form, moovMoneyEnabled: v })} 
            trackColor={{ true: colors.primary }}
          />
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <Text style={[styles.sub, { color: colors.mutedForeground, marginBottom: 8 }]}>Numéro et code USSD Moov Money (affichés aux utilisateurs)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
          placeholder="Numéro Moov Money"
          placeholderTextColor={colors.mutedForeground}
          value={form.moovMoneyNumber}
          onChangeText={(t) => setForm({ ...form, moovMoneyNumber: t })}
        />
        <TextInput
          style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border, marginTop: 12 }]}
          placeholder="Code USSD (ex: *145*...#)"
          placeholderTextColor={colors.mutedForeground}
          value={form.moovMoneyUssdCode}
          onChangeText={(t) => setForm({ ...form, moovMoneyUssdCode: t })}
        />
      </View>

      {/* ── API Internationale (legacy) ───────────────────── */}
      <Text style={[styles.sectionTitle, { color: colors.mutedForeground, marginTop: 24 }]}>API Internationale (Ancienne)</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TextInput
          style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
          placeholder="URL API (ex: https://...)"
          placeholderTextColor={colors.mutedForeground}
          value={form.internationalPaymentApiUrl}
          onChangeText={(t) => setForm({ ...form, internationalPaymentApiUrl: t })}
          autoCapitalize="none"
          keyboardType="url"
        />
        <TextInput
          style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border, marginTop: 12 }]}
          placeholder="Clé API"
          placeholderTextColor={colors.mutedForeground}
          value={form.internationalPaymentApiKey}
          onChangeText={(t) => setForm({ ...form, internationalPaymentApiKey: t })}
          secureTextEntry
        />
      </View>

      {/* ── SendavaPay ────────────────────────────────────── */}
      <Text style={[styles.sectionTitle, { color: colors.mutedForeground, marginTop: 24 }]}>SendavaPay (Dépôts Internationaux & VIP)</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sub, { color: colors.mutedForeground, marginBottom: 12 }]}>
          Clé SDK SendavaPay pour les paiements internationaux et l'achat VIP automatique.
        </Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
          placeholder="Clé SDK (sk_...)"
          placeholderTextColor={colors.mutedForeground}
          value={form.sendavapayApiKey}
          onChangeText={(t) => setForm({ ...form, sendavapayApiKey: t })}
          autoCapitalize="none"
          secureTextEntry
        />
        <TextInput
          style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border, marginTop: 12 }]}
          placeholder="Secret Webhook (pour vérification HMAC)"
          placeholderTextColor={colors.mutedForeground}
          value={form.sendavapayWebhookSecret}
          onChangeText={(t) => setForm({ ...form, sendavapayWebhookSecret: t })}
          autoCapitalize="none"
          secureTextEntry
        />
        <View style={[{ marginTop: 12, padding: 12, borderRadius: 10, backgroundColor: '#EEF2FF' }]}>
          <Text style={{ fontSize: 12, color: '#4F46E5', fontFamily: 'Inter_500Medium', lineHeight: 18 }}>
            URL Webhook à configurer dans SendavaPay :{'\n'}
            <Text style={{ fontWeight: '700', fontSize: 11 }}>
              {process.env.EXPO_PUBLIC_API_BASE_URL?.replace('/api', '') ?? 'https://votre-domaine'}/webhooks/sendavapay
            </Text>
          </Text>
        </View>
        <TouchableOpacity 
          style={[styles.submitBtn, { backgroundColor: colors.primary, marginTop: 16 }]} 
          onPress={handleSaveConfig}
          disabled={isUpdating}
        >
          {isUpdating ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Enregistrer la config</Text>}
        </TouchableOpacity>
      </View>

      {/* ── Paramètres de l'application ───────────────────── */}
      <Text style={[styles.sectionTitle, { color: colors.mutedForeground, marginTop: 24 }]}>Paramètres de l'application</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sub, { color: colors.mutedForeground, marginBottom: 8 }]}>Prix VIP (FCFA)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
          placeholder="Ex: 5000"
          placeholderTextColor={colors.mutedForeground}
          value={String(appForm.vipPriceFcfa)}
          onChangeText={(t) => setAppForm({ ...appForm, vipPriceFcfa: Number(t) || 0 })}
          keyboardType="numeric"
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={[styles.label, { color: colors.foreground }]}>Mode maintenance</Text>
            <Text style={[styles.sub, { color: colors.mutedForeground }]}>Bloque l'accès pour les utilisateurs</Text>
          </View>
          <Switch
            value={appForm.maintenanceMode}
            onValueChange={(v) => setAppForm({ ...appForm, maintenanceMode: v })}
            trackColor={{ true: colors.warning }}
          />
        </View>
        {appForm.maintenanceMode && (
          <TextInput
            style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border, marginTop: 12, height: 80 }]}
            placeholder="Message affiché aux utilisateurs"
            placeholderTextColor={colors.mutedForeground}
            value={appForm.maintenanceMessage}
            onChangeText={(t) => setAppForm({ ...appForm, maintenanceMessage: t })}
            multiline
          />
        )}
      </View>

      {/* ── Liens Support ─────────────────────────────────── */}
      <Text style={[styles.sectionTitle, { color: colors.mutedForeground, marginTop: 24 }]}>Support client</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>

        {/* WhatsApp Channel */}
        <View style={styles.linkRow}>
          <View style={[styles.linkIcon, { backgroundColor: '#25D36615' }]}>
            <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
          </View>
          <Text style={[styles.linkLabel, { color: colors.foreground }]}>Chaîne WhatsApp</Text>
        </View>
        <TextInput
          style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
          placeholder="https://whatsapp.com/channel/..."
          placeholderTextColor={colors.mutedForeground}
          value={appForm.whatsappChannelUrl}
          onChangeText={(t) => setAppForm({ ...appForm, whatsappChannelUrl: t })}
          autoCapitalize="none"
          keyboardType="url"
        />

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* WhatsApp SAV 1 */}
        <View style={styles.linkRow}>
          <View style={[styles.linkIcon, { backgroundColor: '#25D36615' }]}>
            <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
          </View>
          <Text style={[styles.linkLabel, { color: colors.foreground }]}>Service client WhatsApp 1</Text>
        </View>
        <TextInput
          style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
          placeholder="https://wa.me/..."
          placeholderTextColor={colors.mutedForeground}
          value={appForm.whatsappSupport1Url}
          onChangeText={(t) => setAppForm({ ...appForm, whatsappSupport1Url: t })}
          autoCapitalize="none"
          keyboardType="url"
        />

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* WhatsApp SAV 2 */}
        <View style={styles.linkRow}>
          <View style={[styles.linkIcon, { backgroundColor: '#25D36615' }]}>
            <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
          </View>
          <Text style={[styles.linkLabel, { color: colors.foreground }]}>Service client WhatsApp 2</Text>
        </View>
        <TextInput
          style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
          placeholder="https://wa.me/..."
          placeholderTextColor={colors.mutedForeground}
          value={appForm.whatsappSupport2Url}
          onChangeText={(t) => setAppForm({ ...appForm, whatsappSupport2Url: t })}
          autoCapitalize="none"
          keyboardType="url"
        />

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Telegram */}
        <View style={styles.linkRow}>
          <View style={[styles.linkIcon, { backgroundColor: '#229ED915' }]}>
            <Ionicons name="paper-plane" size={18} color="#229ED9" />
          </View>
          <Text style={[styles.linkLabel, { color: colors.foreground }]}>Service client Telegram</Text>
        </View>
        <TextInput
          style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
          placeholder="https://t.me/..."
          placeholderTextColor={colors.mutedForeground}
          value={appForm.telegramSupportUrl}
          onChangeText={(t) => setAppForm({ ...appForm, telegramSupportUrl: t })}
          autoCapitalize="none"
          keyboardType="url"
        />

        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: colors.primary, marginTop: 20 }]}
          onPress={handleSaveAppSettings}
          disabled={isUpdatingAppSettings}
        >
          {isUpdatingAppSettings
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.submitText}>Enregistrer les paramètres</Text>}
        </TouchableOpacity>
      </View>

      {/* ── Confirmation VIP manuelle ──────────────────────── */}
      <Text style={[styles.sectionTitle, { color: colors.mutedForeground, marginTop: 24 }]}>Confirmation VIP Manuelle</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sub, { color: colors.mutedForeground, marginBottom: 12 }]}>Utile pour les paiements reçus hors système automatisé.</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
          placeholder="ID Utilisateur (Base de données)"
          placeholderTextColor={colors.mutedForeground}
          value={vipUserId}
          onChangeText={setVipUserId}
          keyboardType="numeric"
        />
        <TouchableOpacity 
          style={[styles.submitBtn, { backgroundColor: colors.warning, marginTop: 16 }]} 
          onPress={handleConfirmVip}
          disabled={isConfirming}
        >
          {isConfirming ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Forcer le statut VIP</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', marginBottom: 12, marginLeft: 4 },
  card: { padding: 16, borderRadius: 16, borderWidth: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 15, fontWeight: '600' },
  sub: { fontSize: 12, marginTop: 2 },
  divider: { height: 1, marginVertical: 14 },
  input: { height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, outlineStyle: 'none' as any },
  submitBtn: { height: 48, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  linkIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  linkLabel: { fontSize: 14, fontWeight: '600' },
});
