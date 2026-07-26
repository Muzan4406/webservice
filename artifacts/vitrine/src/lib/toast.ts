// Custom centered toast — remplace sonner

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

type Listener = (item: ToastItem) => void;
const listeners: Listener[] = [];
let counter = 0;

function emit(message: string, type: ToastType) {
  const item: ToastItem = { id: ++counter, message, type };
  listeners.forEach((l) => l(item));
}

export const toast = {
  success: (message: string) => emit(message, 'success'),
  error:   (message: string) => emit(message, 'error'),
  warning: (message: string) => emit(message, 'warning'),
  info:    (message: string) => emit(message, 'info'),
};

export function subscribeToast(fn: Listener): () => void {
  listeners.push(fn);
  return () => {
    const i = listeners.indexOf(fn);
    if (i >= 0) listeners.splice(i, 1);
  };
}
