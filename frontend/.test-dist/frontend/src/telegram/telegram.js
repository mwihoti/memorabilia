"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTelegramWebApp = getTelegramWebApp;
exports.isTelegramWebApp = isTelegramWebApp;
exports.initTelegramApp = initTelegramApp;
exports.getTelegramUser = getTelegramUser;
exports.showBackButton = showBackButton;
exports.hideBackButton = hideBackButton;
exports.showMainButton = showMainButton;
exports.hideMainButton = hideMainButton;
exports.updateMainButtonText = updateMainButtonText;
exports.showMainButtonLoading = showMainButtonLoading;
exports.hideMainButtonLoading = hideMainButtonLoading;
exports.hapticImpact = hapticImpact;
exports.hapticNotification = hapticNotification;
exports.hapticSelection = hapticSelection;
exports.showAlert = showAlert;
exports.showConfirm = showConfirm;
exports.showPopup = showPopup;
exports.closeTelegramApp = closeTelegramApp;
exports.openLink = openLink;
exports.openTelegramLink = openTelegramLink;
exports.getThemeColors = getThemeColors;
exports.getColorScheme = getColorScheme;
/**
 * Get Telegram WebApp instance
 */
function getTelegramWebApp() {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
        return window.Telegram.WebApp;
    }
    return null;
}
/**
 * Check if running inside Telegram
 */
function isTelegramWebApp() {
    return getTelegramWebApp() !== null;
}
/**
 * Initialize Telegram Mini App
 */
function initTelegramApp() {
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
function getTelegramUser() {
    const webApp = getTelegramWebApp();
    if (!webApp)
        return null;
    return webApp.initDataUnsafe.user ?? null;
}
/**
 * Show Telegram back button
 */
function showBackButton(onClick) {
    const webApp = getTelegramWebApp();
    if (!webApp)
        return;
    webApp.BackButton.onClick(onClick);
    webApp.BackButton.show();
}
/**
 * Hide Telegram back button
 */
function hideBackButton() {
    const webApp = getTelegramWebApp();
    if (!webApp)
        return;
    webApp.BackButton.hide();
}
/**
 * Show Telegram main button
 */
function showMainButton(text, onClick, options) {
    const webApp = getTelegramWebApp();
    if (!webApp)
        return;
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
function hideMainButton() {
    const webApp = getTelegramWebApp();
    if (!webApp)
        return;
    webApp.MainButton.hide();
}
/**
 * Update main button text
 */
function updateMainButtonText(text) {
    const webApp = getTelegramWebApp();
    if (!webApp)
        return;
    webApp.MainButton.setText(text);
}
/**
 * Show main button loading
 */
function showMainButtonLoading() {
    const webApp = getTelegramWebApp();
    if (!webApp)
        return;
    webApp.MainButton.showProgress(false);
}
/**
 * Hide main button loading
 */
function hideMainButtonLoading() {
    const webApp = getTelegramWebApp();
    if (!webApp)
        return;
    webApp.MainButton.hideProgress();
}
/**
 * Haptic feedback - impact
 */
function hapticImpact(style = 'medium') {
    const webApp = getTelegramWebApp();
    if (!webApp)
        return;
    webApp.HapticFeedback.impactOccurred(style);
}
/**
 * Haptic feedback - notification
 */
function hapticNotification(type) {
    const webApp = getTelegramWebApp();
    if (!webApp)
        return;
    webApp.HapticFeedback.notificationOccurred(type);
}
/**
 * Haptic feedback - selection changed
 */
function hapticSelection() {
    const webApp = getTelegramWebApp();
    if (!webApp)
        return;
    webApp.HapticFeedback.selectionChanged();
}
/**
 * Show Telegram alert
 */
function showAlert(message, callback) {
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
function showConfirm(message, callback) {
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
function showPopup(title, message, buttons, callback) {
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
function closeTelegramApp() {
    const webApp = getTelegramWebApp();
    if (!webApp)
        return;
    webApp.close();
}
/**
 * Open link in external browser
 */
function openLink(url) {
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
function openTelegramLink(url) {
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
function getThemeColors() {
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
function getColorScheme() {
    const webApp = getTelegramWebApp();
    return webApp?.colorScheme || 'dark';
}
