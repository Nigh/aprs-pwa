import { writable } from 'svelte/store';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  timestamp: Date;
}

const LOG_STORAGE_KEY = 'aprs-recent-logs';
const MAX_LOGS = 100;

function deserializeLogs(): Toast[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(LOG_STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored) as Array<Omit<Toast, 'timestamp'> & { timestamp: string }>;
    return parsed.map((log) => ({
      ...log,
      timestamp: new Date(log.timestamp),
    }));
  } catch {
    return [];
  }
}

function persistLogs(logs: Toast[]) {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(logs));
  } catch {
    // Ignore storage failures
  }
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

function createRecentLogsStore() {
  const { subscribe, set, update } = writable<Toast[]>(deserializeLogs());

  return {
    subscribe,
    set: (logs: Toast[]) => {
      const trimmed = logs.slice(0, MAX_LOGS);
      persistLogs(trimmed);
      set(trimmed);
    },
    clear: () => {
      persistLogs([]);
      set([]);
    },
    add: (toast: Toast) => {
      update((logs) => {
        const nextLogs = [toast, ...logs].slice(0, MAX_LOGS);
        persistLogs(nextLogs);
        return nextLogs;
      });
    },
  };
}

export const recentLogs = createRecentLogsStore();

export function logToHistory(message: string, type: ToastType = 'info') {
  const toast: Toast = { 
    id: Date.now().toString(), 
    message, 
    type, 
    timestamp: new Date() 
  };
  recentLogs.add(toast);
}
