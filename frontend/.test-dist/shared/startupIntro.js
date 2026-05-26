export function resolveStartupIntroState(hasSeenOpening) {
    if (hasSeenOpening) {
        return { showOpeningIntro: false, showSplashIntro: true };
    }
    return { showOpeningIntro: true, showSplashIntro: false };
}
