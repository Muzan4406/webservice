import React from 'react';
import { Platform, View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

interface Props {
  label: string;
  value: string; // 'YYYY-MM-DD'
  onChange: (date: string) => void;
  placeholder?: string;
}

export default function DatePickerInput({ label, value, onChange, placeholder = 'AAAA-MM-JJ' }: Props) {
  const colors = useColors();

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      {Platform.OS === 'web' ? (
        <View style={[styles.webBox, { backgroundColor: colors.input, borderColor: colors.border }]}>
          <Ionicons name="calendar-outline" size={18} color={colors.mutedForeground} style={{ marginRight: 8 }} />
          {React.createElement('input', {
            type: 'date',
            value: value,
            onChange: (e: any) => onChange(e.target.value),
            style: {
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: 15,
              fontFamily: 'Inter_500Medium, Inter, sans-serif',
              color: value ? colors.foreground : colors.mutedForeground,
              cursor: 'pointer',
            },
          })}
        </View>
      ) : (
        <View style={[styles.webBox, { backgroundColor: colors.input, borderColor: colors.border }]}>
          <Ionicons name="calendar-outline" size={18} color={colors.mutedForeground} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.nativeInput, { color: colors.foreground }]}
            value={value}
            onChangeText={onChange}
            placeholder={placeholder}
            placeholderTextColor={colors.mutedForeground}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 8 },
  label: { fontSize: 13, fontWeight: '600' },
  webBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  nativeInput: { flex: 1, fontSize: 15 },
});
