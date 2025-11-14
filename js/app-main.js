/**
 * MC Recovery Fund - Main Application Entry Point
 * Модульная архитектура для максимальной производительности
 */

import { AppState } from './core/state.js';
import { TIMING_CONFIG } from './core/config.js';
import { initTelegram, tg } from './modules/telegram.js';
import { loadUserData } from './modules/storage.js';
import { loadVaultData } from './modules/api.js';
import { switchTab, renderTabBar, handleBackButton } from './modules/navigation.js';
import { toggleTheme, initThemeIcons } from './modules/theme.js';
import { initLazyLoading } from './utils/performance.js';
import { workerAPI } from './utils/worker-api.js';

// Global Event Delegation Handler - оптимизирован для INP <200ms
// Используем capture phase для более быстрой обработки
document.addEventListener("click", (e) => {
  // Используем requestAnimationFrame для неблокирующей обработки
  requestAnimationFrame(async () => {
    const target = e.target.closest("[data-action]");
    if (!target) return;

    const action = target.dataset.action;

    switch (action) {
      case "switchTab":
        const tabName = target.dataset.tab || target.closest(".tab-item")?.dataset.tab;
        if (tabName) {
          // switchTab уже оптимизирован с RAF внутри
          switchTab(tabName);
        }
        break;
      
    case "navigate": {
      const { navigate } = await import('./modules/navigation.js');
      const route = target.dataset.route;
      const quizId = target.dataset.quizId;
      navigate(route, quizId ? { id: quizId } : {});
      break;
    }
      
    case "refreshVault": {
      const { refreshVault } = await import('./components/home.js');
      refreshVault();
      break;
    }
      
    case "startQuiz": {
      const { startQuiz } = await import('./components/quiz.js');
      startQuiz(target.dataset.quizId);
      break;
    }
      
    case "selectAnswer": {
      const { selectAnswer } = await import('./components/quiz.js');
      selectAnswer(parseInt(target.dataset.index));
      break;
    }
      
    case "submitAnswer": {
      const { submitAnswer } = await import('./components/quiz.js');
      submitAnswer();
      break;
    }
      
    case "showHint": {
      const { showHint } = await import('./components/quiz.js');
      showHint();
      break;
    }
      
    case "skipQuestion": {
      const { skipQuestion } = await import('./components/quiz.js');
      skipQuestion();
      break;
    }
      
    case "downloadResult": {
      const { downloadResult } = await import('./components/quiz.js');
      downloadResult();
      break;
    }
      
    case "shareResult": {
      const { shareResult } = await import('./components/quiz.js');
      shareResult();
      break;
    }
      
    case "toggleCollapsible": {
      const { hapticFeedback } = await import('./modules/telegram.js');
      hapticFeedback("light");
      const content = target.nextElementSibling;
      const icon = target.querySelector(".collapsible-icon");
      content?.classList.toggle("open");
      icon?.classList.toggle("open");
      break;
    }
      
    case "openLink": {
      const { openLink } = await import('./modules/telegram.js');
      openLink(target.dataset.url);
      break;
    }
      
    case "toggleQuizGroup": {
      const { hapticFeedback } = await import('./modules/telegram.js');
      hapticFeedback("light");
      const group = target.closest('.quiz-difficulty-group');
      if (group) {
        document.querySelectorAll('.quiz-difficulty-group').forEach(g => {
          if (g !== group) g.classList.remove('expanded');
        });
        group.classList.toggle('expanded');
      }
      break;
    }
      
    case "restartOnboarding":
      if (window.restartOnboarding) {
        window.restartOnboarding();
      }
      break;
      
    case "resetAppData": {
      const { resetAppData } = await import('./modules/storage.js');
      resetAppData();
      break;
    }
      
    case "refreshLeaderboard": {
      const { loadLeaderboard } = await import('./components/game.js');
      loadLeaderboard();
      break;
    }
      
    case "openVideo": {
      const { openVideo } = await import('./components/edu.js');
      openVideo(target.dataset.url);
      break;
    }
      
    case "scrollToFAQ": {
      const faqId = target.dataset.faqId;
      if (faqId) {
        const faqItem = document.getElementById(faqId);
        const faqToggle = document.getElementById(`faq-btn-${faqId}`);
        
        if (faqItem && faqToggle) {
          const { hapticFeedback } = await import('./modules/telegram.js');
          hapticFeedback('light');
          
          faqToggle.setAttribute('aria-expanded', 'true');
          const answerId = `faq-answer-${faqId}`;
          const answer = document.getElementById(answerId);
          if (answer) answer.hidden = false;
          faqItem.classList.add('faq-item-open');
          
          faqItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
          faqItem.classList.add('faq-item-highlight');
          setTimeout(() => {
            faqItem.classList.remove('faq-item-highlight');
          }, 2000);
        }
      }
      break;
    }
    }
  });
});

// Динамическая загрузка onboarding
async function loadOnboarding() {
  try {
    // Загружаем CSS онбординга динамически
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = 'css/onboarding.css';
    document.head.appendChild(cssLink);
    
    // Ждем загрузки CSS перед загрузкой JS
    await new Promise(resolve => {
      cssLink.onload = resolve;
      setTimeout(resolve, 100); // fallback
    });
    
    // Теперь загружаем JS
    await import('./onboarding.js');
  } catch (err) {
    console.error('[App] Failed to load onboarding:', err);
  }
}

