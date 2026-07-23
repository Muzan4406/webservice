import React, { useState } from 'react';
import { TouchableOpacity, View, Text, StyleSheet, ActivityIndicator, Image, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { getStoredToken } from '@/contexts/AuthContext';

interface Props {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
}

function resolvePreviewUri(value: string): string {
  if (value.startsWith('/api')) return `https://${process.env.EXPO_PUBLIC_DOMAIN}${value}`;
  return value;
}

export default function ImagePickerButton({ value, onChange, label = "Image" }: Props) {
  const colors = useColors();
  const [uploading, setUploading] = useState(false);

  const pick = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission refusée', "L'accès à la galerie est requis pour uploader une image.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      base64: true,
      quality: 0.7,
    });

    if (result.canceled || !result.assets[0]?.base64) return;
    const asset = result.assets[0];

    setUploading(true);
    try {
      const token = await getStoredToken();
      const domain = process.env.EXPO_PUBLIC_DOMAIN;
      const res = await fetch(`https://${domain}/api/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          base64: asset.base64,
          mimeType: asset.mimeType ?? 'image/jpeg',
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error ?? `HTTP ${res.status}`);
      }

      const data = await res.json() as { url?: string; error?: string };
      if (data.url) {
        onChange(data.url);
      } else {
        throw new Error(data.error ?? 'URL manquante dans la réponse');
      }
    } catch (e: any) {
      console.error('Upload failed', e);
      Alert.alert('Échec de l\'upload', e?.message ?? 'Impossible d\'uploader l\'image. Réessayez.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <TouchableOpacity
        style={[styles.btn, { backgroundColor: colors.input, borderColor: colors.border }]}
        onPress={pick}
        disabled={uploading}
        activeOpacity={0.75}
      >
        {uploading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : value ? (
          <>
            <Image source={{ uri: resolvePreviewUri(value) }} style={styles.preview} />
            <View style={styles.changeOverlay}>
              <Ionicons name="pencil" size={16} color="#fff" />
            </View>
          </>
        ) : (
          <>
            <Ionicons name="image-outline" size={28} color={colors.mutedForeground} />
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>Appuyer pour sélectionner</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 8 },
  label: { fontSize: 13, fontWeight: '600' },
  btn: {
    height: 100,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    gap: 8,
  },
  hint: { fontSize: 13 },
  preview: { width: '100%', height: '100%', position: 'absolute' },
  changeOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 16,
    padding: 6,
  },
});
