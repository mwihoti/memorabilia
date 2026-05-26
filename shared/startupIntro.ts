export type StartupIntroState = {
  showOpeningIntro: boolean;
  showSplashIntro: boolean;
};

export function resolveStartupIntroState(hasSeenOpening: boolean): StartupIntroState {
  if (hasSeenOpening) {
    return { showOpeningIntro: false, showSplashIntro: true };
  }

  return { showOpeningIntro: true, showSplashIntro: false };
}
