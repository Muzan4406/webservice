import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// ─── Types ────────────────────────────────────────────────────────────────────

type ToastType = 'error' | 'success' | 'info' | 'warning';

interface ToastMessage {
  id: number;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextValue {
  showToast: (type: ToastType, title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showSuccess: (title: string, message?: string) => void;
  showInfo: (title: string, message?: string) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const TOAST_DURATION = 3500; // ms before auto-dismiss
const ANIMATION_DURATION = 280;

const TOAST_CONFIG: Record<ToastType, { bg: string; border: string; icon: any; iconColor: string; titleColor: string }> = {
  error:   { bg: '#FFF0F0', border: '#FCA5A5', icon: 'alert-circle',       iconColor: '#DC2626', titleColor: '#991B1B' },
  success: { bg: '#F0FDF4', border: '#86EFAC', icon: 'checkmark-circle',    iconColor: '#16A34A', titleColor: '#166534' },
  info:    { bg: '#EFF6FF', border: '#93C5FD', icon: 'information-circle',  iconColor: '#2563EB', titleColor: '#1E40AF' },
  warning: { bg: '#FFFBEB', border: '#FCD34D', icon: 'warning',             iconColor: '#D97706', titleColor: '#92400E' },
};

// ─── Single Toast Item ────────────────────────────────────────────────────────

interface ToastItemProps {
  toast: ToastMessage;
  onDismiss: (id: number) => void;
  topOffset: number;
}

function ToastItem({ toast, onDismiss, topOffset }: ToastItemProps) {
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const cfg = TOAST_CONFIG[toast.type];

  React.useEffect(() => {
    // Slide in
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 9 }),
      Animated.timing(opacity, { toValue: 1, duration: ANIMATION_DURATION, useNativeDriver: true }),
    ]).start();

    // Auto-dismiss
    const timer = setTimeout(() => dismiss(), TOAST_DURATION);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function dismiss() {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -120, duration: ANIMATION_DURATION, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: ANIMATION_DURATION, useNativeDriver: true }),
    ]).start(() => onDismiss(toast.id));
  }

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          top: topOffset,
          backgroundColor: cfg.bg,
          borderColor: cfg.border,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <Ionicons name={cfg.icon} size={22} color={cfg.iconColor} style={styles.toastIcon} />
      <View style={styles.toastBody}>
        <Text style={[styles.toastTitle, { color: cfg.titleColor }]} numberOfLines={2}>
          {toast.title}
        </Text>
        {!!toast.message && (
          <Text style={[styles.toastMessage, { color: cfg.titleColor, opacity: 0.8 }]} numberOfLines={3}>
            {toast.message}
          </Text>
        )}
      </View>
      <TouchableOpacity onPress={dismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Ionicons name="close" size={18} color={cfg.iconColor} style={{ opacity: 0.6 }} />
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = ++nextId;
    setToasts((prev) => {
      // Keep at most 3 toasts at once
      const trimmed = prev.length >= 3 ? prev.slice(1) : prev;
      return [...trimmed, { id, type, title, message }];
    });
  }, []);

  const showError   = useCallback((title: string, msg?: string) => showToast('error',   title, msg), [showToast]);
  const showSuccess = useCallback((title: string, msg?: string) => showToast('success', title, msg), [showToast]);
  const showInfo    = useCallback((title: string, msg?: string) => showToast('info',    title, msg), [showToast]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const topOffset = insets.top + (Platform.OS === 'web' ? 12 : 8);

  return (
    <ToastContext.Provider value={{ showToast, showError, showSuccess, showInfo }}>
      {children}
      <Modal
        visible={toasts.length > 0}
        transparent
        animationType="none"
        statusBarTranslucent
      >
        {/* box-none: container transparent aux touches, les ToastItems les reçoivent */}
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          {toasts.map((toast, index) => (
            <ToastItem
              key={toast.id}
              toast={toast}
              onDismiss={dismiss}
              topOffset={topOffset + index * 84}
            />
          ))}
        </View>
      </Modal>
    </ToastContext.Provider>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 9999,
  },
  toastIcon: { flexShrink: 0 },
  toastBody: { flex: 1, gap: 2 },
  toastTitle: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    lineHeight: 20,
  },
  toastMessage: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
  },
});
