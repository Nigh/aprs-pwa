export interface StoredSettings {
  callsign?: string;
  passcode?: string;
  commentText?: string;
  statuText?: string;
  scheduleInterval?: number;
}

const STORAGE_KEY = 'aprs-settings';

export function loadSettings(): StoredSettings {
  if (typeof window === 'undefined') return {};
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
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
