export type PreviewLength = 'normal' | 'long' | 'very_long';

export interface PlayerSettings {
  soundEnabled: boolean;
  reducedMotion: boolean;
  previewLength: PreviewLength;
}

const SETTINGS_KEY = 'memorabilia_settings';

const DEFAULT_SETTINGS: PlayerSettings = {
  soundEnabled: true,
  reducedMotion: false,
  previewLength: 'long',
};

export function getPlayerSettings(): PlayerSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function savePlayerSettings(settings: Partial<PlayerSettings>): PlayerSettings {
  const next = { ...getPlayerSettings(), ...settings };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  return next;
}

export function getPreviewMultiplier(setting: PreviewLength): number {
  if (setting === 'very_long') return 1.75;
  if (setting === 'long') return 1.35;
  return 1;
}
