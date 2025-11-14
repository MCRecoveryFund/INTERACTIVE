/**
 * MC Recovery Fund - Configuration
 * Centralized configuration and constants
 */

export const HYPERLIQUID_API = {
  endpoint: "https://api.hyperliquid.xyz/info",
  vaultAddress: "0x914434e8a235cb608a94a5f70ab8c40927152a24",
};

export const TAB_ROUTES = {
  home: { icon: "🏠", label: "Главная", badge: 0 },
  learn: { icon: "📚", label: "Обучение", badge: 0 },
  game: { icon: "🪙", label: "Игра", badge: 0, special: true }, // Выделенная вкладка
  data: { icon: "📊", label: "Данные", badge: 0 },
  more: { icon: "👤", label: "Профиль", badge: 0 },
};

export const PAGE_TO_TAB = {
  quizzes: "learn",
  quiz: "learn",
  "quiz-question": "learn",
  "quiz-result": "learn",
  edu: "learn",
  glossary: "learn",
  faq: "learn",
  literature: "learn",
  dashboard: "data",
  broadcasts: "data",
  announcements: "data",
  documents: "data",
  "my-progress": "more",
  achievements: "more",
  instructions: "more",
  support: "more",
};

export const CACHE_CONFIG = {
  maxSize: 100,
  enableLRU: true,
};

export const GLOSSARY_CONFIG = {
  itemHeight: 200, // Approximate card height for virtualization
  visibleBuffer: 10, // Number of items to render outside viewport
};

export const PERFORMANCE_CONFIG = {
  debounceDelay: 300,
  throttleDelay: 150,
  scrollDebounce: 50,
  lazyLoadThreshold: 0.01,
  lazyLoadRootMargin: "50px 0px",
};

export const TIMING_CONFIG = {
  splashMinDuration: 3000, // Minimum splash screen display time
  initMinDuration: 5000, // Minimum initialization duration
  tabBarUpdateDelay: 50, // Delay before updating tab bar
  onboardingIdleTimeout: 3500, // Timeout for onboarding idle callback
  onboardingLoadDelay: 2500, // Delay before loading onboarding for existing users
  onboardingRetryDelay: 200, // Delay between element detection retries
  onboardingMaxRetries: 3, // Maximum retry attempts for element detection
  onboardingStepDelay: 400, // Delay before starting onboarding
  onboardingCheckInterval: 500, // Interval for checking data availability
  glossaryChunkSize: 50, // Glossary virtual scroll chunk size
  vaultCacheTimeout: 60000, // Vault data cache timeout (1 minute)
  vaultLoadTimeout: 1000, // Timeout for vault data loading (requestIdleCallback)
  vaultLoadFallback: 300, // Fallback timeout for vault data loading
  apiRateLimitDelay: 30000, // API rate limit delay (30 seconds)
  animationDebounce: 100, // Animation debounce delay
  notificationDuration: 3000, // Duration for showing notifications
  triggerButtonDelay: 2000, // Delay for showing onboarding trigger button
};

export const GAME_CONFIG = {
  // Игровые механики
  tapReward: 1, // TAPS за один тап
  betMultiplier: 1.8, // Множитель выигрыша
  betDuration: 30, // Длительность ставки в секундах
  minBet: 10, // Минимальная ставка
  
  // Криптоактивы
  assets: ["BTC", "ETH", "SOL", "HYPE"],
  
  // Canvas настройки
  canvas: {
    chartHeight: 200,
    chartPadding: 40,
    chartPoints: 30, // Количество точек на графике
    tapEffectMaxRadius: 30, // Maximum radius for tap ripple effect
    tapEffectRadiusStep: 2, // Radius increment per frame
    tapEffectOpacityStep: 0.05, // Opacity decrement per frame
    tapEffectLineWidth: 2, // Stroke line width
    colors: {
      up: "#10b981",
      down: "#ef4444",
      neutral: "#6b7280",
      grid: "#374151",
      text: "#9ca3af",
      tapEffect: "#1326FD" // Tap ripple effect color
    }
  },
  
  // Лидерборд
  leaderboard: {
    maxEntries: 100,
    topCount: 10
  }
};

// Экспортируем конфигурацию таймингов в глобальную область для скриптов без модулей
if (typeof window !== "undefined") {
  window.TIMING_CONFIG = TIMING_CONFIG;
}
