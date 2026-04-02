import type { APRSLocation } from './aprs';

export interface StoredSettings {
  callsign?: string;
  passcode?: string;
  commentText?: string;
  statusText?: string;
  /** @deprecated kept for backward compatibility */
  statuText?: string;
  scheduleInterval?: number;
  lastGPSLocation?: APRSLocation;
}

const STORAGE_KEY = 'aprs-settings';

export function loadSettings(): StoredSettings {
  if (typeof window === 'undefined') return {};
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return {};

    const parsed = JSON.parse(stored) as StoredSettings;
    if (parsed.statuText && !parsed.statusText) {
      parsed.statusText = parsed.statuText;
      delete parsed.statuText;
      saveSettings(parsed);
    }

    return parsed;
  } catch {
    return {};
  }
}

export function saveSettings(settings: StoredSettings): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Silently fail if localStorage is not available
  }
}

export function updateSetting<K extends keyof StoredSettings>(key: K, value: StoredSettings[K]): void {
  const settings = loadSettings();
  settings[key] = value;
  saveSettings(settings);
}
