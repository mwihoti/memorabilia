import { TelegramWebApp, TelegramUser } from '../types';

/**
 * Get Telegram WebApp instance
 */
export function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    return window.Telegram.WebApp;
  }
  return null;
}

/**
 * Check if running inside Telegram
 */
export function isTelegramWebApp(): boolean {
  return getTelegramWebApp() !== null;
}

/**
 * Initialize Telegram Mini App
 */
export function initTelegramApp(): TelegramUser | null {
  const webApp = getTelegramWebApp();
  
  if (!webApp) {
    console.warn('⚠️ Not running in Telegram WebApp');
    return null;
  }

  console.log('📱 Initializing Telegram Mini App...');
  
  // Signal that the app is ready
  webApp.ready();
  
  // Expand to full height
  webApp.expand();
  
  // Enable closing confirmation
  webApp.isClosingConfirmationEnabled = true;
  
  // Set header color
  webApp.headerColor = '#0ea5e9';
  webApp.backgroundColor = '#17212b';
  
  // Get user data
  const user = webApp.initDataUnsafe.user;
  
  if (user) {
    console.log('✅ Telegram user:', user);
    return user;
  }
  
  console.warn('⚠️ No Telegram user data available');
  return null;
}

/**
 * Get authenticated Telegram user.
 * Returns null if not inside Telegram or user data is unavailable.
 * No fallback — unauthenticated users must open the game via Telegram.
 */
export function getTelegramUser(): TelegramUser | null {
  const webApp = getTelegramWebApp();
  if (!webApp) return null;
  return webApp.initDataUnsafe.user ?? null;
}

/**
 * Show Telegram back button
 */
export function showBackButton(onClick: () => void): void {
  const webApp = getTelegramWebApp();
  if (!webApp) return;
  
  webApp.BackButton.onClick(onClick);
  webApp.BackButton.show();
}

/**
 * Hide Telegram back button
 */
export function hideBackButton(): void {
  const webApp = getTelegramWebApp();
  if (!webApp) return;
  
  webApp.BackButton.hide();
}

/**
 * Show Telegram main button
 */
export function showMainButton(
  text: string,
  onClick: () => void,
  options?: {
    color?: string;
    textColor?: string;
  }
): void {
  const webApp = getTelegramWebApp();
  if (!webApp) return;
  
  webApp.MainButton.setText(text);
  
  if (options?.color) {
    webApp.MainButton.color = options.color;
  }
  
  if (options?.textColor) {
    webApp.MainButton.textColor = options.textColor;
  }
  
  webApp.MainButton.onClick(onClick);
  webApp.MainButton.show();
  webApp.MainButton.enable();
}

/**
 * Hide Telegram main button
 */
export function hideMainButton(): void {
  const webApp = getTelegramWebApp();
  if (!webApp) return;
  
  webApp.MainButton.hide();
}

/**
 * Update main button text
 */
export function updateMainButtonText(text: string): void {
  const webApp = getTelegramWebApp();
  if (!webApp) return;
  
  webApp.MainButton.setText(text);
}

/**
 * Show main button loading
 */
export function showMainButtonLoading(): void {
  const webApp = getTelegramWebApp();
  if (!webApp) return;
  
  webApp.MainButton.showProgress(false);
}

/**
 * Hide main button loading
 */
export function hideMainButtonLoading(): void {
  const webApp = getTelegramWebApp();
  if (!webApp) return;
  
  webApp.MainButton.hideProgress();
}

/**
 * Haptic feedback - impact
 */
export function hapticImpact(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'medium'): void {
  const webApp = getTelegramWebApp();
  if (!webApp) return;
  
  webApp.HapticFeedback.impactOccurred(style);
}

/**
 * Haptic feedback - notification
 */
export function hapticNotification(type: 'error' | 'success' | 'warning'): void {
  const webApp = getTelegramWebApp();
  if (!webApp) return;
  
  webApp.HapticFeedback.notificationOccurred(type);
}

/**
 * Haptic feedback - selection changed
 */
export function hapticSelection(): void {
  const webApp = getTelegramWebApp();
  if (!webApp) return;
  
  webApp.HapticFeedback.selectionChanged();
}

/**
 * Show Telegram alert
 */
export function showAlert(message: string, callback?: () => void): void {
  const webApp = getTelegramWebApp();
  if (!webApp) {
    alert(message);
    callback?.();
    return;
  }
  
  webApp.showAlert(message, callback);
}

/**
 * Show Telegram confirm dialog
 */
export function showConfirm(message: string, callback?: (confirmed: boolean) => void): void {
  const webApp = getTelegramWebApp();
  if (!webApp) {
    const confirmed = confirm(message);
    callback?.(confirmed);
    return;
  }
  
  webApp.showConfirm(message, callback);
}

/**
 * Show Telegram popup
 */
export function showPopup(
  title: string,
  message: string,
  buttons?: Array<{ id?: string; type?: string; text?: string }>,
  callback?: (buttonId: string) => void
): void {
  const webApp = getTelegramWebApp();
  if (!webApp) {
    alert(`${title}\n\n${message}`);
    return;
  }
  
  webApp.showPopup({ title, message, buttons }, callback);
}

/**
 * Close Telegram Mini App
 */
export function closeTelegramApp(): void {
  const webApp = getTelegramWebApp();
  if (!webApp) return;
  
  webApp.close();
}

/**
 * Open link in external browser
 */
export function openLink(url: string): void {
  const webApp = getTelegramWebApp();
  if (!webApp) {
    window.open(url, '_blank');
    return;
  }
  
  webApp.openLink(url);
}

/**
 * Open Telegram link
 */
export function openTelegramLink(url: string): void {
  const webApp = getTelegramWebApp();
  if (!webApp) {
    window.open(url, '_blank');
    return;
  }
  
  webApp.openTelegramLink(url);
}

/**
 * Get theme colors
 */
export function getThemeColors() {
  const webApp = getTelegramWebApp();
  
  if (!webApp) {
    return {
      bgColor: '#17212b',
      textColor: '#ffffff',
      hintColor: '#708499',
      linkColor: '#62bcf9',
      buttonColor: '#5288c1',
      buttonTextColor: '#ffffff',
    };
  }
  
  return {
    bgColor: webApp.themeParams.bg_color || '#17212b',
    textColor: webApp.themeParams.text_color || '#ffffff',
    hintColor: webApp.themeParams.hint_color || '#708499',
    linkColor: webApp.themeParams.link_color || '#62bcf9',
    buttonColor: webApp.themeParams.button_color || '#5288c1',
    buttonTextColor: webApp.themeParams.button_text_color || '#ffffff',
  };
}

/**
 * Get color scheme
 */
export function getColorScheme(): 'light' | 'dark' {
  const webApp = getTelegramWebApp();
  return webApp?.colorScheme || 'dark';
}