// Initialize app
document.addEventListener("DOMContentLoaded", async () => {
  // Synchronous initialization
  initTelegram();
  loadUserData();
  initThemeIcons();
  
  // Initialize worker API early for glossary search
  workerAPI.init();

  // Setup event handlers
  const themeToggle = document.getElementById("themeToggle");
  if (themeToggle) {
    themeToggle.onclick = toggleTheme;
  }
  
  const backBtn = document.getElementById("backBtn");
  if (backBtn) {
    backBtn.onclick = handleBackButton;
  }
  
  // Telegram BackButton handler
  window.addEventListener('telegram-back', handleBackButton);

  // Initialize Tab Bar
  renderTabBar();

  // Restore last active tab
  const lastTab = localStorage.getItem("lastActiveTab") || "home";
  const hash = window.location.hash.substring(1);
  const tabRoutes = ["home", "learn", "game", "data", "more"];
  const initialTab = tabRoutes.includes(hash) ? hash : lastTab;
  AppState.activeTab = initialTab;

  // Wait for critical data, then render
  if (window.APP_DATA_READY) {
    initializeApp(hash, initialTab, tabRoutes);
  } else {
    document.addEventListener('app-data-ready', () => {
      initializeApp(hash, initialTab, tabRoutes);
    }, { once: true });
  }

  // Initialize lazy loading
  initLazyLoading();

  // Maximum component prefetching during 4-second splash screen
  // Load ALL components while splash is visible for instant navigation
  const prefetchStart = performance.now();
  
  Promise.all([
    // All main tab components
    import('./components/learn.js'),
    import('./components/more.js'),
    import('./components/data.js'),
    import('./components/game.js'),
    import('./components/home.js'),
    
    // Frequently used modules
    import('./modules/storage.js'),
    import('./modules/api.js'),
    import('./modules/theme.js'),
    
    // Sub-components for learn tab
    import('./components/quiz.js'),
    import('./components/edu.js'),
    import('./components/glossary.js'),
    
    // Sub-components for data tab
    import('./components/dashboard.js'),
    
    // Sub-components for more tab
    import('./components/progress.js'),
    import('./components/instructions.js'),
    import('./components/faq.js'),
    import('./components/support.js')
  ]).then(() => {
    // All components prefetched
  }).catch(err => {
    // Component preload failed - non-critical
  });

  // Загружаем onboarding ПОСЛЕ того как vault данные загрузятся
  // Это гарантирует что на шаге 3 онбординга данные уже будут видны
  const hasSeenOnboarding = localStorage.getItem('mcrf_hasSeenOnboarding') === 'true';
  if (!hasSeenOnboarding) {
    // Ждем пока vault данные загрузятся (минимум 2 секунды после splash)
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        // Дополнительная проверка что данные загружены
        const checkDataAndLoadOnboarding = () => {
          if (AppState.vaultData.positions || AppState.vaultData.loading) {
            // Данные есть или загружаются - запускаем онбординг
            loadOnboarding();
          } else {
            // Данные еще не загружаются - ждем еще
            setTimeout(checkDataAndLoadOnboarding, TIMING_CONFIG.onboardingCheckInterval);
          }
        };
        checkDataAndLoadOnboarding();
      }, { timeout: TIMING_CONFIG.onboardingIdleTimeout });
    } else {
      setTimeout(() => {
        const checkDataAndLoadOnboarding = () => {
          if (AppState.vaultData.positions || AppState.vaultData.loading) {
            loadOnboarding();
          } else {
            setTimeout(checkDataAndLoadOnboarding, TIMING_CONFIG.onboardingCheckInterval);
          }
        };
        checkDataAndLoadOnboarding();
      }, TIMING_CONFIG.onboardingLoadDelay);
    }
  } else {
    // Для пользователей, которые видели onboarding, загружаем позже
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => loadOnboarding(), { timeout: 10000 }); // Low priority lazy load
    }
  }
});

/**
 * Helper function to load vault data and re-render home if needed
 */
async function loadVaultDataWithCallback() {
  try {
    await loadVaultData();
    // Re-render home page if we're still on it
    if (AppState.currentRoute === "home") {
      const { render } = await import('./components/home.js');
      const container = document.getElementById("content");
      if (container) render(container);
    }
  } catch (err) {
    console.error("Failed to load initial vault data:", err);
  }
}

async function initializeApp(hash, initialTab, tabRoutes) {
  const initStart = performance.now();
  
  // Dynamic splash screen - minimum duration from config
  // Will wait for all data to load OR minimum duration (whichever is longer)
  const minSplashDuration = TIMING_CONFIG.splashMinDuration;
  const splashStartTime = performance.now();

  if (tabRoutes.includes(hash)) {
    switchTab(hash);
  } else if (hash && hash !== "home") {
    const { navigate } = await import('./modules/navigation.js');
    navigate(hash);
  } else {
    switchTab(initialTab);
  }

  // Load Vault data IMMEDIATELY after initialization
  // Загружаем сразу, чтобы данные отображались на домашней странице
  loadVaultDataWithCallback();

  const initTime = performance.now() - initStart;
  
  // Hide splash screen with smooth transition
  hideSplashScreen(splashStartTime, minSplashDuration);
}

/**
 * Hide splash screen with minimum duration guarantee
 * Best practice: Always show splash for at least 800-1200ms
 */
function hideSplashScreen(startTime, minDuration) {
  const elapsed = performance.now() - startTime;
  const remainingTime = Math.max(0, minDuration - elapsed);
  
  setTimeout(() => {
    const splash = document.getElementById('splashScreen');
    if (splash) {
      // Add fade-out class
      splash.classList.add('fade-out');
      
      // Remove from DOM after animation completes
      setTimeout(() => {
        splash.remove();
      }, 400); // Match CSS transition duration
    }
  }, remainingTime);
}

// Global error handlers
window.addEventListener("error", (e) => {
  console.error("Global error:", e.error);
});

window.addEventListener("unhandledrejection", (e) => {
  console.error("Unhandled promise rejection:", e.reason);
});

// Export for backward compatibility
window.AppState = AppState;
