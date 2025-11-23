import { writable, derived } from 'svelte/store';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  timestamp: Date;
}

function createToastStore() {
  const { subscribe, set, update } = writable<Toast[]>([]);

  return {
    subscribe,
    add: (message: string, type: ToastType = 'info', duration = 5000) => {
      const id = Date.now().toString();
      const toast: Toast = { id, message, type, timestamp: new Date() };
      
      update(toasts => [...toasts, toast]);
      
      if (duration > 0) {
        setTimeout(() => {
          update(toasts => toasts.filter(t => t.id !== id));
        }, duration);
      }
      
      return id;
    },
    remove: (id: string) => {
      update(toasts => toasts.filter(t => t.id !== id));
    },
    clear: () => {
      set([]);
    }
  };
}

export const toasts = createToastStore();

export function showSuccess(message: string, duration = 5000) {
  return toasts.add(message, 'success', duration);
}

export function showError(message: string, duration = 5000) {
  return toasts.add(message, 'error', duration);
}

export function showWarning(message: string, duration = 5000) {
  return toasts.add(message, 'warning', duration);
}

export function showInfo(message: string, duration = 5000) {
  return toasts.add(message, 'info', duration);
}

export const recentLogs = writable<Toast[]>([]);

export function logToHistory(message: string, type: ToastType = 'info') {
  const toast: Toast = { 
    id: Date.now().toString(), 
    message, 
    type, 
    timestamp: new Date() 
  };
  recentLogs.update(logs => [toast, ...logs].slice(0, 100)); // Keep last 100 logs
}
