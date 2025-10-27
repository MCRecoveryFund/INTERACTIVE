// MC Recovery Fund - Main Application Logic
// Part 1: Core functionality and routing
// ==========================================

// Hyperliquid API Configuration
const HYPERLIQUID_API = {
  endpoint: "https://api.hyperliquid.xyz/info",
  vaultAddress: "0x914434e8a235cb608a94a5f70ab8c40927152a24",
};

// Tab Bar Configuration
const TAB_ROUTES = {
  home: { icon: "🏠", label: "Главная", badge: 0 },
  learn: { icon: "📚", label: "Обучение", badge: 0 },
  data: { icon: "📊", label: "Данные", badge: 0 },
  progress: { icon: "🏆", label: "Прогресс", badge: 0 },
  more: { icon: "⚙️", label: "Ещё", badge: 0 },
};

// Маппинг страниц к родительским табам
const PAGE_TO_TAB = {
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
  "my-progress": "progress",
  achievements: "progress",
  instructions: "more",
  support: "more",
};

// ==========================================
// Performance Optimization Utilities
// ==========================================

// Render cache for memoization
const RenderCache = {
  _cache: new Map(),
  _maxSize: 50,
  
  get(key) {
    return this._cache.get(key);
  },
  
  set(key, value) {
    if (this._cache.size >= this._maxSize) {
      const firstKey = this._cache.keys().next().value;
      this._cache.delete(firstKey);
    }
    this._cache.set(key, value);
  },
  
  clear(pattern) {
    if (pattern) {
      for (const key of this._cache.keys()) {
        if (key.includes(pattern)) {
          this._cache.delete(key);
        }
      }
    } else {
      this._cache.clear();
    }
  }
};

// Ensure data module is loaded before rendering
async function ensureDataLoaded(moduleName) {
  if (!window.APP_DATA._loaded[moduleName]) {
    try {
      await window.loadDataModule(moduleName);
    } catch (err) {
      console.error(`Failed to load ${moduleName}:`, err);
      return false;
    }
  }
  return true;
}

// Batch DOM updates to minimize reflows
const BatchDOMUpdater = {
  _pending: [],
  _rafId: null,
  
  schedule(fn) {
    this._pending.push(fn);
    if (!this._rafId) {
      this._rafId = requestAnimationFrame(() => {
        const updates = this._pending.splice(0);
        this._rafId = null;
        updates.forEach(fn => fn());
      });
    }
  }
};

// Debounce function for performance
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Throttle function for scroll/resize events
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Global State
const AppState = {
  currentRoute: "home",
  activeTab: "home", // Добавлено для tab bar
  parentTab: null, // Родительский таб для возврата
  currentQuiz: null,
  currentQuestion: 0,
  quizAnswers: [],
  userData: {
    streak: 0,
    lastActiveDate: null,
    completedQuizzes: [],
    unlockedBadges: [],
    progress: { quizzes: 0, eduTopics: 0, glossaryViewed: 0 },
    settings: { theme: "auto", language: "ru" },
  },
  vaultData: {
    positions: null,
    metrics: null,
    loading: false,
    error: null,
    lastUpdated: null,
  },
};

// Telegram WebApp Integration
let tg = null;
try {
  tg = window.Telegram?.WebApp;
  if (tg) {
    tg.ready();
    tg.expand();
    tg.enableClosingConfirmation();
    // Учитываем текущую схему Telegram при старте
    if (tg.colorScheme) {
      document.documentElement.setAttribute(
        "data-theme",
        tg.colorScheme === "dark" ? "dark" : "light"
      );
    }
    if (tg.themeParams) applyTelegramTheme(tg.themeParams);

    // Реагируем на смену темы в клиенте Telegram
    tg.onEvent("themeChanged", () => {
      const scheme = tg.colorScheme === "dark" ? "dark" : "light";
      const r = document.documentElement;
      r.setAttribute("data-theme", scheme);
      // снимаем возможные инлайновые переопределения,
      // чтобы сработали CSS-переменные темы
      r.style.removeProperty("--color-text");
      r.style.removeProperty("--color-bg");
      if (tg.themeParams) applyTelegramTheme(tg.themeParams);
    });
    tg.MainButton.setText("Продолжить");
    tg.MainButton.hide();
  }
} catch (e) {
  console.log("Running outside Telegram WebApp");
}

function applyTelegramTheme(params) {
  const root = document.documentElement;
  // НЕ перетираем базовые токены темы (--color-bg/--color-text)!
  // Акцент/кнопки можно обновить из Telegram:
  if (params.button_color) {
    root.style.setProperty("--color-primary", params.button_color);
  }
  // При желании экспонируем «сырая» палитра Telegram в отдельные переменные:
  if (params.bg_color) root.style.setProperty("--tg-bg", params.bg_color);
  if (params.text_color) root.style.setProperty("--tg-text", params.text_color);
}

function hapticFeedback(type = "light") {
  try {
    if (tg?.HapticFeedback) {
      if (type === "success" || type === "error") {
        tg.HapticFeedback.notificationOccurred(type);
      } else {
        tg.HapticFeedback.impactOccurred(type);
      }
    }
  } catch (e) {}
}

function saveUserData() {
  try {
    localStorage.setItem(
      "mc_recovery_user_data",
      JSON.stringify(AppState.userData)
    );
  } catch (e) {
    console.error("Failed to save:", e);
  }
}

function loadUserData() {
  try {
    const saved = localStorage.getItem("mc_recovery_user_data");
    if (saved) {
      AppState.userData = { ...AppState.userData, ...JSON.parse(saved) };
      updateStreak();
    }
  } catch (e) {
    console.error("Failed to load:", e);
  }
}

function updateStreak() {
  const today = new Date().toDateString();
  const lastActive = AppState.userData.lastActiveDate;
  if (lastActive !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (lastActive === yesterday.toDateString()) {
      AppState.userData.streak += 1;
    } else if (lastActive) {
      AppState.userData.streak = 1;
    }
    AppState.userData.lastActiveDate = today;
    saveUserData();
  }
}

// ==========================================
// Tab Bar Functions
// ==========================================

function switchTab(tabName) {
  // Haptic feedback
  if (tg) tg.HapticFeedback?.impactOccurred("light");
  else hapticFeedback("light");

  // Мгновенно скроллим в начало ДО рендеринга
  window.scrollTo({ top: 0, behavior: "auto" });

  // Обновить состояние
  AppState.activeTab = tabName;
  AppState.currentRoute = tabName;
  AppState.parentTab = null; // Сбрасываем родительский таб при переключении

  // Сохранить последний активный таб
  localStorage.setItem("lastActiveTab", tabName);

  // Обновить UI tab bar
  updateTabBar();

  // Скрыть кнопку назад (мы на основном табе)
  const backBtn = document.getElementById("backBtn");
  if (backBtn) backBtn.style.display = "none";

  // Рендерить контент таба
  renderTabContent(tabName);
}

function updateTabBar() {
  const tabs = document.querySelectorAll(".tab-item");
  const indicator = document.querySelector(".tab-indicator");

  tabs.forEach((tab, index) => {
    const tabName = tab.dataset.tab;
    if (tabName === AppState.activeTab) {
      tab.classList.add("active");
      // Анимация индикатора
      if (indicator) {
        const tabWidth = tab.offsetWidth;
        const tabLeft = tab.offsetLeft;
        indicator.style.width = `${tabWidth}px`;
        indicator.style.left = `${tabLeft}px`;
      }
    } else {
      tab.classList.remove("active");
    }
  });
}

function renderTabContent(tabName) {
  const content = document.getElementById("content");

  switch (tabName) {
    case "home":
      renderHome(content);
      break;
    case "learn":
      renderLearnTab(content);
      break;
    case "data":
      renderDataTab(content);
      break;
    case "progress":
      renderProgressTab(content);
      break;
    case "more":
      renderMoreTab(content);
      break;
    default:
      renderHome(content);
  }
}

function renderTabBar() {
  const tabBar = document.getElementById("tabBar");
  if (!tabBar) return;

  const tabsHTML = Object.keys(TAB_ROUTES)
    .map((tabKey) => {
      const tab = TAB_ROUTES[tabKey];
      const isActive = AppState.activeTab === tabKey;
      return `
      <div class="tab-item ${
        isActive ? "active" : ""
      }" data-tab="${tabKey}" data-action="switchTab">
        <span class="tab-icon">${tab.icon}</span>
        <span class="tab-label">${tab.label}</span>
        ${tab.badge > 0 ? `<span class="tab-badge">${tab.badge}</span>` : ""}
      </div>
    `;
    })
    .join("");

  tabBar.innerHTML = `${tabsHTML}<div class="tab-indicator"></div>`;

  // Обновить позицию индикатора после рендера
  setTimeout(() => updateTabBar(), 50);
}

// ==========================================
// Navigation Functions
// ==========================================

function handleBackButton() {
  const currentRoute = AppState.currentRoute;

  // Если мы в процессе прохождения квиза
  if (currentRoute === "quiz-question" || currentRoute === "quiz-result") {
    navigate("quizzes");
    return;
  }

  // Если мы на странице отдельного квиза
  if (currentRoute === "quiz") {
    navigate("quizzes");
    return;
  }

  // Используем сохраненный родительский таб если есть
  if (AppState.parentTab) {
    switchTab(AppState.parentTab);
    return;
  }

  // Иначе - найти родительский таб из маппинга
  const parentTab = PAGE_TO_TAB[currentRoute];

  if (parentTab) {
    // Переключиться на родительский таб
    switchTab(parentTab);
  } else {
    // Если родительского таба нет - вернуться на home
    switchTab("home");
  }
}

function navigate(route, params = {}) {
  hapticFeedback("light");

  // Мгновенно скроллим в начало ДО рендеринга
  window.scrollTo({ top: 0, behavior: "auto" });

  // Определяем является ли это основным табом
  const isTabRoute = ["home", "learn", "data", "progress", "more"].includes(
    route
  );

  // Если это основной таб - используем switchTab
  if (isTabRoute) {
    switchTab(route);
    return;
  }

  // Для обычных страниц продолжаем стандартную навигацию
  AppState.currentRoute = route;
  window.location.hash = route;
  if (tg?.MainButton) tg.MainButton.hide();
  const backBtn = document.getElementById("backBtn");
  const tabBar = document.getElementById("tabBar");

  // Tab bar ВСЕГДА видим
  if (tabBar) tabBar.style.display = "flex";

  // Вложенная страница: показываем кнопку назад, сохраняем родительский таб
  backBtn.style.display = "flex";
  // Сохраняем текущий активный таб как родительский, если еще не сохранен
  if (!AppState.parentTab) {
    AppState.parentTab = AppState.activeTab;
  }

  renderRoute(route, params);
}

function renderRoute(route, params) {
  const content = document.getElementById("content");
  switch (route) {
    case "quizzes":
      renderQuizzes(content);
      break;
    case "quiz":
      renderQuiz(content, params.id);
      break;
    case "quiz-question":
      renderQuizQuestion(content);
      break;
    case "quiz-result":
      renderQuizResult(content);
      break;
    case "edu":
      renderEdu(content);
      break;
    case "my-progress":
      renderProgress(content);
      break;
    case "achievements":
      renderAchievements(content);
      break;
    case "glossary":
      renderGlossary(content);
      break;
    case "simulator":
      renderSimulator(content);
      break;
    case "help":
      renderHelp(content);
      break;
    case "profile":
      renderProfile(content);
      break;
    case "instructions":
      renderInstructions(content);
      break;
    case "announcements":
      renderAnnouncements(content);
      break;
    case "broadcasts":
      renderBroadcasts(content);
      break;
    case "dashboard":
      renderDashboard(content);
      break;
    case "support":
      renderSupport(content);
      break;
    case "documents":
      renderDocuments(content);
      break;
    case "faq":
      renderFAQ(content);
      break;
    case "literature":
      renderLiterature(content);
      break;
    default:
      // Если роут неизвестен - перенаправляем на главную
      switchTab("home");
      return; // Важно: выходим, чтобы не скроллить после switchTab (там свой скролл)
  }
  
  // Дополнительный скролл после рендеринга (на случай динамического контента)
  // Используем небольшую задержку, чтобы весь контент успел отрендериться
  setTimeout(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, 50);
}

function getDaysWord(num) {
  if (num % 10 === 1 && num % 100 !== 11) return "день";
  if ([2, 3, 4].includes(num % 10) && ![12, 13, 14].includes(num % 100))
    return "дня";
  return "дней";
}

function getDifficultyLabel(level) {
  const labels = { easy: "Легкий", medium: "Средний", hard: "Сложный" };
  return labels[level] || level;
}

function getDifficultyColor(level) {
  const colors = {
    easy: "var(--color-success)",
    medium: "var(--color-primary)",
    hard: "var(--color-error)",
  };
  return colors[level] || "var(--color-text)";
}

// ==========================================
// Helper Functions for UI/UX
// ==========================================

/**
 * Определяет CSS класс для APR на основе его значения
 * @param {number|string} apr - значение APR
 * @returns {string} - CSS класс (apr-positive, apr-negative, apr-neutral)
 */
function getAPRClass(apr) {
  const value = parseFloat(apr);
  if (isNaN(value) || value === 0) return "apr-neutral";
  return value > 0 ? "apr-positive" : "apr-negative";
}

/**
 * Перемешивает массив методом Fisher-Yates
 * @param {Array} array - массив для перемешивания
 * @returns {Array} - новый перемешанный массив
 */
function shuffleArray(array) {
  const shuffled = [...array]; // Создаем копию массива
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ==========================================
// Hyperliquid API Functions
// ==========================================

async function fetchHyperliquidData(requestBody) {
  try {
    const response = await fetch(HYPERLIQUID_API.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Hyperliquid API error:", error);
    throw error;
  }
}

async function fetchVaultPositions() {
  return fetchHyperliquidData({
    type: "clearinghouseState",
    user: HYPERLIQUID_API.vaultAddress,
  });
}

async function fetchVaultDetails() {
  return fetchHyperliquidData({
    type: "vaultDetails",
    vaultAddress: HYPERLIQUID_API.vaultAddress,
  });
}

async function loadVaultData() {
  if (AppState.vaultData.loading) return;

  AppState.vaultData.loading = true;
  AppState.vaultData.error = null;

  try {
    const [positions, details] = await Promise.all([
      fetchVaultPositions(),
      fetchVaultDetails(),
    ]);

    AppState.vaultData.positions = positions;
    AppState.vaultData.metrics = details;
    AppState.vaultData.lastUpdated = Date.now();
    AppState.vaultData.loading = false;

    return { positions, details };
  } catch (error) {
    AppState.vaultData.error = error.message;
    AppState.vaultData.loading = false;
    throw error;
  }
}

function formatNumber(num, decimals = 2) {
  if (!num) return "0";
  const n = parseFloat(num);
  if (isNaN(n)) return "0";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatCurrency(num) {
  return "$" + formatNumber(num, 2);
}

function formatPercent(num) {
  return formatNumber(num * 100, 2) + "%";
}

function renderVaultWidget() {
  const { positions, metrics, loading, error, lastUpdated } =
    AppState.vaultData;

  if (loading) {
    return `
      <div class="card vault-widget" id="vaultWidget">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-md);">
          <div>
            <h3 style="margin-bottom: 0;">🏦 MC Recovery Vault</h3>
          </div>
          <button class="btn-icon" data-action="refreshVault" aria-label="Обновить" title="Обновить данные">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
            </svg>
          </button>
        </div>
        <div style="text-align: center; padding: var(--space-xl) 0;">
          <div class="spinner"></div>
          <p class="caption" style="margin-top: var(--space-md);">Загрузка данных...</p>
        </div>
      </div>
    `;
  }

  if (error) {
    return `
      <div class="card vault-widget" id="vaultWidget">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-md);">
          <div>
            <h3 style="margin-bottom: 0;">🏦 MC Recovery Vault</h3>
          </div>
          <button class="btn-icon" data-action="refreshVault" aria-label="Обновить" title="Обновить данные">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
            </svg>
          </button>
        </div>
        <div style="text-align: center; padding: var(--space-lg) 0;">
          <p style="color: var(--color-error);">⚠️ Ошибка загрузки: ${error}</p>
        </div>
      </div>
    `;
  }

  if (!positions || !metrics) {
    return `
      <div class="card vault-widget" id="vaultWidget">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-md);">
          <div>
            <h3 style="margin-bottom: 0;">🏦 MC Recovery Vault</h3>
          </div>
          <button class="btn-icon" data-action="refreshVault" aria-label="Обновить" title="Обновить данные">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
            </svg>
          </button>
        </div>
        <div style="text-align: center; padding: var(--space-lg) 0;">
          <p class="caption">Нет данных. Нажмите кнопку обновить.</p>
        </div>
      </div>
    `;
  }

  // Extract metrics
  const accountValue = positions.marginSummary?.accountValue || "0";
  const totalMarginUsed = positions.marginSummary?.totalMarginUsed || "0";
  const totalNtlPos = positions.marginSummary?.totalNtlPos || "0";
  const apr = metrics.apr || 0;

  // Get portfolio data for allTime PnL
  const allTimeData = metrics.portfolio?.find(
    ([period]) => period === "allTime"
  )?.[1];
  const pnlHistory = allTimeData?.pnlHistory || [];
  const latestPnl =
    pnlHistory.length > 0 ? pnlHistory[pnlHistory.length - 1][1] : "0";

  // Open positions
  const openPositions =
    positions.assetPositions?.filter((ap) => ap.position) || [];

  const lastUpdateTime = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString("ru-RU")
    : "";

  return `
    <div class="card vault-widget" id="vaultWidget">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-md);">
        <div>
          <h3 style="margin-bottom: var(--space-xs);">🏦 MC Recovery Vault</h3>
          ${
            lastUpdateTime
              ? `<span class="caption" style="font-size: 12px;">Обновлено: ${lastUpdateTime}</span>`
              : ""
          }
        </div>
        <button class="btn-icon" data-action="refreshVault" aria-label="Обновить" title="Обновить данные">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
          </svg>
        </button>
      </div>
      
      <div class="vault-metrics">
        <div class="vault-metric">
          <span class="caption">Account Value</span>
          <strong style="font-size: 20px; color: var(--color-success);">${formatCurrency(
            accountValue
          )}</strong>
        </div>
        <div class="vault-metric">
          <span class="caption">APR</span>
          <strong style="font-size: 18px;" class="${getAPRClass(
            apr
          )}">${formatPercent(apr)}</strong>
        </div>
        <div class="vault-metric">
          <span class="caption">All-Time PnL</span>
          <strong style="font-size: 18px; color: ${
            parseFloat(latestPnl) >= 0
              ? "var(--color-success)"
              : "var(--color-error)"
          };">$
            ${formatNumber(latestPnl)}</strong>
        </div>
      </div>
      
      <div style="margin-top: var(--space-lg);">
        <h4 style="font-size: 16px; margin-bottom: var(--space-sm);">Открытые позиции (${
          openPositions.length
        })</h4>
        ${
          openPositions.length === 0
            ? '<p class="caption">Нет открытых позиций</p>'
            : `<div class="vault-positions">
              ${openPositions
                .map((ap) => {
                  const pos = ap.position;
                  const pnl = parseFloat(pos.unrealizedPnl || 0);
                  const isProfit = pnl >= 0;
                  return `
                  <div class="vault-position">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <span style="font-weight: 600;">${pos.coin}</span>
                      <span style="color: ${
                        isProfit ? "var(--color-success)" : "var(--color-error)"
                      }; font-weight: 600;">
                        ${isProfit ? "+" : ""}${formatCurrency(pnl)}
                      </span>
                    </div>
                    <div style="display: flex; gap: var(--space-md); margin-top: var(--space-xs);">
                      <span class="caption">Size: ${pos.szi}</span>
                      <span class="caption">Entry: $${formatNumber(
                        pos.entryPx
                      )}</span>
                      <span class="caption">Leverage: ${
                        pos.leverage?.value || "N/A"
                      }x</span>
                    </div>
                  </div>
                `;
                })
                .join("")}
            </div>`
        }
      </div>
      
      <div style="margin-top: var(--space-md);">
        <a href="https://app.hyperliquid.xyz/vaults/${
          HYPERLIQUID_API.vaultAddress
        }" 
           class="btn btn-primary" 
           data-action="openLink" 
           data-url="https://app.hyperliquid.xyz/vaults/${
             HYPERLIQUID_API.vaultAddress
           }"
           style="width: 100%; text-align: center; text-decoration: none; display: block;">
          🔗 Открыть на Hyperliquid
        </a>
      </div>
    </div>
  `;
}

// ==========================================
// Tab Content Renderers
// ==========================================

function renderHome(container) {
  const streak = AppState.userData.streak;
  container.innerHTML = `
    <div class="hero">
      <h1 class="hero-title">MC Recovery Fund</h1>
      <p class="hero-subtitle">Ваш проводник в мире инвестирования</p>
      ${
        streak > 0
          ? `<div style="display: flex; justify-content: center; margin-top: var(--space-md);">
        <div class="streak"><span class="streak-icon">🔥</span><span>Серия: ${streak} ${getDaysWord(
              streak
            )}</span></div>
      </div>`
          : ""
      }
    </div>

    <!-- ПРИОРИТЕТ 1: Vault Widget (ВСЕГДА на главной!) -->
    <div class="priority-section">
      ${renderVaultWidget()}
    </div>

    <!-- Быстрый доступ -->
    <section class="content-section">
      <h2 class="section-title">⚡ Быстрый доступ</h2>
      <div class="quick-access">
        <div class="nav-card" data-action="navigate" data-route="instructions">
          <div class="nav-card-icon">📖</div>
          <div class="nav-card-title">Инструкции</div>
        </div>
        <div class="nav-card" data-action="navigate" data-route="dashboard">
          <div class="nav-card-icon">📊</div>
          <div class="nav-card-title">Дашборд</div>
        </div>
        <div class="nav-card" data-action="navigate" data-route="broadcasts">
          <div class="nav-card-icon">📡</div>
          <div class="nav-card-title">Эфиры</div>
        </div>
        <div class="nav-card" data-action="navigate" data-route="announcements">
          <div class="nav-card-icon">📢</div>
          <div class="nav-card-title">Анонсы</div>
        </div>
      </div>
    </section>
  `;
}

function renderLearnTab(container) {
  const completedQuizzes = AppState.userData.completedQuizzes.length;
  container.innerHTML = `
    <div class="hero">
      <h1 class="hero-title">📚 Обучение</h1>
      <p class="hero-subtitle">Развивайте свои знания</p>
    </div>

    <section class="content-section">
      <h2 class="section-title">🎯 Квизы</h2>
      <div class="nav-grid-compact">
        <div class="nav-card" data-action="navigate" data-route="quizzes">
          <div class="nav-card-icon">🎯</div>
          <div class="nav-card-title">Все квизы</div>
          <p class="caption" style="margin: var(--space-xs) 0 0 0; font-size: 12px;">${completedQuizzes} пройдено</p>
        </div>
      </div>
    </section>

    <section class="content-section">
      <h2 class="section-title">📖 Материалы</h2>
      <div class="nav-grid-compact">
        <div class="nav-card" data-action="navigate" data-route="edu">
          <div class="nav-card-icon">🎓</div>
          <div class="nav-card-title">Инфографика</div>
        </div>
        <div class="nav-card" data-action="navigate" data-route="glossary">
          <div class="nav-card-icon">📚</div>
          <div class="nav-card-title">Глоссарий</div>
          <p class="caption" style="margin: var(--space-xs) 0 0 0; font-size: 12px;">${
            AppState.userData.progress.glossaryViewed || 0
          } / ${window.APP_DATA?.glossary?.length || 0} терминов</p>
        </div>
        <div class="nav-card" data-action="navigate" data-route="literature">
          <div class="nav-card-icon">📚</div>
          <div class="nav-card-title">Литература</div>
          <p class="caption" style="margin: var(--space-xs) 0 0 0; font-size: 12px;">Книги для изучения</p>
        </div>
        <div class="nav-card" data-action="navigate" data-route="faq">
          <div class="nav-card-icon">❓</div>
          <div class="nav-card-title">FAQ</div>
        </div>
      </div>
    </section>
  `;
}

function renderDataTab(container) {
  container.innerHTML = `
    <div class="hero">
      <h1 class="hero-title">📊 Данные</h1>
      <p class="hero-subtitle">Аналитика и информация</p>
    </div>

    <section class="content-section">
      <h2 class="section-title">📈 Аналитика</h2>
      <div class="nav-grid-compact">
        <div class="nav-card" data-action="navigate" data-route="dashboard">
          <div class="nav-card-icon">📊</div>
          <div class="nav-card-title">Дашборд</div>
        </div>
        <div class="nav-card" data-action="navigate" data-route="broadcasts">
          <div class="nav-card-icon">📡</div>
          <div class="nav-card-title">Эфиры</div>
        </div>
        <div class="nav-card" data-action="navigate" data-route="announcements">
          <div class="nav-card-icon">📢</div>
          <div class="nav-card-title">Анонсы</div>
        </div>
      </div>
    </section>

    <section class="content-section">
      <h2 class="section-title">📄 Документы</h2>
      <div class="nav-grid-compact">
        <div class="nav-card" data-action="navigate" data-route="documents">
          <div class="nav-card-icon">📄</div>
          <div class="nav-card-title">Документы</div>
        </div>
      </div>
    </section>
  `;
}

function renderProgressTab(container) {
  const completedQuizzes = AppState.userData.completedQuizzes.length;
  container.innerHTML = `
    <div class="hero">
      <h1 class="hero-title">🏆 Мой прогресс</h1>
      <p class="hero-subtitle">Отслеживайте свои достижения</p>
    </div>

    <section class="content-section">
      <h2 class="section-title">📈 Статистика</h2>
      <div class="nav-grid-compact">
        <div class="nav-card" data-action="navigate" data-route="my-progress">
          <div class="nav-card-icon">📈</div>
          <div class="nav-card-title">Детальный прогресс</div>
          <p class="caption" style="margin: var(--space-xs) 0 0 0; font-size: 12px;">${completedQuizzes} квизов</p>
        </div>
        <div class="nav-card" data-action="navigate" data-route="achievements">
          <div class="nav-card-icon">🏆</div>
          <div class="nav-card-title">Достижения</div>
          <p class="caption" style="margin: var(--space-xs) 0 0 0; font-size: 12px;">${AppState.userData.unlockedBadges.length} разблокировано</p>
        </div>
      </div>
    </section>
  `;
}

function renderMoreTab(container) {
  container.innerHTML = `
    <div class="hero">
      <h1 class="hero-title">⚙️ Ещё</h1>
      <p class="hero-subtitle">Настройки и поддержка</p>
    </div>

    <section class="content-section">
      <h2 class="section-title">📖 Ресурсы</h2>
      <div class="nav-grid-compact">
        <div class="nav-card" data-action="navigate" data-route="instructions">
          <div class="nav-card-icon">📖</div>
          <div class="nav-card-title">Инструкции</div>
        </div>
        <div class="nav-card" data-action="navigate" data-route="support">
          <div class="nav-card-icon">💬</div>
          <div class="nav-card-title">Поддержка</div>
        </div>
      </div>
    </section>

    <div class="footer" style="margin-top: var(--space-xl);">
      <p class="disclaimer">Материалы носят образовательный характер и не являются инвестиционной рекомендацией. Перед принятием финансовых решений проконсультируйтесь со специалистом.</p>
      <p class="caption">Версия 2.0.0</p>
      <p class="caption">©Copyright 2025 MC Recovery Fund</p>
    </div>
  `;
}

function renderQuizzes(container) {
  const quizzes = window.APP_DATA.quizzes || [];
  container.innerHTML = `
    <h1>Квизы</h1>
    <p class="caption mb-lg">Проверьте свои знания о финансовых инструментах и стратегиях</p>
    <div class="card-grid">
      ${quizzes
        .map((quiz) => {
          const isCompleted = AppState.userData.completedQuizzes.includes(
            quiz.id
          );
          return `<div class="card card-interactive" data-action="navigate" data-route="quiz" data-quiz-id="${
            quiz.id || "unknown"
          }">
          <div style="display: flex; justify-content: space-between; align-items: start;">
            <h3>${quiz.title || "Без названия"}</h3>${
            isCompleted ? '<span style="font-size: 24px;">✓</span>' : ""
          }
          </div>
          <p class="caption mb-md">${quiz.description || ""}</p>
          <div style="display: flex; gap: var(--space-md); flex-wrap: wrap;">
            <span class="caption">📝 ${
              (quiz.questions || []).length
            } вопросов</span>
            <span class="caption">⏱️ ~${quiz.duration || "—"} мин</span>
            <span class="caption" style="color: ${getDifficultyColor(
              quiz.difficulty
            )}">${getDifficultyLabel(quiz.difficulty || "medium")}</span>
          </div>
        </div>`;
        })
        .join("")}
    </div>
  `;
}

function renderQuiz(container, quizId) {
  const quiz = window.APP_DATA.quizzes.find((q) => q.id === quizId);
  if (!quiz) {
    navigate("quizzes");
    return;
  }
  const isCompleted = AppState.userData.completedQuizzes.includes(quizId);
  container.innerHTML = `
    <div class="card">
      <h1>${quiz.title}</h1>
      <p>${quiz.description}</p>
      <div style="margin: var(--space-lg) 0;">
        <div style="display: flex; gap: var(--space-md); margin-bottom: var(--space-md);">
          <span class="caption">📝 ${quiz.questions.length} вопросов</span>
          <span class="caption">⏱️ ~${quiz.duration} мин</span>
        </div>
        <p class="caption"><strong>Сложность:</strong> ${getDifficultyLabel(
          quiz.difficulty
        )}</p>
        ${
          isCompleted
            ? `<div style="margin-top: var(--space-md); padding: var(--space-md); background: var(--color-success); border-radius: var(--radius-md);"><p style="margin: 0;">✓ Вы уже прошли этот квиз</p></div>`
            : ""
        }
      </div>
      <button class="btn btn-primary" data-action="startQuiz" data-quiz-id="${quizId}" style="width: 100%;">${
    isCompleted ? "Пройти ещё раз" : "Начать квиз"
  }</button>
    </div>
  `;
}

function startQuiz(quizId) {
  hapticFeedback("medium");
  const quiz = window.APP_DATA.quizzes.find((q) => q.id === quizId);
  if (!quiz) return;
  AppState.currentQuiz = quiz;
  AppState.currentQuestion = 0;
  AppState.quizAnswers = [];
  navigate("quiz-question");
}

function renderQuizQuestion(container) {
  const quiz = AppState.currentQuiz;
  const questionIndex = AppState.currentQuestion;
  const question = quiz.questions[questionIndex];
  const progress = ((questionIndex + 1) / quiz.questions.length) * 100;

  // Перемешиваем ответы для каждого вопроса
  const shuffledOptions = shuffleArray(question.options);

  // Сохраняем правильный ответ и находим его новый индекс
  const correctAnswerText = question.options[question.correct];
  const newCorrectIndex = shuffledOptions.indexOf(correctAnswerText);

  // Сохраняем в состояние для проверки
  AppState.currentQuestionCorrectIndex = newCorrectIndex;

  container.innerHTML = `
    <div class="quiz-header">
      <span class="quiz-counter">${questionIndex + 1} / ${
    quiz.questions.length
  }</span>
      ${
        AppState.userData.streak > 0
          ? `<div class="streak"><span class="streak-icon">🔥</span><span>${AppState.userData.streak}</span></div>`
          : ""
      }
    </div>
    <div class="progress-bar"><div class="progress-fill" style="width: ${progress}%"></div></div>
    <h2 class="quiz-question">${question.question}</h2>
    <div class="quiz-options" id="quizOptions">
      ${shuffledOptions
        .map(
          (option, index) =>
            `<div class="quiz-option" data-index="${index}" data-action="selectAnswer">${option}</div>`
        )
        .join("")}
    </div>
    <div class="quiz-actions">
      <button class="btn btn-ghost" data-action="showHint">💡 Подсказка</button>
      <button class="btn btn-ghost" data-action="skipQuestion">⏭️ Пропустить</button>
    </div>
    <div id="hintBox" class="hidden" style="margin-top: var(--space-lg); padding: var(--space-md); background: var(--color-primary-light); border-radius: var(--radius-md);">
      <p><strong>Подсказка:</strong> ${
        question.hint || "Подсказка недоступна"
      }</p>
    </div>
  `;
  if (tg?.MainButton) {
    tg.MainButton.setText("Продолжить");
    tg.MainButton.show();
    tg.MainButton.onClick(submitAnswer);
  }
}

function selectAnswer(index) {
  hapticFeedback("light");
  document
    .querySelectorAll(".quiz-option")
    .forEach((opt) => opt.classList.remove("card-selected"));
  document
    .querySelectorAll(".quiz-option")
    [index].classList.add("card-selected");
  AppState.selectedAnswer = index;
}

function submitAnswer() {
  if (AppState.selectedAnswer === undefined) {
    hapticFeedback("error");
    return;
  }
  const quiz = AppState.currentQuiz;
  const question = quiz.questions[AppState.currentQuestion];
  // Используем сохраненный индекс правильного ответа (после перемешивания)
  const isCorrect =
    AppState.selectedAnswer === AppState.currentQuestionCorrectIndex;
  const options = document.querySelectorAll(".quiz-option");
  options[AppState.selectedAnswer].classList.remove("card-selected");
  if (isCorrect) {
    options[AppState.selectedAnswer].classList.add("card-correct");
    hapticFeedback("success");
  } else {
    options[AppState.selectedAnswer].classList.add("card-incorrect");
    options[AppState.currentQuestionCorrectIndex].classList.add("card-correct");
    hapticFeedback("error");
  }
  AppState.quizAnswers.push({
    questionIndex: AppState.currentQuestion,
    selectedAnswer: AppState.selectedAnswer,
    correct: isCorrect,
  });
  if (tg?.MainButton) tg.MainButton.hide();
  setTimeout(() => {
    AppState.currentQuestion++;
    AppState.selectedAnswer = undefined;
    if (AppState.currentQuestion < quiz.questions.length) {
      navigate("quiz-question");
    } else {
      finishQuiz();
    }
  }, 1500);
}

function showHint() {
  hapticFeedback("light");
  document.getElementById("hintBox").classList.toggle("hidden");
}

function skipQuestion() {
  hapticFeedback("light");
  AppState.quizAnswers.push({
    questionIndex: AppState.currentQuestion,
    selectedAnswer: null,
    correct: false,
  });
  AppState.currentQuestion++;
  AppState.selectedAnswer = undefined;
  if (AppState.currentQuestion < AppState.currentQuiz.questions.length) {
    navigate("quiz-question");
  } else {
    finishQuiz();
  }
}

function finishQuiz() {
  const quiz = AppState.currentQuiz;
  const correctCount = AppState.quizAnswers.filter((a) => a.correct).length;
  const totalQuestions = quiz.questions.length;
  const percentage = Math.round((correctCount / totalQuestions) * 100);

  if (!AppState.userData.completedQuizzes.includes(quiz.id)) {
    AppState.userData.completedQuizzes.push(quiz.id);
    AppState.userData.progress.quizzes++;
  }

  // Отслеживание идеальных квизов (100%)
  if (percentage === 100) {
    if (!AppState.userData.perfectQuizzes) {
      AppState.userData.perfectQuizzes = 0;
    }
    AppState.userData.perfectQuizzes++;
  }

  updateStreak();
  checkBadges();
  saveUserData();
  navigate("quiz-result");
}

function checkBadges() {
  const badges = [
    // Квизы
    {
      id: "first_quiz",
      condition: () => AppState.userData.completedQuizzes.length >= 1,
    },
    {
      id: "quiz_3",
      condition: () => AppState.userData.completedQuizzes.length >= 3,
    },
    {
      id: "quiz_5",
      condition: () => AppState.userData.completedQuizzes.length >= 5,
    },
    {
      id: "quiz_10",
      condition: () => AppState.userData.completedQuizzes.length >= 10,
    },
    {
      id: "quiz_20",
      condition: () => AppState.userData.completedQuizzes.length >= 20,
    },
    {
      id: "quiz_50",
      condition: () => AppState.userData.completedQuizzes.length >= 50,
    },
    {
      id: "perfect_quiz",
      condition: () => (AppState.userData.perfectQuizzes || 0) >= 1,
    },
    {
      id: "perfect_3",
      condition: () => (AppState.userData.perfectQuizzes || 0) >= 3,
    },
    {
      id: "perfect_10",
      condition: () => (AppState.userData.perfectQuizzes || 0) >= 10,
    },

    // Серии
    { id: "streak_3", condition: () => AppState.userData.streak >= 3 },
    { id: "streak_7", condition: () => AppState.userData.streak >= 7 },
    { id: "streak_14", condition: () => AppState.userData.streak >= 14 },
    { id: "streak_30", condition: () => AppState.userData.streak >= 30 },
    { id: "streak_60", condition: () => AppState.userData.streak >= 60 },
    { id: "streak_100", condition: () => AppState.userData.streak >= 100 },
    { id: "streak_365", condition: () => AppState.userData.streak >= 365 },

    // Глоссарий
    {
      id: "glossary_10",
      condition: () => AppState.userData.progress.glossaryViewed >= 10,
    },
    {
      id: "glossary_25",
      condition: () => AppState.userData.progress.glossaryViewed >= 25,
    },
    {
      id: "glossary_50",
      condition: () => AppState.userData.progress.glossaryViewed >= 50,
    },
    {
      id: "glossary_master",
      condition: () => {
        const total = window.APP_DATA?.glossary?.length || 100;
        return AppState.userData.progress.glossaryViewed >= total;
      },
    },

    // Активность
    { id: "first_visit", condition: () => true }, // Всегда разблокирован при первом запуске
    {
      id: "explorer",
      condition: () => (AppState.userData.visitedSections || []).length >= 12,
    },

    // Специальные достижения
    {
      id: "completionist",
      condition: () => AppState.userData.unlockedBadges.length >= 40,
    },
  ];

  badges.forEach((badge) => {
    if (
      badge.condition() &&
      !AppState.userData.unlockedBadges.includes(badge.id)
    ) {
      AppState.userData.unlockedBadges.push(badge.id);
      // Показать уведомление о новом достижении
      showBadgeNotification(badge.id);
    }
  });
}

function showBadgeNotification(badgeId) {
  // Простое уведомление (можно расширить)
  hapticFeedback("success");
  console.log(`🎉 Новое достижение разблокировано: ${badgeId}`);
}

function renderQuizResult(container) {
  const quiz = AppState.currentQuiz;
  const correctCount = AppState.quizAnswers.filter((a) => a.correct).length;
  const totalQuestions = quiz.questions.length;
  const percentage = Math.round((correctCount / totalQuestions) * 100);
  let badge = "🥉",
    badgeText = "Бронзовый уровень",
    badgeColor = "var(--color-premium)";
  if (percentage >= 90) {
    badge = "🥇";
    badgeText = "Золотой уровень";
    badgeColor = "var(--color-gold)";
  } else if (percentage >= 70) {
    badge = "🥈";
    badgeText = "Серебряный уровень";
  }
  container.innerHTML = `<div class="result-card"><h1>Квиз завершён!</h1><div class="result-badge"><div class="badge" style="background-color: ${badgeColor}; animation: unlockBadge var(--transition-slow);">${badge}</div></div><p class="result-score">${correctCount} / ${totalQuestions}</p><p><strong>${percentage}%</strong> правильных ответов</p><p class="caption">${badgeText}</p>${
    percentage < 70
      ? `<div style="margin-top: var(--space-lg); padding: var(--space-md); background: var(--color-primary-light); border-radius: var(--radius-md);"><p><strong>Рекомендации:</strong></p><ul style="text-align: left; margin-top: var(--space-sm);"><li>Изучите раздел "Инфографика и видео"</li><li>Просмотрите глоссарий ключевых терминов</li><li>Попробуйте пройти квиз ещё раз</li></ul></div>`
      : ""
  }<div class="result-actions"><button class="btn btn-primary" data-action="downloadResult">📥 Скачать результат</button><button class="btn btn-secondary" data-action="shareResult">📤 Поделиться</button><button class="btn btn-ghost" data-action="startQuiz" data-quiz-id="${
    quiz.id
  }"> 🔁 Пройти ещё раз</button><button class="btn btn-ghost" data-action="navigate" data-route="quizzes">Все квизы</button></div></div>`;
}

function downloadResult() {
  hapticFeedback("success");
  const quiz = AppState.currentQuiz;
  const correctCount = AppState.quizAnswers.filter((a) => a.correct).length;
  const totalQuestions = quiz.questions.length;
  const resultHTML = `<html><head><meta charset="UTF-8"><style>body{font-family:Inter,sans-serif;padding:40px;background:linear-gradient(135deg,#C6D9FD 0%,white 100%)}.card{background:white;padding:40px;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,0.1);text-align:center;max-width:400px;margin:0 auto}h1{color:#1326FD;font-size:32px}.score{font-size:48px;color:#1326FD;margin:20px 0}</style></head><body><div class="card"><h1>MC Recovery Fund</h1><p><strong>${
    quiz.title
  }</strong></p><div class="score">${correctCount}/${totalQuestions}</div><p>Результат: ${Math.round(
    (correctCount / totalQuestions) * 100
  )}%</p></div></body></html>`;
  const blob = new Blob([resultHTML], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `mc-recovery-${quiz.id}-result.html`;
  a.click();
}

function shareResult() {
  hapticFeedback("light");
  if (navigator.share && AppState.currentQuiz) {
    const quiz = AppState.currentQuiz;
    const correctCount = AppState.quizAnswers.filter((a) => a.correct).length;
    const totalQuestions = quiz.questions.length;
    const percentage = Math.round((correctCount / totalQuestions) * 100);
    navigator
      .share({
        title: `MC Recovery Fund - ${quiz.title}`,
        text: `Я прошёл квиз "${quiz.title}" и набрал ${percentage}%! Попробуй и ты!`,
      })
      .catch(() => {});
  } else {
    alert("Функция share недоступна в этом браузере");
  }
}

async function renderEdu(container) {
  // Show loading state immediately
  container.innerHTML = `<div class="card"><p>Загрузка данных...</p></div>`;
  
  // Ensure data is loaded
  const loaded = await ensureDataLoaded('edu');
  if (!loaded) {
    container.innerHTML = `<div class="card"><p>❌ Ошибка загрузки данных</p></div>`;
    return;
  }
  
  const topics = window.APP_DATA.edu;
  container.innerHTML = `<h1>Инфографика и видео</h1><p class="caption mb-lg">Интерактивные материалы о финансовых инструментах</p><div class="card-grid">${topics
    .map(
      (topic) =>
        `<div class="collapsible"><div class="collapsible-header" data-action="toggleCollapsible"><span><strong>${
          topic.title
        }</strong></span><svg class="collapsible-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></div><div class="collapsible-content"><div class="collapsible-body"><p>${
          topic.description
        }</p>${topic.sections
          .map(
            (section) =>
              `<div style="margin: var(--space-lg) 0; padding: var(--space-md); background: rgba(0,0,0,0.02); border-radius: var(--radius-md);"><h4>${
                section.title
              }</h4><p class="caption">${section.content}</p>${
                section.stat
                  ? `<p style="color: var(--color-success); font-weight: 600;">${section.stat}</p>`
                  : ""
              }</div>`
          )
          .join("")}${
          topic.videoUrl
            ? `<button class="btn btn-primary" data-action="openVideo" data-url="${topic.videoUrl}">▶️ Смотреть видео</button>`
            : ""
        }</div></div></div>`
    )
    .join("")}</div>`;
}

function toggleCollapsible(header) {
  hapticFeedback("light");
  const content = header.nextElementSibling;
  const icon = header.querySelector(".collapsible-icon");
  content.classList.toggle("open");
  icon.classList.toggle("open");
}

function openVideo(url) {
  hapticFeedback("light");
  if (tg) {
    tg.openLink(url);
  } else {
    window.open(url, "_blank");
  }
}

function renderProgress(container) {
  const userData = AppState.userData;
  const quizzesTotal = window.APP_DATA.quizzes.length;
  const glossaryTotal = window.APP_DATA.glossary.length;
  const quizzesPercent = Math.round(
    (userData.completedQuizzes.length / quizzesTotal) * 100
  );
  const glossaryPercent = Math.round(
    (userData.progress.glossaryViewed / glossaryTotal) * 100
  );
  container.innerHTML = `<h1>Мой прогресс</h1>${
    userData.streak > 0
      ? `<div class="card mb-lg" style="text-align: center;"><div class="streak" style="font-size: 20px; padding: var(--space-lg);"><span class="streak-icon" style="font-size: 40px;">🔥</span><div><p style="margin: 0;"><strong>${
          userData.streak
        } ${getDaysWord(
          userData.streak
        )}</strong></p><p class="caption" style="margin: 0;">Продолжайте в том же духе!</p></div></div></div>`
      : ""
  }<div class="card mb-lg"><h3>Квизы</h3><div class="progress-bar"><div class="progress-fill" style="width: ${quizzesPercent}%"></div></div><p class="caption">${
    userData.completedQuizzes.length
  } из ${quizzesTotal} завершено (${quizzesPercent}%)</p></div><div class="card mb-lg"><h3>Глоссарий</h3><div class="progress-bar"><div class="progress-fill" style="width: ${glossaryPercent}%"></div></div><p class="caption">${
    userData.progress.glossaryViewed
  } из ${glossaryTotal} изучено (${glossaryPercent}%)</p></div><div class="card"><h3>Достижения</h3><p class="caption">${
    userData.unlockedBadges.length
  } бейджей разблокировано</p><button class="btn btn-secondary" data-action="navigate" data-route="achievements" style="width: 100%; margin-top: var(--space-md);">Смотреть все достижения</button></div>`;
}

function renderAchievements(container) {
  const allBadges = [
    // 🎯 Квизы (12 достижений)
    {
      id: "first_quiz",
      icon: "🎓",
      name: "Первый шаг",
      desc: "Завершён первый квиз",
      condition: "Пройдите 1 квиз",
      category: "quiz",
    },
    {
      id: "quiz_3",
      icon: "📝",
      name: "Новичок",
      desc: "Завершено 3 квиза",
      condition: "Пройдите 3 квиза",
      category: "quiz",
    },
    {
      id: "quiz_5",
      icon: "🏅",
      name: "Знаток",
      desc: "Завершено 5 квизов",
      condition: "Пройдите 5 квизов",
      category: "quiz",
    },
    {
      id: "quiz_10",
      icon: "🎖️",
      name: "Эксперт",
      desc: "Завершено 10 квизов",
      condition: "Пройдите 10 квизов",
      category: "quiz",
    },
    {
      id: "quiz_20",
      icon: "🏆",
      name: "Мастер",
      desc: "Завершено 20 квизов",
      condition: "Пройдите 20 квизов",
      category: "quiz",
    },
    {
      id: "quiz_50",
      icon: "👑",
      name: "Легенда",
      desc: "Завершено 50 квизов",
      condition: "Пройдите 50 квизов",
      category: "quiz",
    },
    {
      id: "perfect_quiz",
      icon: "💎",
      name: "Перфекционист",
      desc: "100% в квизе",
      condition: "Получите 100% в квизе",
      category: "quiz",
    },
    {
      id: "perfect_3",
      icon: "💠",
      name: "Безупречный",
      desc: "3 идеальных квиза",
      condition: "Получите 100% в 3 квизах",
      category: "quiz",
    },
    {
      id: "perfect_10",
      icon: "✨",
      name: "Непобедимый",
      desc: "10 идеальных квизов",
      condition: "Получите 100% в 10 квизах",
      category: "quiz",
    },
    {
      id: "speed_demon",
      icon: "⚡",
      name: "Скоростной",
      desc: "Квиз за 2 минуты",
      condition: "Пройдите квиз менее чем за 2 минуты",
      category: "quiz",
    },
    {
      id: "no_hints",
      icon: "🧠",
      name: "Самостоятельный",
      desc: "Квиз без подсказок",
      condition: "Пройдите квиз не используя подсказки",
      category: "quiz",
    },
    {
      id: "comeback",
      icon: "🔄",
      name: "Возвращение",
      desc: "Повторное прохождение",
      condition: "Повторно пройдите квиз с лучшим результатом",
      category: "quiz",
    },

    // 🔥 Серии (10 достижений)
    {
      id: "streak_3",
      icon: "🔥",
      name: "Три дня",
      desc: "Серия 3 дня",
      condition: "Заходите 3 дня подряд",
      category: "streak",
    },
    {
      id: "streak_7",
      icon: "🌟",
      name: "Неделя",
      desc: "Серия 7 дней",
      condition: "Заходите 7 дней подряд",
      category: "streak",
    },
    {
      id: "streak_14",
      icon: "💫",
      name: "Две недели",
      desc: "Серия 14 дней",
      condition: "Заходите 14 дней подряд",
      category: "streak",
    },
    {
      id: "streak_30",
      icon: "⭐",
      name: "Месяц",
      desc: "Серия 30 дней",
      condition: "Заходите 30 дней подряд",
      category: "streak",
    },
    {
      id: "streak_60",
      icon: "🌠",
      name: "Два месяца",
      desc: "Серия 60 дней",
      condition: "Заходите 60 дней подряд",
      category: "streak",
    },
    {
      id: "streak_100",
      icon: "🎆",
      name: "Сотня",
      desc: "Серия 100 дней",
      condition: "Заходите 100 дней подряд",
      category: "streak",
    },
    {
      id: "streak_365",
      icon: "🎇",
      name: "Год вместе",
      desc: "Серия 365 дней",
      condition: "Заходите год подряд",
      category: "streak",
    },
    {
      id: "early_bird",
      icon: "🌅",
      name: "Ранняя птица",
      desc: "Вход до 6 утра",
      condition: "Зайдите до 6:00 утра",
      category: "streak",
    },
    {
      id: "night_owl",
      icon: "🦉",
      name: "Ночная сова",
      desc: "Вход после полуночи",
      condition: "Зайдите после 00:00",
      category: "streak",
    },
    {
      id: "weekend_warrior",
      icon: "🎮",
      name: "Выходной воин",
      desc: "Активность в выходные",
      condition: "Будьте активны в субботу и воскресенье",
      category: "streak",
    },

    // 📚 Глоссарий (8 достижений)
    {
      id: "glossary_10",
      icon: "📖",
      name: "Читатель",
      desc: "Изучено 10 терминов",
      condition: "Просмотрите 10 терминов",
      category: "glossary",
    },
    {
      id: "glossary_25",
      icon: "📕",
      name: "Студент",
      desc: "Изучено 25 терминов",
      condition: "Просмотрите 25 терминов",
      category: "glossary",
    },
    {
      id: "glossary_50",
      icon: "📗",
      name: "Грамотный",
      desc: "Изучено 50 терминов",
      condition: "Просмотрите 50 терминов",
      category: "glossary",
    },
    {
      id: "glossary_master",
      icon: "📚",
      name: "Эрудит",
      desc: "Все термины изучены",
      condition: "Просмотрите весь глоссарий",
      category: "glossary",
    },
    {
      id: "search_master",
      icon: "🔍",
      name: "Искатель",
      desc: "Использование поиска",
      condition: "Воспользуйтесь поиском в глоссарии 10 раз",
      category: "glossary",
    },
    {
      id: "video_watcher",
      icon: "🎬",
      name: "Зритель",
      desc: "Просмотр видео",
      condition: "Посмотрите 5 видео из глоссария",
      category: "glossary",
    },
    {
      id: "definition_expert",
      icon: "📝",
      name: "Знаток определений",
      desc: "Детальное изучение",
      condition: "Откройте полные определения 20 терминов",
      category: "glossary",
    },
    {
      id: "quick_learner",
      icon: "💡",
      name: "Быстрое обучение",
      desc: "Изучение за день",
      condition: "Изучите 10 терминов за один день",
      category: "glossary",
    },

    // 🎓 Образование (7 достижений)
    {
      id: "edu_visitor",
      icon: "👀",
      name: "Любопытный",
      desc: "Посещение раздела",
      condition: "Посетите раздел Инфографика",
      category: "education",
    },
    {
      id: "edu_explorer",
      icon: "🗺️",
      name: "Исследователь",
      desc: "Изучение материалов",
      condition: "Откройте 5 разных тем",
      category: "education",
    },
    {
      id: "video_fan",
      icon: "📹",
      name: "Видеолюбитель",
      desc: "Просмотр видео",
      condition: "Посмотрите 10 видео",
      category: "education",
    },
    {
      id: "all_topics",
      icon: "🎯",
      name: "Всезнающий",
      desc: "Все темы изучены",
      condition: "Откройте все темы в инфографике",
      category: "education",
    },
    {
      id: "collapsible_master",
      icon: "📂",
      name: "Организатор",
      desc: "Использование аккордеонов",
      condition: "Раскройте 20 аккордеонов",
      category: "education",
    },
    {
      id: "statistics_buff",
      icon: "📊",
      name: "Статистик",
      desc: "Изучение данных",
      condition: "Изучите все статистические данные",
      category: "education",
    },
    {
      id: "diversification_pro",
      icon: "🎲",
      name: "Профи диверсификации",
      desc: "Изучение стратегий",
      condition: "Изучите тему диверсификации",
      category: "education",
    },

    // 📢 Активность (8 достижений)
    {
      id: "first_visit",
      icon: "👋",
      name: "Добро пожаловать",
      desc: "Первый визит",
      condition: "Впервые откройте приложение",
      category: "activity",
    },
    {
      id: "home_returner",
      icon: "🏠",
      name: "Домосед",
      desc: "Возврат на главную",
      condition: "Вернитесь на главную страницу 10 раз",
      category: "activity",
    },
    {
      id: "explorer",
      icon: "🧭",
      name: "Путешественник",
      desc: "Посещение разделов",
      condition: "Посетите все разделы приложения",
      category: "activity",
    },
    {
      id: "navigator",
      icon: "🗺️",
      name: "Навигатор",
      desc: "Частое перемещение",
      condition: "Совершите 50 переходов между разделами",
      category: "activity",
    },
    {
      id: "theme_switcher",
      icon: "🌓",
      name: "Переключатель",
      desc: "Смена темы",
      condition: "Переключите тему 5 раз",
      category: "activity",
    },
    {
      id: "dark_mode_fan",
      icon: "🌙",
      name: "Любитель темноты",
      desc: "Использование темной темы",
      condition: "Используйте темную тему 7 дней подряд",
      category: "activity",
    },
    {
      id: "light_mode_fan",
      icon: "☀️",
      name: "Любитель света",
      desc: "Использование светлой темы",
      condition: "Используйте светлую тему 7 дней подряд",
      category: "activity",
    },
    {
      id: "settings_explorer",
      icon: "⚙️",
      name: "Настройщик",
      desc: "Изучение настроек",
      condition: "Посетите раздел настроек",
      category: "activity",
    },

    // 📄 Документы и инструкции (6 достижений)
    {
      id: "doc_reader",
      icon: "📄",
      name: "Документовед",
      desc: "Чтение документов",
      condition: "Откройте первый документ",
      category: "documents",
    },
    {
      id: "all_docs",
      icon: "📋",
      name: "Юрист",
      desc: "Все документы",
      condition: "Откройте все официальные документы",
      category: "documents",
    },
    {
      id: "instruction_follower",
      icon: "📖",
      name: "Исполнитель",
      desc: "Чтение инструкций",
      condition: "Откройте 5 инструкций",
      category: "documents",
    },
    {
      id: "vault_explorer",
      icon: "🏦",
      name: "Хранитель",
      desc: "Изучение Vault",
      condition: "Откройте инструкции по Vault",
      category: "documents",
    },
    {
      id: "safepal_user",
      icon: "💳",
      name: "Владелец кошелька",
      desc: "Настройка SafePal",
      condition: "Изучите инструкции SafePal",
      category: "documents",
    },
    {
      id: "faq_master",
      icon: "❓",
      name: "Знаток FAQ",
      desc: "Изучение FAQ",
      condition: "Откройте раздел FAQ",
      category: "documents",
    },

    // 🎪 Эфиры и анонсы (5 достижений)
    {
      id: "broadcast_viewer",
      icon: "📡",
      name: "Зритель эфиров",
      desc: "Просмотр эфира",
      condition: "Откройте запись эфира",
      category: "broadcasts",
    },
    {
      id: "live_participant",
      icon: "🔴",
      name: "Участник LIVE",
      desc: "Участие в прямом эфире",
      condition: "Посетите раздел эфиров до начала трансляции",
      category: "broadcasts",
    },
    {
      id: "announcement_reader",
      icon: "📢",
      name: "В курсе событий",
      desc: "Чтение анонсов",
      condition: "Откройте раздел анонсов",
      category: "broadcasts",
    },
    {
      id: "question_asker",
      icon: "✍️",
      name: "Любознательный",
      desc: "Вопрос к эфиру",
      condition: "Задайте вопрос к предстоящему эфиру",
      category: "broadcasts",
    },
    {
      id: "regular_viewer",
      icon: "🎥",
      name: "Постоянный зритель",
      desc: "Просмотр эфиров",
      condition: "Посмотрите 5 записей эфиров",
      category: "broadcasts",
    },

    // 💬 Поддержка и взаимодействие (4 достижения)
    {
      id: "support_contact",
      icon: "💬",
      name: "Общительный",
      desc: "Обращение в поддержку",
      condition: "Откройте раздел поддержки",
      category: "support",
    },
    {
      id: "feedback_giver",
      icon: "📬",
      name: "Советчик",
      desc: "Обратная связь",
      condition: "Оставьте обратную связь",
      category: "support",
    },
    {
      id: "dashboard_user",
      icon: "📊",
      name: "Аналитик",
      desc: "Использование дашборда",
      condition: "Откройте дашборд инвестора",
      category: "support",
    },
    {
      id: "share_master",
      icon: "📤",
      name: "Распространитель",
      desc: "Поделиться результатами",
      condition: "Поделитесь результатом квиза",
      category: "support",
    },

    // 🏅 Специальные (10 достижений)
    {
      id: "first_login_morning",
      icon: "🌄",
      name: "Рассвет",
      desc: "Первый вход утром",
      condition: "Первый вход в период 6:00-9:00",
      category: "special",
    },
    {
      id: "weekend_enthusiast",
      icon: "🎉",
      name: "Выходной энтузиаст",
      desc: "Активность в выходные",
      condition: "Будьте активны 4 выходных подряд",
      category: "special",
    },
    {
      id: "new_year",
      icon: "🎊",
      name: "С Новым Годом!",
      desc: "Новогодний визит",
      condition: "Зайдите 1 января",
      category: "special",
    },
    {
      id: "christmas",
      icon: "🎄",
      name: "Рождественский дух",
      desc: "Рождественский визит",
      condition: "Зайдите 25 декабря или 7 января",
      category: "special",
    },
    {
      id: "valentine",
      icon: "💝",
      name: "День влюбленных",
      desc: "Романтичный визит",
      condition: "Зайдите 14 февраля",
      category: "special",
    },
    {
      id: "beta_tester",
      icon: "🧪",
      name: "Бета-тестер",
      desc: "Ранний пользователь",
      condition: "Используйте приложение в первый месяц",
      category: "special",
    },
    {
      id: "bug_reporter",
      icon: "🐛",
      name: "Охотник за багами",
      desc: "Сообщение об ошибке",
      condition: "Сообщите об ошибке",
      category: "special",
    },
    {
      id: "lucky_number",
      icon: "🍀",
      name: "Счастливчик",
      desc: "Счастливое число",
      condition: "Наберите ровно 77% в квизе",
      category: "special",
    },
    {
      id: "midnight_scholar",
      icon: "🌃",
      name: "Полуночник",
      desc: "Обучение ночью",
      condition: "Пройдите квиз между 00:00 и 03:00",
      category: "special",
    },
    {
      id: "completionist",
      icon: "💯",
      name: "Завершитель",
      desc: "Всё выполнено",
      condition: "Разблокируйте 40 достижений",
      category: "special",
    },
  ];
  // Группировка по категориям
  const categories = {
    quiz: { title: "🎯 Квизы", badges: [] },
    streak: { title: "🔥 Серии", badges: [] },
    glossary: { title: "📚 Глоссарий", badges: [] },
    education: { title: "🎓 Образование", badges: [] },
    activity: { title: "📢 Активность", badges: [] },
    documents: { title: "📄 Документы", badges: [] },
    broadcasts: { title: "🎪 Эфиры", badges: [] },
    support: { title: "💬 Поддержка", badges: [] },
    special: { title: "🏅 Специальные", badges: [] },
  };

  allBadges.forEach((badge) => {
    if (categories[badge.category]) {
      categories[badge.category].badges.push(badge);
    }
  });

  const unlockedCount = allBadges.filter((b) =>
    AppState.userData.unlockedBadges.includes(b.id)
  ).length;
  const totalCount = allBadges.length;
  const progressPercent = Math.round((unlockedCount / totalCount) * 100);

  container.innerHTML = `
    <h1>Достижения</h1>
    <p class="caption mb-lg">Разблокируйте бейджи, проходя квизы и изучая материалы</p>
    
    <div class="card mb-lg" style="text-align: center;">
      <h3>Прогресс достижений</h3>
      <div class="progress-bar" style="margin: var(--space-md) 0;">
        <div class="progress-fill" style="width: ${progressPercent}%"></div>
      </div>
      <p class="caption"><strong>${unlockedCount}</strong> из <strong>${totalCount}</strong> разблокировано (${progressPercent}%)</p>
    </div>

    ${Object.entries(categories)
      .map(
        ([key, cat]) => `
      <h2 style="margin: var(--space-xl) 0 var(--space-md) 0;">${cat.title}</h2>
      <div class="badge-grid">${cat.badges
        .map((badge) => {
          const isUnlocked = AppState.userData.unlockedBadges.includes(
            badge.id
          );
          return `<div class="badge-item"><div class="badge ${
            isUnlocked ? "" : "badge-locked"
          }">${badge.icon}</div><div class="badge-name">${
            badge.name
          }</div><div class="badge-desc">${
            isUnlocked ? badge.desc : badge.condition
          }</div></div>`;
        })
        .join("")}</div>
    `
      )
      .join("")}
  `;
}

// Glossary State
const GlossaryState = {
  allTerms: [],
  filteredTerms: [],
  currentCategory: 'all',
  searchQuery: '',
  viewportHeight: 0,
  itemHeight: 200, // Approximate card height
  visibleStart: 0,
  visibleEnd: 30,
  scrollTop: 0
};

// Category detection helper
function detectCategory(term) {
  const text = (term.term + ' ' + term.definition).toLowerCase();
  
  if (text.includes('nft') || text.includes('токен') && text.includes('невзаимозаменяемый')) return 'nft';
  if (text.includes('defi') || text.includes('децентрализованн') || text.includes('ликвидност') || text.includes('amm')) return 'defi';
  if (text.includes('блокчейн') || text.includes('майнинг') || text.includes('консенсус') || text.includes('узел')) return 'blockchain';
  if (text.includes('торг') || text.includes('биржа') || text.includes('ордер') || text.includes('арбитраж')) return 'trading';
  if (text.includes('безопасност') || text.includes('защит') || text.includes('взлом') || text.includes('приватн')) return 'security';
  
  return 'general';
}

// Get category icon and label
function getCategoryInfo(category) {
  const categories = {
    all: { icon: '📚', label: 'Все' },
    defi: { icon: '💎', label: 'DeFi' },
    nft: { icon: '🎨', label: 'NFT' },
    blockchain: { icon: '⛓️', label: 'Блокчейн' },
    trading: { icon: '📈', label: 'Трейдинг' },
    security: { icon: '🔒', label: 'Безопасность' },
    general: { icon: '📖', label: 'Общее' }
  };
  return categories[category] || categories.general;
}

async function renderGlossary(container) {
  // Show loading state immediately
  container.innerHTML = `<div class="card"><p>Загрузка данных...</p></div>`;
  
  // Ensure data is loaded
  const loaded = await ensureDataLoaded('glossary');
  if (!loaded) {
    container.innerHTML = `<div class="card"><p>❌ Ошибка загрузки данных</p></div>`;
    return;
  }
  
  const terms = window.APP_DATA.glossary || [];
  
  // Add categories to terms
  GlossaryState.allTerms = terms.map(term => ({
    ...term,
    category: term.category || detectCategory(term),
    firstLetter: (term.term || '').charAt(0).toUpperCase()
  }));
  
  GlossaryState.filteredTerms = [...GlossaryState.allTerms];
  
  const viewed = AppState.userData.progress.glossaryViewed || 0;
  const percentage = Math.round((viewed / terms.length) * 100);
  
  // Get unique categories
  const categories = ['all', ...new Set(GlossaryState.allTerms.map(t => t.category))];
  
  container.innerHTML = `
    <h1>📚 Глоссарий</h1>
    
    <!-- Progress Header -->
    <div class="glossary-header">
      <div class="glossary-progress-info">
        <div class="glossary-progress-label">Изучено терминов</div>
        <div class="glossary-progress-stats">
          <span>${viewed}</span>
          <span class="glossary-progress-total">/ ${terms.length}</span>
        </div>
      </div>
      <div class="glossary-progress-bar-container">
        <div class="glossary-progress-percentage">${percentage}%</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${percentage}%"></div>
        </div>
      </div>
    </div>
    
    <!-- Search Box -->
    <div class="search-box">
      <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/>
        <path d="M21 21l-4.35-4.35"/>
      </svg>
      <input 
        type="text" 
        class="search-input" 
        id="glossarySearch"
        placeholder="Поиск по терминам..." 
        autocomplete="off"
      />
    </div>
    
    <!-- Category Filters -->
    <div class="glossary-filters" id="glossaryFilters">
      ${categories.map(cat => {
        const info = getCategoryInfo(cat);
        return `<button class="glossary-filter-btn ${cat === 'all' ? 'active' : ''}" data-category="${cat}">
          <span>${info.icon}</span>
          <span>${info.label}</span>
        </button>`;
      }).join('')}
    </div>
    
    <!-- Main Container -->
    <div class="glossary-container">
      <!-- Alphabet Navigator -->
      <div class="alphabet-nav" id="alphabetNav"></div>
      
      <!-- Virtual Scroll Container -->
      <div class="glossary-scroll-container" id="glossaryScroll">
        <div class="glossary-scroll-content" id="glossaryContent">
          <div class="glossary-viewport" id="glossaryViewport"></div>
        </div>
      </div>
    </div>
    
    <!-- Scroll to Top Button -->
    <button class="glossary-scroll-top" id="scrollTopBtn" aria-label="Наверх">
      ↑
    </button>
  `;
  
  // Initialize
  initGlossary();
}

// Normalize text for better search (especially for Russian)
function normalizeSearchText(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/ё/g, "е")
    .replace(/[^а-яa-z0-9\s]/gi, " ") // Replace special chars with space
    .replace(/\s+/g, " "); // Normalize multiple spaces
}

// Calculate search relevance score
function calculateRelevance(term, query) {
  const normalizedQuery = normalizeSearchText(query);
  const normalizedTerm = normalizeSearchText(term.term || "");
  const normalizedDef = normalizeSearchText(term.definition || "");

  let score = 0;

  // Split query into words for multi-word search
  const queryWords = normalizedQuery.split(" ").filter((w) => w.length > 0);

  queryWords.forEach((word) => {
    // Exact match in term title - highest priority
    if (normalizedTerm === word) score += 1000;

    // Term starts with query word - high priority
    if (normalizedTerm.startsWith(word)) score += 500;

    // Term contains query word - medium priority
    if (normalizedTerm.includes(word)) score += 100;

    // Definition contains query word - lower priority
    if (normalizedDef.includes(word)) score += 10;
  });

  // Bonus for matching all query words
  const allWordsInTerm = queryWords.every((w) => normalizedTerm.includes(w));
  const allWordsInDef = queryWords.every((w) => normalizedDef.includes(w));
  if (allWordsInTerm) score += 200;
  else if (allWordsInDef) score += 20;

  return score;
}

function initGlossary() {
  // Setup event listeners
  const searchInput = document.getElementById('glossarySearch');
  const filterButtons = document.querySelectorAll('.glossary-filter-btn');
  const scrollContainer = document.getElementById('glossaryScroll');
  const scrollTopBtn = document.getElementById('scrollTopBtn');
  
  if (searchInput) {
    searchInput.addEventListener('input', debounce((e) => {
      GlossaryState.searchQuery = e.target.value;
      filterGlossary();
    }, 300));
  }
  
  if (filterButtons) {
    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        GlossaryState.currentCategory = btn.dataset.category;
        filterGlossary();
      });
    });
  }
  
  if (scrollContainer) {
    scrollContainer.addEventListener('scroll', debounce(() => {
      updateVirtualScroll();
      
      // Show/hide scroll to top button
      if (scrollTopBtn) {
        if (scrollContainer.scrollTop > 500) {
          scrollTopBtn.classList.add('visible');
        } else {
          scrollTopBtn.classList.remove('visible');
        }
      }
    }, 50));
  }
  
  if (scrollTopBtn) {
    scrollTopBtn.addEventListener('click', () => {
      scrollContainer?.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
  
  // Render alphabet nav
  renderAlphabetNav();
  
  // Initial render
  filterGlossary();
}

function filterGlossary() {
  let filtered = [...GlossaryState.allTerms];
  
  // Filter by category
  if (GlossaryState.currentCategory !== 'all') {
    filtered = filtered.filter(t => t.category === GlossaryState.currentCategory);
  }
  
  // Filter by search query
  if (GlossaryState.searchQuery.trim()) {
    const query = GlossaryState.searchQuery;
    filtered = filtered
      .map(term => ({ term, score: calculateRelevance(term, query) }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.term);
  }
  
  GlossaryState.filteredTerms = filtered;
  GlossaryState.visibleStart = 0;
  GlossaryState.visibleEnd = 30;
  
  // Update alphabet nav
  updateAlphabetNav();
  
  // Render virtual scroll
  renderVirtualScroll();
}

function renderVirtualScroll() {
  const viewport = document.getElementById('glossaryViewport');
  const content = document.getElementById('glossaryContent');
  
  if (!viewport || !content) return;
  
  const terms = GlossaryState.filteredTerms;
  
  if (terms.length === 0) {
    viewport.innerHTML = `
      <div class="glossary-empty">
        <div class="glossary-empty-icon">🔍</div>
        <p><strong>Ничего не найдено</strong></p>
        <p class="caption">Попробуйте изменить параметры поиска</p>
      </div>
    `;
    content.style.height = 'auto';
    return;
  }
  
  // Calculate total height for proper scrolling
  const totalHeight = Math.ceil(terms.length / 2) * GlossaryState.itemHeight;
  content.style.height = totalHeight + 'px';
  
  // Render visible items
  const visibleTerms = terms.slice(GlossaryState.visibleStart, GlossaryState.visibleEnd);
  
  viewport.innerHTML = `
    <div class="glossary-card-grid">
      ${visibleTerms.map(term => renderGlossaryCard(term)).join('')}
    </div>
  `;
  
  // Add click event listeners
  viewport.querySelectorAll('.glossary-card').forEach(card => {
    card.addEventListener('click', () => {
      const termId = card.dataset.termId;
      showTermDetail(termId);
    });
  });
}

function updateVirtualScroll() {
  const scrollContainer = document.getElementById('glossaryScroll');
  if (!scrollContainer) return;
  
  const scrollTop = scrollContainer.scrollTop;
  const viewportHeight = scrollContainer.clientHeight;
  
  // Calculate visible range with buffer
  const startIndex = Math.max(0, Math.floor(scrollTop / GlossaryState.itemHeight) * 2 - 10);
  const endIndex = Math.min(
    GlossaryState.filteredTerms.length,
    Math.ceil((scrollTop + viewportHeight) / GlossaryState.itemHeight) * 2 + 10
  );
  
  // Only re-render if range changed significantly
  if (Math.abs(startIndex - GlossaryState.visibleStart) > 5 || 
      Math.abs(endIndex - GlossaryState.visibleEnd) > 5) {
    GlossaryState.visibleStart = startIndex;
    GlossaryState.visibleEnd = endIndex;
    
    // Update viewport position
    const viewport = document.getElementById('glossaryViewport');
    if (viewport) {
      const offsetY = Math.floor(startIndex / 2) * GlossaryState.itemHeight;
      viewport.style.transform = `translateY(${offsetY}px)`;
    }
    
    renderVirtualScroll();
  }
}

function renderGlossaryCard(term) {
  const isViewed = AppState.userData.viewedTerms?.includes(term.id);
  const categoryInfo = getCategoryInfo(term.category);
  const definition = (term.definition || '').substring(0, 150);
  
  return `
    <div class="glossary-card" data-term-id="${term.id}" data-letter="${term.firstLetter}">
      <div class="glossary-card-header">
        <div class="glossary-card-icon">${categoryInfo.icon}</div>
        <h3 class="glossary-card-title">${term.term || 'Без названия'}</h3>
      </div>
      
      <div class="glossary-card-category category-${term.category}">
        ${categoryInfo.label}
      </div>
      
      <p class="glossary-card-definition">
        ${definition}${definition.length >= 150 ? '...' : ''}
      </p>
      
      <div class="glossary-card-footer">
        <div class="glossary-card-meta">
          <div class="${isViewed ? 'glossary-read-indicator' : 'glossary-unread-indicator'}" title="${isViewed ? 'Прочитано' : 'Не прочитано'}"></div>
          <span>${isViewed ? 'Изучено' : 'Новое'}</span>
        </div>
        <span class="caption">→</span>
      </div>
    </div>
  `;
}

// Debounced version of filterGlossary for better performance
const debouncedFilterGlossary = debounce(filterGlossary, 300);

function renderAlphabetNav() {
  const nav = document.getElementById('alphabetNav');
  if (!nav) return;
  
  const alphabet = 'АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЭЮЯ'.split('');
  const availableLetters = new Set(GlossaryState.allTerms.map(t => t.firstLetter));
  
  nav.innerHTML = alphabet.map(letter => {
    const hasTerms = availableLetters.has(letter);
    return `
      <div 
        class="alphabet-letter ${hasTerms ? '' : 'disabled'}" 
        data-letter="${letter}"
        ${hasTerms ? `onclick="scrollToLetter('${letter}')"` : ''}
      >
        ${letter}
      </div>
    `;
  }).join('');
}

function updateAlphabetNav() {
  const nav = document.getElementById('alphabetNav');
  if (!nav) return;
  
  const availableLetters = new Set(GlossaryState.filteredTerms.map(t => t.firstLetter));
  
  nav.querySelectorAll('.alphabet-letter').forEach(elem => {
    const letter = elem.dataset.letter;
    if (availableLetters.has(letter)) {
      elem.classList.remove('disabled');
      elem.onclick = () => scrollToLetter(letter);
    } else {
      elem.classList.add('disabled');
      elem.onclick = null;
    }
  });
}

function scrollToLetter(letter) {
  hapticFeedback('light');
  
  const index = GlossaryState.filteredTerms.findIndex(t => t.firstLetter === letter);
  if (index === -1) return;
  
  const scrollContainer = document.getElementById('glossaryScroll');
  if (!scrollContainer) return;
  
  const targetScroll = Math.floor(index / 2) * GlossaryState.itemHeight;
  scrollContainer.scrollTo({ top: targetScroll, behavior: 'smooth' });
  
  // Highlight the letter
  document.querySelectorAll('.alphabet-letter').forEach(el => el.classList.remove('active'));
  document.querySelector(`[data-letter="${letter}"]`)?.classList.add('active');
  
  setTimeout(() => {
    document.querySelector(`[data-letter="${letter}"]`)?.classList.remove('active');
  }, 1000);
}

function showTermDetail(termId) {
  hapticFeedback('light');
  
  const term = GlossaryState.allTerms.find(t => t.id === termId);
  if (!term) return;
  
  // Update progress
  if (!AppState.userData.progress.glossaryViewed) {
    AppState.userData.progress.glossaryViewed = 0;
  }
  if (!AppState.userData.viewedTerms) {
    AppState.userData.viewedTerms = [];
  }
  
  const isNewTerm = !AppState.userData.viewedTerms.includes(termId);
  if (isNewTerm) {
    AppState.userData.viewedTerms.push(termId);
    AppState.userData.progress.glossaryViewed++;
    saveUserData();
  }
  
  const categoryInfo = getCategoryInfo(term.category);
  
  // Create modal
  const modal = document.createElement('div');
  modal.className = 'glossary-modal';
  modal.innerHTML = `
    <div class="glossary-modal-content">
      <div class="glossary-modal-header">
        <div class="glossary-modal-icon">${categoryInfo.icon}</div>
        <div class="glossary-modal-title-wrapper">
          <h2 class="glossary-modal-title">${term.term}</h2>
          <div class="glossary-card-category category-${term.category}">
            ${categoryInfo.label}
          </div>
        </div>
        <button class="glossary-modal-close" aria-label="Закрыть">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
      
      <div class="glossary-modal-body">
        <div class="glossary-modal-definition">${term.definition || 'Определение отсутствует'}</div>
      </div>
      
      <div class="glossary-modal-footer">
        ${term.videoUrl ? `
          <button class="btn btn-primary" data-action="openVideo" data-url="${term.videoUrl}">
            ▶️ Смотреть видео
          </button>
        ` : ''}
        <button class="btn btn-secondary" onclick="this.closest('.glossary-modal').remove()">
          Закрыть
        </button>
      </div>
    </div>
  `;
  
  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
  
  // Close button
  modal.querySelector('.glossary-modal-close')?.addEventListener('click', () => {
    modal.remove();
  });
  
  // Close on Escape
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      modal.remove();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
  
  document.body.appendChild(modal);
  
  // Update the card in the list if visible
  if (isNewTerm) {
    setTimeout(() => {
      const card = document.querySelector(`[data-term-id="${termId}"]`);
      if (card) {
        const indicator = card.querySelector('.glossary-unread-indicator');
        if (indicator) {
          indicator.className = 'glossary-read-indicator';
          card.querySelector('.glossary-card-meta span').textContent = 'Изучено';
        }
      }
    }, 300);
  }
}

function renderSimulator(container) {
  container.innerHTML = `<h1>Симулятор портфеля</h1><p class="caption mb-lg">Создайте свой виртуальный инвестиционный портфель</p><div class="card"><p style="color: var(--color-premium); font-weight: 600;">🚀 Скоро!</p><p>Интерактивный симулятор портфеля находится в разработке. Скоро вы сможете создавать и тестировать различные стратегии распределения активов.</p><div style="margin-top: var(--space-lg);"><h4>Что будет доступно:</h4><ul style="margin-top: var(--space-sm);"><li>Настройка распределения активов</li><li>Симуляция доходности</li><li>Анализ рисков</li><li>Сравнение стратегий</li></ul></div></div>`;
}

function renderHelp(container) {
  container.innerHTML = `<h1>Помощь и безопасность</h1><div class="collapsible"><div class="collapsible-header" onclick="toggleCollapsible(this)"><span><strong>Как пользоваться приложением?</strong></span><svg class="collapsible-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></div><div class="collapsible-content"><div class="collapsible-body"><p>1. Выберите раздел на главной странице</p><p>2. Проходите квизы для проверки знаний</p><p>3. Изучайте инфографику и видео</p><p>4. Отслеживайте прогресс и собирайте достижения</p></div></div></div><div class="collapsible"><div class="collapsible-header" onclick="toggleCollapsible(this)"><span><strong>Принципы безопасности</strong></span><svg class="collapsible-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></div><div class="collapsible-content"><div class="collapsible-body"><p>Все данные хранятся локально на вашем устройстве. Мы не собираем личную информацию.</p><p style="margin-top: var(--space-md); font-weight: 600; color: var(--color-error);">Важно: Материалы носят образовательный характер и не являются инвестиционной рекомендацией.</p></div></div></div><div class="collapsible"><div class="collapsible-header" onclick="toggleCollapsible(this)"><span><strong>Контакты</strong></span><svg class="collapsible-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></div><div class="collapsible-content"><div class="collapsible-body"><p>По вопросам работы приложения обращайтесь в поддержку MC Recovery Fund</p></div></div></div>`;
}

function renderProfile(container) {
  const userData = AppState.userData;
  container.innerHTML = `<h1>Профиль</h1><div class="card mb-lg"><h3>Статистика</h3><p>Серия: <strong>${
    userData.streak
  } ${getDaysWord(userData.streak)}</strong></p><p>Завершено квизов: <strong>${
    userData.completedQuizzes.length
  }</strong></p><p>Бейджей: <strong>${
    userData.unlockedBadges.length
  }</strong></p></div><div class="card mb-lg"><h3>Настройки</h3><button class="btn btn-ghost" data-action="resetProgress" style="width: 100%; margin-top: var(--space-md); color: var(--color-error);">Сбросить прогресс</button></div>`;
}

function resetProgress() {
  if (confirm("Вы уверены? Весь прогресс будет удалён.")) {
    hapticFeedback("heavy");
    localStorage.removeItem("mc_recovery_user_data");
    AppState.userData = {
      streak: 0,
      lastActiveDate: null,
      completedQuizzes: [],
      unlockedBadges: [],
      progress: { quizzes: 0, eduTopics: 0, glossaryViewed: 0 },
      settings: { theme: "auto", language: "ru" },
    };
    navigate("home");
  }
}

// Theme Management
function toggleTheme() {
  const root = document.documentElement;
  const current = root.getAttribute("data-theme") || "light";
  const next = current === "light" ? "dark" : "light";

  root.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
  // Важно: убрать инлайновые переопределения, если они были
  root.style.removeProperty("--color-text");
  root.style.removeProperty("--color-bg");

  // Update icons
  const sunIcon = document.querySelector(".theme-icon-sun");
  const moonIcon = document.querySelector(".theme-icon-moon");

  if (next === "dark") {
    if (sunIcon) sunIcon.style.display = "none";
    if (moonIcon) moonIcon.style.display = "block";
  } else {
    if (sunIcon) sunIcon.style.display = "block";
    if (moonIcon) moonIcon.style.display = "none";
  }

  // Update Telegram theme if available
  if (tg && tg.themeParams) {
    if (next === "dark") {
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", "#0a0f1a");
    } else {
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", "#1326FD");
    }
  }

  hapticFeedback("light");
}

function initThemeIcons() {
  const theme = document.documentElement.getAttribute("data-theme") || "light";
  const sunIcon = document.querySelector(".theme-icon-sun");
  const moonIcon = document.querySelector(".theme-icon-moon");

  if (theme === "dark") {
    if (sunIcon) sunIcon.style.display = "none";
    if (moonIcon) moonIcon.style.display = "block";
  } else {
    if (sunIcon) sunIcon.style.display = "block";
    if (moonIcon) moonIcon.style.display = "none";
  }
}

// ==========================================
// Part 2: New sections rendering
// ==========================================

async function renderInstructions(container) {
  // Show loading state immediately
  container.innerHTML = `<div class="card"><p>Загрузка данных...</p></div>`;
  
  // Ensure data is loaded
  const loaded = await ensureDataLoaded('instructions');
  if (!loaded) {
    container.innerHTML = `<div class="card"><p>❌ Ошибка загрузки данных</p></div>`;
    return;
  }
  
  const data = window.APP_DATA.instructions;
  if (!data || !data.groups) {
    container.innerHTML = `<div class="card"><p>❌ Данные недоступны</p></div>`;
    return;
  }

  container.innerHTML = `
    <h1>${data.title}</h1>
    <p class="caption mb-lg">${data.description}</p>
    <div class="card-grid">
      ${data.groups
        .map(
          (group) => `
        <div class="collapsible">
          <div class="collapsible-header" data-action="toggleCollapsible">
            <span><span style="font-size: 24px; margin-right: var(--space-sm);">${
              group.icon
            }</span><strong>${group.title}</strong></span>
            <svg class="collapsible-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </div>
          <div class="collapsible-content">
            <div class="collapsible-body">
              <p class="caption mb-md">${group.description}</p>
              <div class="list">
                ${group.items
                  .map((item) => {
                    const isPlaceholder = item.url.includes("<ADD_LINK>");
                    return `
                    <div class="list-item ${
                      isPlaceholder ? "opacity-50" : ""
                    }" ${
                      !isPlaceholder
                        ? `data-action="openLink" data-url="${item.url}"`
                        : ""
                    }>
                      <div style="flex: 1;">
                        <strong>${item.title}</strong>
                        <p class="caption" style="margin: var(--space-xs) 0 0 0;">${
                          item.description
                        }</p>
                        ${
                          item.videos
                            ? `
                          <div style="margin-top: var(--space-sm); display: flex; gap: var(--space-sm); flex-wrap: wrap;">
                            ${item.videos
                              .map(
                                (video) => `
                              <button class="btn btn-ghost" data-action="openLink" data-url="${video.url}" style="padding: var(--space-xs) var(--space-sm); font-size: var(--font-size-small);">
                                ▶️ ${video.title}
                              </button>
                            `
                              )
                              .join("")}
                          </div>
                        `
                            : ""
                        }
                      </div>
                      ${
                        isPlaceholder
                          ? '<span class="caption" style="color: var(--text-muted);">Скоро</span>'
                          : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>'
                      }
                    </div>
                  `;
                  })
                  .join("")}
              </div>
            </div>
          </div>
        </div>
      `
        )
        .join("")}
    </div>
  `;
}

async function renderAnnouncements(container) {
  // Show loading state immediately
  container.innerHTML = `<div class="card"><p>Загрузка данных...</p></div>`;
  
  // Ensure data is loaded
  const loaded = await ensureDataLoaded('announcements');
  if (!loaded) {
    container.innerHTML = `<div class="card"><p>❌ Ошибка загрузки данных</p></div>`;
    return;
  }
  
  const announcements = window.APP_DATA.announcements || [];

  if (announcements.length === 0) {
    container.innerHTML = `
      <h1>Анонсы</h1>
      <div class="card" style="text-align: center; padding: var(--space-xl);">
        <div style="font-size: 48px; margin-bottom: var(--space-md);">📢</div>
        <h3>Пока нет новых анонсов</h3>
        <p class="caption">Следите за обновлениями</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <h1>Анонсы</h1>
    <p class="caption mb-lg">Предстоящие события и важные объявления</p>
    <div class="card-grid">
      ${announcements
        .map((announcement) => {
          const date = announcement.date
            ? new Date(announcement.date)
            : new Date();
          const dateStr = date.toLocaleDateString("ru-RU", {
            day: "numeric",
            month: "long",
            year: "numeric",
          });
          const isPast = date < new Date();

          return `
          <div class="card ${isPast ? "opacity-50" : ""}">
            <div style="display: flex; align-items: start; gap: var(--space-md); margin-bottom: var(--space-md);">
              <div style="font-size: 40px; line-height: 1;">${
                announcement.icon || "📢"
              }</div>
              <div style="flex: 1;">
                <div class="caption" style="color: var(--color-primary); font-weight: 600; margin-bottom: var(--space-xs);">
                  ${dateStr}, ${announcement.time || "—"} ${
            announcement.timezone || "МСК"
          }
                </div>
                <h3 style="margin-bottom: var(--space-sm);">${
                  announcement.title || "Без названия"
                }</h3>
              </div>
            </div>
            <p>${announcement.description || ""}</p>
            ${
              announcement.formUrl
                ? `
              <button class="btn btn-primary" data-action="openLink" data-url="${announcement.formUrl}" style="width: 100%; margin-top: var(--space-md);">
                📝 Задать вопрос заранее
              </button>
            `
                : ""
            }
            ${
              isPast
                ? '<p class="caption" style="margin-top: var(--space-md); color: var(--text-muted);">Событие завершено</p>'
                : ""
            }
          </div>
        `;
        })
        .join("")}
    </div>
  `;
}

async function renderBroadcasts(container) {
  // Show loading state immediately
  container.innerHTML = `<div class="card"><p>Загрузка данных...</p></div>`;
  
  // Ensure data is loaded
  const loaded = await ensureDataLoaded('broadcasts');
  if (!loaded) {
    container.innerHTML = `<div class="card"><p>❌ Ошибка загрузки данных</p></div>`;
    return;
  }
  
  const data = window.APP_DATA.broadcasts;
  if (!data || !data.schedule) {
    container.innerHTML = `<div class="card"><p>❌ Данные недоступны</p></div>`;
    return;
  }

  const upcoming = data.schedule.filter((b) => b.status === "upcoming");
  const completed = data.schedule.filter((b) => b.status === "completed");

  container.innerHTML = `
    <h1>${data.title}</h1>
    <p class="caption mb-lg">${data.description}</p>
    
    <div class="card mb-lg" style="background: linear-gradient(135deg, var(--color-primary-light) 0%, var(--surface-1) 100%); border: 2px solid var(--color-primary);">
      <p style="line-height: var(--line-height-relaxed);">${data.intro}</p>
    </div>
    
    ${
      upcoming.length > 0
        ? `
      <h2 style="margin-bottom: var(--space-md);">📅 Предстоящие эфиры</h2>
      <div class="card-grid mb-lg">
        ${upcoming
          .map((broadcast) => {
            const date = broadcast.date ? new Date(broadcast.date) : new Date();
            const dateStr = date.toLocaleDateString("ru-RU", {
              day: "numeric",
              month: "long",
            });

            return `
            <div class="card" style="border: 2px solid var(--color-primary);">
              <div class="preview-label" style="color: var(--color-primary);">
                ${broadcast.day || "Дата"}, ${dateStr} • ${
              broadcast.time || "—"
            } ${broadcast.timezone || "МСК"}
              </div>
              <h3>${broadcast.title || "Без названия"}</h3>
              <p class="caption" style="margin-bottom: ${
                broadcast.recordUrl ? "var(--space-md)" : "0"
              };">${broadcast.description || ""}</p>
              ${
                broadcast.recordUrl
                  ? `<button class="btn btn-primary" data-action="openLink" data-url="${broadcast.recordUrl}" style="width: 100%; margin-top: var(--space-sm);">▶️ Смотреть запись</button>`
                  : ""
              }
            </div>
          `;
          })
          .join("")}
      </div>
    `
        : ""
    }
    
    <h2 style="margin-bottom: var(--space-md);">🎬 Прошедшие эфиры</h2>
    <div class="list">
      ${completed
        .map((broadcast) => {
          const date = broadcast.date ? new Date(broadcast.date) : new Date();
          const dateStr = date.toLocaleDateString("ru-RU", {
            day: "numeric",
            month: "long",
          });

          return `
          <div class="list-item">
            <div style="flex: 1;">
              <div class="caption" style="margin-bottom: var(--space-xs);">
                ${broadcast.day || "Дата"}, ${dateStr} • ${
            broadcast.time || "—"
          } ${broadcast.timezone || "МСК"}
              </div>
              <strong>${broadcast.title || "Без названия"}</strong>
              <p class="caption" style="margin: var(--space-xs) 0 0 0;">${
                broadcast.description || ""
              }</p>
            </div>
            ${
              broadcast.recordUrl
                ? `<button class="btn btn-ghost" data-action="openLink" data-url="${broadcast.recordUrl}" style="white-space: nowrap;">▶️ Запись</button>`
                : '<span class="caption" style="color: var(--text-muted);">Скоро</span>'
            }
          </div>
        `;
        })
        .join("")}
    </div>
  `;
}

function renderDashboard(container) {
  const data = window.APP_DATA.dashboard;
  if (!data || !data.title) {
    container.innerHTML = `<div class="card"><p>Загрузка данных...</p></div>`;
    return;
  }

  const isPlaceholder = data.url.includes("<ADD_");

  container.innerHTML = `
    <h1>${data.title}</h1>
    <p class="caption mb-lg">${data.description}</p>
    
    <div class="card">
      <div style="text-align: center; padding: var(--space-xl) 0;">
        <div style="font-size: 64px; margin-bottom: var(--space-lg);">📊</div>
        <h2 style="margin-bottom: var(--space-md);">${data.title}</h2>
        <p class="caption mb-lg">Полноценная аналитическая панель для управления инвестициями</p>
        
        <div style="text-align: left; margin: var(--space-xl) 0;">
          <h4 style="margin-bottom: var(--space-md);">Возможности:</h4>
          <ul style="list-style: none; padding: 0;">
            ${data.features
              .map(
                (feature) => `
              <li style="padding: var(--space-sm) 0; display: flex; align-items: start; gap: var(--space-sm);">
                <span style="color: var(--color-success); font-size: 20px;">✓</span>
                <span>${feature}</span>
              </li>
            `
              )
              .join("")}
          </ul>
        </div>
        
        ${
          isPlaceholder
            ? `
          <div style="margin-top: var(--space-xl); padding: var(--space-lg); background: var(--surface-2); border-radius: var(--radius-md);">
            <p style="color: var(--color-premium); font-weight: 600; margin-bottom: var(--space-sm);">🚀 Скоро!</p>
            <p class="caption">Дашборд находится в разработке. Скоро вы получите доступ ко всем функциям.</p>
          </div>
        `
            : `
          <button class="btn btn-primary" data-action="openLink" data-url="${data.url}" style="margin-top: var(--space-lg);">
            Открыть Дашборд
          </button>
        `
        }
      </div>
    </div>
  `;
}

async function renderSupport(container) {
  // Show loading state immediately
  container.innerHTML = `<div class="card"><p>Загрузка данных...</p></div>`;
  
  // Ensure data is loaded
  const loaded = await ensureDataLoaded('support');
  if (!loaded) {
    container.innerHTML = `<div class="card"><p>❌ Ошибка загрузки данных</p></div>`;
    return;
  }
  
  const data = window.APP_DATA.support;
  if (!data || !data.channels) {
    container.innerHTML = `<div class="card"><p>❌ Данные недоступны</p></div>`;
    return;
  }

  const isPlaceholder = data.botUrl.includes("<ADD_");

  container.innerHTML = `
    <h1>${data.title}</h1>
    <p class="caption mb-lg">${data.description}</p>
    
    <div class="card-grid">
      ${data.channels
        .map(
          (channel) => `
        <div class="card card-interactive" ${
          !isPlaceholder
            ? `data-action="openLink" data-url="${channel.url}"`
            : ""
        }>
          <div style="text-align: center;">
            <div style="font-size: 48px; margin-bottom: var(--space-md);">💬</div>
            <h3>${channel.title}</h3>
            <p class="caption">${channel.description}</p>
            ${
              isPlaceholder
                ? `
              <div style="margin-top: var(--space-lg); padding: var(--space-md); background: var(--surface-2); border-radius: var(--radius-md);">
                <p class="caption" style="color: var(--text-muted);">Скоро будет доступен</p>
              </div>
            `
                : `
              <button class="btn btn-primary" style="width: 100%; margin-top: var(--space-lg);">
                Связаться
              </button>
            `
            }
          </div>
        </div>
      `
        )
        .join("")}
    </div>
    
    <div class="card mt-lg" style="background: var(--surface-2);">
      <h3>Часы работы поддержки</h3>
      <p class="caption">${
        data.workingHours?.weekdays ||
        "Понедельник - Пятница: 10:00 - 19:00 МСК"
      }</p>
      <p class="caption">${
        data.workingHours?.weekend || "Суббота - Воскресенье: Выходной"
      }</p>
      <p class="caption" style="margin-top: var(--space-md);">${
        data.workingHours?.responseTime || "Среднее время ответа: до 2 часов"
      }</p>
    </div>
  `;
}

async function renderDocuments(container) {
  // Show loading state immediately
  container.innerHTML = `<div class="card"><p>Загрузка данных...</p></div>`;
  
  // Ensure data is loaded
  const loaded = await ensureDataLoaded('documents');
  if (!loaded) {
    container.innerHTML = `<div class="card"><p>❌ Ошибка загрузки данных</p></div>`;
    return;
  }
  
  const documents = window.APP_DATA.documents || [];

  container.innerHTML = `
    <h1>Документы</h1>
    <p class="caption mb-lg">Официальные документы и материалы</p>
    
    <div class="card-grid">
      ${documents
        .map(
          (doc) => `
        <div class="card card-interactive" data-action="openLink" data-url="${
          doc.url || "#"
        }">
          <div style="display: flex; align-items: start; gap: var(--space-md);">
            <div style="font-size: 40px; line-height: 1;">${
              doc.icon || "📄"
            }</div>
            <div style="flex: 1;">
              <h3 style="margin-bottom: var(--space-sm);">${
                doc.title || "Без названия"
              }</h3>
              <p class="caption">${doc.description || ""}</p>
              <div style="margin-top: var(--space-md);">
                <span class="caption" style="color: var(--color-primary); font-weight: 600;">
                  ${(doc.type || "PDF").toUpperCase()} документ →
                </span>
              </div>
            </div>
          </div>
        </div>
      `
        )
        .join("")}
    </div>
    
    <div class="card mt-lg" style="border: 2px solid var(--border-strong); background: var(--surface-2);">
      <p class="caption" style="line-height: var(--line-height-relaxed);">
        <strong>Важно:</strong> Все документы предоставлены исключительно в информационных целях. 
        Перед принятием инвестиционных решений рекомендуется проконсультироваться с финансовым консультантом.
      </p>
    </div>
  `;
}

async function renderFAQ(container) {
  // Show loading state immediately
  container.innerHTML = `<div class="card"><p>Загрузка данных...</p></div>`;
  
  // Ensure data is loaded
  const loaded = await ensureDataLoaded('faq');
  if (!loaded) {
    container.innerHTML = `<div class="card"><p>❌ Ошибка загрузки данных</p></div>`;
    return;
  }
  
  const data = window.APP_DATA.faq;
  if (!data || !data.categories) {
    container.innerHTML = `<div class="card"><p>❌ Данные недоступны</p></div>`;
    return;
  }

  // Build FAQ items map for quick lookup
  const faqMap = new Map();
  data.categories.forEach(category => {
    category.items.forEach(item => {
      faqMap.set(item.id, { ...item, categoryId: category.id, categoryTitle: category.title });
    });
  });

  // Render quick links
  const quickLinksHTML = data.quickLinks && data.quickLinks.length > 0
    ? `
      <div class="faq-quick-links" role="navigation" aria-label="Быстрые ссылки на популярные темы">
        <h2 class="section-title">Популярные темы</h2>
        <div class="quick-links-grid">
          ${data.quickLinks.map(link => `
            <button 
              class="quick-link-card" 
              data-action="scrollToFAQ" 
              data-faq-id="${link.questionIds[0]}"
              aria-label="${link.title}">
              <span class="quick-link-icon" aria-hidden="true">${link.icon}</span>
              <span class="quick-link-title">${link.title}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          `).join('')}
        </div>
      </div>
    `
    : '';

  // Render categories with accordion items
  const categoriesHTML = data.categories.map(category => {
    const itemsHTML = category.items.map((item, index) => {
      const hasLink = item.link && item.link.url;
      const relatedQuestionsHTML = item.relatedIds && item.relatedIds.length > 0
        ? `
          <div class="faq-related">
            <p class="faq-related-title"><strong>Смотрите также:</strong></p>
            <ul class="faq-related-list" role="list">
              ${item.relatedIds.map(relatedId => {
                const related = faqMap.get(relatedId);
                return related 
                  ? `<li><button class="faq-related-link" data-action="scrollToFAQ" data-faq-id="${relatedId}" aria-label="Перейти к вопросу: ${related.question}">${related.question}</button></li>`
                  : '';
              }).join('')}
            </ul>
          </div>
        `
        : '';

      return `
        <div class="faq-item" id="${item.id}" data-faq-id="${item.id}">
          <h3 class="faq-question">
            <button 
              class="faq-toggle" 
              aria-expanded="false" 
              aria-controls="faq-answer-${item.id}"
              id="faq-btn-${item.id}">
              <span class="faq-toggle-icon" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </span>
              <span class="faq-question-text">${item.question}</span>
            </button>
          </h3>
          <div 
            class="faq-answer" 
            id="faq-answer-${item.id}" 
            role="region"
            aria-labelledby="faq-btn-${item.id}"
            hidden>
            <div class="faq-answer-content">
              <p style="white-space: pre-line; line-height: 1.6;">${item.answer}</p>
              ${hasLink ? `
                <a 
                  href="${item.link.url}" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  class="btn btn-primary btn-sm" 
                  style="margin-top: var(--space-md); display: inline-flex; align-items: center; gap: var(--space-xs);">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
                  </svg>
                  ${item.link.text}
                  <span class="visually-hidden"> (откроется в новом окне)</span>
                </a>
              ` : ''}
              ${relatedQuestionsHTML}
            </div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <section class="faq-category" role="region" aria-labelledby="category-${category.id}">
        <h2 class="faq-category-title" id="category-${category.id}">
          <span aria-hidden="true">${category.icon}</span> ${category.title}
        </h2>
        <div class="faq-items" role="list">
          ${itemsHTML}
        </div>
      </section>
    `;
  }).join('');

  container.innerHTML = `
    <div class="faq-container">
      <header class="faq-header">
        <h1>${data.icon} ${data.title}</h1>
        <p class="caption">${data.description}</p>
      </header>

      <!-- Search Bar -->
      <div class="faq-search" role="search">
        <label for="faq-search-input" class="visually-hidden">Поиск по вопросам</label>
        <div class="search-input-wrapper">
          <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input 
            type="search" 
            id="faq-search-input" 
            class="faq-search-input" 
            placeholder="Поиск по вопросам и ответам..."
            aria-label="Поиск по вопросам и ответам"
            autocomplete="off">
          <button 
            class="search-clear" 
            id="faq-search-clear" 
            aria-label="Очистить поиск" 
            hidden>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <p id="faq-search-results" class="faq-search-results" role="status" aria-live="polite"></p>
      </div>

      ${quickLinksHTML}

      <!-- FAQ Categories -->
      <div class="faq-categories">
        ${categoriesHTML}
      </div>

      <!-- Support Card -->
      <div class="card" style="margin-top: var(--space-xl);">
        <h3>Не нашли ответ?</h3>
        <p class="caption mb-md">Обратитесь в службу поддержки — мы поможем разобраться</p>
        <button class="btn btn-secondary" data-action="navigate" data-route="support" style="width: 100%;">
          💬 Связаться с поддержкой
        </button>
      </div>
    </div>
  `;

  // Initialize FAQ interactions
  initFAQInteractions(faqMap);
}

function initFAQInteractions(faqMap) {
  // Accordion toggle functionality
  document.querySelectorAll('.faq-toggle').forEach(button => {
    button.addEventListener('click', (e) => {
      hapticFeedback('light');
      const isExpanded = button.getAttribute('aria-expanded') === 'true';
      const answerId = button.getAttribute('aria-controls');
      const answer = document.getElementById(answerId);
      
      // Close all other open accordions for cleaner UX (optional)
      // Comment out if you want multiple items open at once
      document.querySelectorAll('.faq-toggle[aria-expanded="true"]').forEach(otherBtn => {
        if (otherBtn !== button) {
          const otherAnswerId = otherBtn.getAttribute('aria-controls');
          const otherAnswer = document.getElementById(otherAnswerId);
          otherBtn.setAttribute('aria-expanded', 'false');
          otherAnswer.hidden = true;
          otherBtn.closest('.faq-item').classList.remove('faq-item-open');
        }
      });

      // Toggle current accordion
      button.setAttribute('aria-expanded', !isExpanded);
      answer.hidden = isExpanded;
      button.closest('.faq-item').classList.toggle('faq-item-open', !isExpanded);

      // Smooth scroll to question if opening
      if (!isExpanded) {
        setTimeout(() => {
          button.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
      }
    });

    // Keyboard navigation
    button.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        button.click();
      }
    });
  });

  // Search functionality
  const searchInput = document.getElementById('faq-search-input');
  const searchClear = document.getElementById('faq-search-clear');
  const searchResults = document.getElementById('faq-search-results');
  
  let searchTimeout;
  
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim().toLowerCase();
    
    // Show/hide clear button
    searchClear.hidden = query.length === 0;
    
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      filterFAQItems(query, searchResults, faqMap);
    }, 300); // Debounce search
  });

  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    searchClear.hidden = true;
    filterFAQItems('', searchResults, faqMap);
    searchInput.focus();
  });

  // Quick links and related questions navigation
  document.querySelectorAll('[data-action="scrollToFAQ"]').forEach(button => {
    button.addEventListener('click', (e) => {
      hapticFeedback('light');
      const faqId = button.getAttribute('data-faq-id');
      const faqItem = document.getElementById(faqId);
      const faqToggle = document.getElementById(`faq-btn-${faqId}`);
      
      if (faqItem && faqToggle) {
        // Open the accordion
        faqToggle.setAttribute('aria-expanded', 'true');
        const answerId = faqToggle.getAttribute('aria-controls');
        const answer = document.getElementById(answerId);
        answer.hidden = false;
        faqItem.classList.add('faq-item-open');
        
        // Scroll to item with highlight
        faqItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        faqItem.classList.add('faq-item-highlight');
        setTimeout(() => {
          faqItem.classList.remove('faq-item-highlight');
        }, 2000);
      }
    });
  });
}

function filterFAQItems(query, resultsElement, faqMap) {
  const items = document.querySelectorAll('.faq-item');
  const categories = document.querySelectorAll('.faq-category');
  
  if (!query) {
    // Show all items
    items.forEach(item => item.style.display = '');
    categories.forEach(cat => cat.style.display = '');
    resultsElement.textContent = '';
    return;
  }

  let matchCount = 0;
  
  items.forEach(item => {
    const faqId = item.getAttribute('data-faq-id');
    const faqData = faqMap.get(faqId);
    
    if (faqData) {
      const questionMatch = faqData.question.toLowerCase().includes(query);
      const answerMatch = faqData.answer.toLowerCase().includes(query);
      const tagsMatch = faqData.tags && faqData.tags.some(tag => tag.toLowerCase().includes(query));
      
      const isMatch = questionMatch || answerMatch || tagsMatch;
      
      if (isMatch) {
        item.style.display = '';
        matchCount++;
      } else {
        item.style.display = 'none';
      }
    }
  });

  // Hide empty categories
  categories.forEach(category => {
    const visibleItems = category.querySelectorAll('.faq-item:not([style*="display: none"])');
    category.style.display = visibleItems.length > 0 ? '' : 'none';
  });

  // Update results message
  if (matchCount === 0) {
    resultsElement.textContent = `По запросу "${query}" ничего не найдено`;
  } else {
    resultsElement.textContent = `Найдено: ${matchCount} ${getDeclension(matchCount, ['вопрос', 'вопроса', 'вопросов'])}`;
  }
}

function getDeclension(number, titles) {
  const cases = [2, 0, 1, 1, 1, 2];
  return titles[(number % 100 > 4 && number % 100 < 20) ? 2 : cases[(number % 10 < 5) ? number % 10 : 5]];
}

async function renderLiterature(container) {
  // Show loading state immediately
  container.innerHTML = `<div class="card"><p>Загрузка данных...</p></div>`;
  
  // Ensure data is loaded
  const loaded = await ensureDataLoaded('literature');
  if (!loaded) {
    container.innerHTML = `<div class="card"><p>❌ Ошибка загрузки данных</p></div>`;
    return;
  }
  
  const data = window.APP_DATA.literature;
  if (!data || !data.categories) {
    container.innerHTML = `<div class="card"><p>❌ Данные недоступны</p></div>`;
    return;
  }

  const categoriesHTML = data.categories
    .map((category) => {
      const booksHTML = category.books
        .map((book) => {
          const linkButton = book.url
            ? `<button class="btn btn-primary" data-action="openLink" data-url="${book.url}" style="margin-top: var(--space-md); width: 100%;">
               🛒 Купить на Litres
             </button>`
            : "";

          // Поддержка обложек книг
          const coverImage = book.cover
            ? `
              <div style="float: left; margin-right: var(--space-md); margin-bottom: var(--space-sm); width: 120px; flex-shrink: 0;">
                <img src="${book.cover}" 
                     alt="${book.title}" 
                     loading="lazy"
                     style="width: 100%; height: auto; border-radius: var(--radius-md); box-shadow: 0 4px 12px rgba(0,0,0,0.15);" />
              </div>
            `
            : "";

          return `
          <div class="card" style="margin-bottom: var(--space-md); overflow: hidden;">
            ${coverImage}
            <div style="min-height: ${book.cover ? '140px' : 'auto'};">
              <h3 style="margin-bottom: var(--space-xs); color: var(--color-primary);">${
                book.title
              }</h3>
              <p class="caption" style="margin-bottom: var(--space-xs);"><strong>✍️ Автор:</strong> ${
                book.author
              }</p>
              ${
                book.year
                  ? `<p class="caption" style="margin-bottom: var(--space-sm); opacity: 0.7;">📅 Год издания: ${book.year}</p>`
                  : ""
              }
              <p style="margin-bottom: var(--space-sm); line-height: var(--line-height-relaxed); color: var(--text-secondary);">${
                book.description
              }</p>
            </div>
            <div style="clear: both;"></div>
            ${linkButton}
          </div>
        `;
        })
        .join("");

      return `
        <section class="content-section">
          <h2 class="section-title">${category.icon} ${category.name}</h2>
          ${booksHTML}
        </section>
      `;
    })
    .join("");

  container.innerHTML = `
    <h1>${data.title}</h1>
    <p class="caption mb-lg">${data.description}</p>
    
    ${categoriesHTML}
    
    <div class="card mt-lg" style="border: 2px solid var(--border-strong); background: var(--surface-2);">
      <p class="caption" style="line-height: var(--line-height-relaxed);">
        <strong>Совет:</strong> Начните с категории "Основы инвестирования", если вы новичок. 
        Книги расположены в рекомендуемом порядке для изучения. 
      </p>
    </div>
  `;
}

function openLink(url) {
  hapticFeedback("light");
  if (url.includes("<ADD_")) {
    alert("Эта функция скоро будет доступна");
    return;
  }
  if (tg) {
    tg.openLink(url);
  } else {
    window.open(url, "_blank");
  }
}

// Utility: Debounce
function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// Utility: Lazy Load Images with Intersection Observer
function initLazyLoading() {
  const lazyImages = document.querySelectorAll(
    'img[data-src], img[loading="lazy"]'
  );

  if ("IntersectionObserver" in window) {
    const imageObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.removeAttribute("data-src");
            }
            img.classList.add("loaded");
            imageObserver.unobserve(img);
          }
        });
      },
      {
        rootMargin: "50px 0px",
        threshold: 0.01,
      }
    );

    lazyImages.forEach((img) => imageObserver.observe(img));
  } else {
    // Fallback for browsers without Intersection Observer
    lazyImages.forEach((img) => {
      if (img.dataset.src) {
        img.src = img.dataset.src;
        img.removeAttribute("data-src");
      }
    });
  }
}

// Global error handler
window.addEventListener("error", (e) => {
  console.error("Global error:", e.error);
  // Could show toast notification here
});

window.addEventListener("unhandledrejection", (e) => {
  console.error("Unhandled promise rejection:", e.reason);
});

// Global Event Delegation Handler
document.addEventListener("click", (e) => {
  const target = e.target.closest("[data-action]");
  if (!target) return;

  const action = target.dataset.action;

  switch (action) {
    case "switchTab":
      const tabName =
        target.dataset.tab || target.closest(".tab-item")?.dataset.tab;
      if (tabName) switchTab(tabName);
      break;
    case "navigate":
      const route = target.dataset.route;
      const quizId = target.dataset.quizId;
      navigate(route, quizId ? { id: quizId } : {});
      break;
    case "startQuiz":
      startQuiz(target.dataset.quizId);
      break;
    case "selectAnswer":
      selectAnswer(parseInt(target.dataset.index));
      break;
    case "showHint":
      showHint();
      break;
    case "skipQuestion":
      skipQuestion();
      break;
    case "downloadResult":
      downloadResult();
      break;
    case "shareResult":
      shareResult();
      break;
    case "toggleCollapsible":
      toggleCollapsible(target);
      break;
    case "openVideo":
      openVideo(target.dataset.url);
      break;
    case "openLink":
      openLink(target.dataset.url);
      break;
    case "showTermDetail":
      showTermDetail(target.dataset.termId);
      break;
    case "closeModal":
      target.closest('div[style*="fixed"]')?.remove();
      break;
    case "resetProgress":
      resetProgress();
      break;
    case "refreshVault":
      refreshVault();
      break;
    case "resetDashboardFilters":
      resetDashboardFilters();
      break;
  }
});

// Global Change Event Handler for filters
document.addEventListener("change", (e) => {
  const target = e.target;
  if (target.dataset.filter) {
    filterDashboard(target);
  }
});

async function refreshVault() {
  hapticFeedback("light");
  try {
    await loadVaultData();
    // Re-render home page if we're on it
    if (AppState.currentRoute === "home") {
      const container = document.getElementById("content");
      renderHome(container);
    }
  } catch (error) {
    console.error("Failed to refresh vault data:", error);
  }
}

// Initialize app
document.addEventListener("DOMContentLoaded", () => {
  // Synchronous initialization first
  loadUserData();
  initThemeIcons();

  // Setup event handlers
  const themeToggle = document.getElementById("themeToggle");
  if (themeToggle) {
    themeToggle.onclick = toggleTheme;
  }
  
  document.getElementById("backBtn").onclick = handleBackButton;

  // Initialize Tab Bar immediately
  renderTabBar();

  // Restore last active tab or use default
  const lastTab = localStorage.getItem("lastActiveTab") || "home";
  const hash = window.location.hash.substring(1);
  const tabRoutes = ["home", "learn", "data", "progress", "more"];
  const initialTab = tabRoutes.includes(hash) ? hash : lastTab;
  AppState.activeTab = initialTab;

  // Event-driven approach: wait for critical data, then render
  if (window.APP_DATA_READY) {
    initializeApp(hash, initialTab, tabRoutes);
  } else {
    document.addEventListener('app-data-ready', () => {
      initializeApp(hash, initialTab, tabRoutes);
    }, { once: true });
  }

  // Initialize lazy loading for images
  initLazyLoading();

  // Re-initialize lazy loading after each navigation
  const originalNavigate = navigate;
  window.navigate = function (...args) {
    originalNavigate.apply(this, args);
    setTimeout(() => initLazyLoading(), 100);
  };

  // Register Service Worker for PWA
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("[App] SW registered:", registration.scope);

          // Check for updates every hour
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000);
        })
        .catch((error) => {
          console.log("[App] SW registration failed:", error);
        });
    });
  }
});

// App initialization function - called when critical data is ready
async function initializeApp(hash, initialTab, tabRoutes) {
  // Hide skeleton
  const skeleton = document.getElementById("skeleton");
  if (skeleton) {
    skeleton.style.display = "none";
  }

  // Navigate to initial tab or route immediately
  if (tabRoutes.includes(hash)) {
    switchTab(hash);
  } else if (hash && hash !== "home") {
    navigate(hash);
  } else {
    switchTab(initialTab);
  }

  // Load Vault data asynchronously and re-render home page after loading
  loadVaultData()
    .then(() => {
      // Re-render home page if we're on it to show loaded vault data
      if (AppState.currentRoute === "home") {
        const container = document.getElementById("content");
        if (container) {
          renderHome(container);
        }
      }
    })
    .catch(err => {
      console.error("Failed to load initial vault data:", err);
      // Still re-render to show error state
      if (AppState.currentRoute === "home") {
        const container = document.getElementById("content");
        if (container) {
          renderHome(container);
        }
      }
    });
}

// ==========================================
// DASHBOARD FUNCTIONALITY
// ==========================================

// Dashboard State
const DashboardState = {
  data: null,
  filteredData: null,
  filters: {
    year: null,
    month: null,
    coin: null,
    direction: null,
    leverage: null,
  },
  sortBy: "date-desc",
  isUpdatingFilters: false,
};

// Load Dashboard Data
async function loadDashboardData() {
  try {
    const response = await fetch("data/dashboard_data.json");
    if (!response.ok) throw new Error("Failed to load dashboard data");
    const data = await response.json();
    DashboardState.data = data.positions;
    DashboardState.filteredData = data.positions;
    return data;
  } catch (error) {
    console.error("[Dashboard] Error loading data:", error);
    return null;
  }
}

// Calculate Statistics
function calculateDashboardStats(positions) {
  if (!positions || positions.length === 0) {
    return {
      totalPnl: 0,
      grossPnl: 0,
      totalFees: 0,
      totalFunding: 0,
      winningPositions: 0,
      totalPositions: 0,
      winRate: 0,
    };
  }

  const totalPnl = positions.reduce((sum, p) => sum + (p.pnl || 0), 0);
  const totalFees = positions.reduce((sum, p) => sum + (p.fee || 0), 0);
  const totalFunding = positions.reduce((sum, p) => sum + (p.funding || 0), 0);
  const grossPnl = totalPnl + totalFees;
  const winningPositions = positions.filter((p) => p.pnl > 0).length;
  const totalPositions = positions.length;
  const winRate =
    totalPositions > 0 ? (winningPositions / totalPositions) * 100 : 0;

  return {
    totalPnl,
    grossPnl,
    totalFees,
    totalFunding,
    winningPositions,
    totalPositions,
    winRate,
  };
}

// Group positions by coin for charts
function groupByCoin(positions) {
  const grouped = {};

  positions.forEach((pos) => {
    if (!grouped[pos.coin]) {
      grouped[pos.coin] = {
        coin: pos.coin,
        totalPnl: 0,
        positions: 0,
        wins: 0,
      };
    }

    grouped[pos.coin].totalPnl += pos.pnl || 0;
    grouped[pos.coin].positions++;
    if (pos.pnl > 0) grouped[pos.coin].wins++;
  });

  return Object.values(grouped);
}

// Apply Filters
async function applyDashboardFilters() {
  if (!DashboardState.data) return;

  DashboardState.filteredData = DashboardState.data.filter((position) => {
    const posDate = new Date(position.startDate);
    const year = posDate.getFullYear();
    const month = posDate.getMonth() + 1;

    if (
      DashboardState.filters.year &&
      year !== parseInt(DashboardState.filters.year)
    ) {
      return false;
    }

    if (
      DashboardState.filters.month &&
      month !== parseInt(DashboardState.filters.month)
    ) {
      return false;
    }

    if (
      DashboardState.filters.coin &&
      position.coin !== DashboardState.filters.coin
    ) {
      return false;
    }

    if (
      DashboardState.filters.direction &&
      position.direction !== DashboardState.filters.direction
    ) {
      return false;
    }

    if (
      DashboardState.filters.leverage &&
      position.leverage !== DashboardState.filters.leverage
    ) {
      return false;
    }

    return true;
  });

  // Re-render dashboard with filtered data
  // populateDashboardFilters() will restore the values from DashboardState.filters
  const container = document.querySelector(".content");
  if (container && AppState.currentRoute === "dashboard") {
    await renderDashboard(container);
  }
}

// Reset Filters
function resetDashboardFilters() {
  DashboardState.filters = {
    year: null,
    month: null,
    coin: null,
    direction: null,
    leverage: null,
  };

  // Reset all select elements
  document.querySelectorAll(".filter-select").forEach((select) => {
    select.value = "";
  });

  applyDashboardFilters();
  hapticFeedback("light");
}

// Populate filter dropdowns
function populateDashboardFilters() {
  if (!DashboardState.data) return;

  // Years
  const years = [
    ...new Set(
      DashboardState.data.map((p) => new Date(p.startDate).getFullYear())
    ),
  ].sort((a, b) => b - a);
  const yearSelect = document.getElementById("dashboard-year-filter");
  if (yearSelect) {
    const currentValue = DashboardState.filters.year;
    yearSelect.innerHTML =
      '<option value="">Все годы</option>' +
      years.map((year) => `<option value="${year}">${year}</option>`).join("");
    if (currentValue) yearSelect.value = currentValue;
  }

  // Months
  const monthSelect = document.getElementById("dashboard-month-filter");
  if (monthSelect) {
    const currentValue = DashboardState.filters.month;
    const months = {
      1: "Январь",
      2: "Февраль",
      3: "Март",
      4: "Апрель",
      5: "Май",
      6: "Июнь",
      7: "Июль",
      8: "Август",
      9: "Сентябрь",
      10: "Октябрь",
      11: "Ноябрь",
      12: "Декабрь",
    };
    monthSelect.innerHTML =
      '<option value="">Все месяцы</option>' +
      Object.entries(months)
        .map(([num, name]) => `<option value="${num}">${name}</option>`)
        .join("");
    monthSelect.disabled = !DashboardState.filters.year;
    if (currentValue) monthSelect.value = currentValue;
  }

  // Coins
  const coins = [...new Set(DashboardState.data.map((p) => p.coin))].sort();
  const coinSelect = document.getElementById("dashboard-coin-filter");
  if (coinSelect) {
    const currentValue = DashboardState.filters.coin;
    coinSelect.innerHTML =
      '<option value="">Все активы</option>' +
      coins.map((coin) => `<option value="${coin}">${coin}</option>`).join("");
    if (currentValue) coinSelect.value = currentValue;
  }

  // Directions
  const directionSelect = document.getElementById("dashboard-direction-filter");
  if (directionSelect) {
    const currentValue = DashboardState.filters.direction;
    directionSelect.innerHTML = `
      <option value="">Все</option>
      <option value="Long">Лонг</option>
      <option value="Short">Шорт</option>
    `;
    if (currentValue) directionSelect.value = currentValue;
  }

  // Leverage
  const leverages = [
    ...new Set(DashboardState.data.map((p) => p.leverage)),
  ].sort();
  const leverageSelect = document.getElementById("dashboard-leverage-filter");
  if (leverageSelect) {
    const currentValue = DashboardState.filters.leverage;
    leverageSelect.innerHTML =
      '<option value="">Все плечи</option>' +
      leverages.map((lev) => `<option value="${lev}">${lev}</option>`).join("");
    if (currentValue) leverageSelect.value = currentValue;
  }
}

// Animate Number Counter
function animateNumber(
  element,
  start,
  end,
  duration = 1000,
  isCurrency = true
) {
  if (!element) return;

  const range = end - start;
  const increment = range / (duration / 16);
  let current = start;

  const timer = setInterval(() => {
    current += increment;

    if (
      (increment > 0 && current >= end) ||
      (increment < 0 && current <= end)
    ) {
      current = end;
      clearInterval(timer);
    }

    const roundedValue = Math.round(current);
    element.textContent = isCurrency
      ? formatCurrency(roundedValue)
      : roundedValue.toLocaleString("ru-RU");
  }, 16);
}

// Render Dashboard Stats
function renderDashboardStats(stats) {
  return `
    <div class="dashboard-stats">
      <div class="stat-card">
        <div class="stat-title">Общая Прибыль</div>
        <div class="stat-value ${
          stats.totalPnl >= 0 ? "positive" : "negative"
        }" data-animate="${stats.totalPnl}">
          ${formatCurrency(0)}
        </div>
        <div class="stat-subtitle">с учетом комиссий</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-title">Гросс Прибыль</div>
        <div class="stat-value ${
          stats.grossPnl >= 0 ? "positive" : "negative"
        }" data-animate="${stats.grossPnl}">
          ${formatCurrency(0)}
        </div>
        <div class="stat-subtitle">до вычета комиссий</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-title">Успешные Позиции</div>
        <div class="stat-value" data-animate="${
          stats.winningPositions
        }" data-type="number">0</div>
        <div class="stat-subtitle">${stats.winRate.toFixed(1)}% win rate</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-title">Всего Позиций</div>
        <div class="stat-value" data-animate="${
          stats.totalPositions
        }" data-type="number">0</div>
        <div class="stat-subtitle">торговых позиций</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-title">Комиссии</div>
        <div class="stat-value negative" data-animate="${stats.totalFees}">
          ${formatCurrency(0)}
        </div>
        <div class="stat-subtitle">fee</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-title">Фандинг</div>
        <div class="stat-value ${
          stats.totalFunding >= 0 ? "positive" : "negative"
        }" data-animate="${stats.totalFunding}">
          ${formatCurrency(0)}
        </div>
        <div class="stat-subtitle">funding</div>
      </div>
    </div>
  `;
}

// Render Dashboard Filters
function renderDashboardFilters() {
  return `
    <div class="dashboard-filters">
      <div class="filter-group">
        <label class="filter-label" for="dashboard-year-filter">Год</label>
        <select class="filter-select" id="dashboard-year-filter" data-filter="year">
          <option value="">Все годы</option>
        </select>
      </div>
      
      <div class="filter-group">
        <label class="filter-label" for="dashboard-month-filter">Месяц</label>
        <select class="filter-select" id="dashboard-month-filter" data-filter="month">
          <option value="">Все месяцы</option>
        </select>
      </div>
      
      <div class="filter-group">
        <label class="filter-label" for="dashboard-coin-filter">Актив</label>
        <select class="filter-select" id="dashboard-coin-filter" data-filter="coin">
          <option value="">Все активы</option>
        </select>
      </div>
      
      <div class="filter-group">
        <label class="filter-label" for="dashboard-direction-filter">Направление</label>
        <select class="filter-select" id="dashboard-direction-filter" data-filter="direction">
          <option value="">Все</option>
        </select>
      </div>
      
      <div class="filter-group">
        <label class="filter-label" for="dashboard-leverage-filter">Плечо</label>
        <select class="filter-select" id="dashboard-leverage-filter" data-filter="leverage">
          <option value="">Все плечи</option>
        </select>
      </div>
      
      <div class="filter-group" style="justify-content: flex-end;">
        <label class="filter-label" style="visibility: hidden;">Reset</label>
        <button class="btn btn-ghost" data-action="resetDashboardFilters" style="width: 100%;">
          🔄 Сбросить
        </button>
      </div>
    </div>
  `;
}

// Render Bar Chart
function renderBarChart(data) {
  if (!data || data.length === 0) {
    return '<div class="empty-state"><p>Нет данных для отображения</p></div>';
  }

  const maxPnl = Math.max(...data.map((d) => Math.abs(d.totalPnl)));

  return `
    <div class="bar-chart">
      ${data
        .map((item) => {
          const percentage =
            maxPnl > 0 ? (Math.abs(item.totalPnl) / maxPnl) * 100 : 0;
          const coinColor = getCoinColor(item.coin);
          const tooltip = `${item.coin}: ${formatCurrency(item.totalPnl)} • ${
            item.positions
          } позиций • ${item.wins} успешных`;

          return `
          <div class="bar-item" data-tooltip="${tooltip}">
            <span class="bar-label" style="color: ${coinColor}">${
            item.coin
          }</span>
            <div class="bar-fill-container">
              <div class="bar-fill" 
                   style="--percentage: ${percentage}%; --coin-color: ${coinColor}"
                   data-coin="${item.coin}">
              </div>
            </div>
            <span class="bar-value ${
              item.totalPnl >= 0 ? "positive" : "negative"
            }">
              ${formatCurrency(item.totalPnl)}
            </span>
          </div>
        `;
        })
        .join("")}
    </div>
  `;
}

// Render Pie Chart
function renderPieChart(data) {
  if (!data || data.length === 0) {
    return '<div class="empty-state"><p>Нет данных для отображения</p></div>';
  }

  const total = data.reduce((sum, item) => sum + Math.abs(item.totalPnl), 0);
  let currentAngle = 0;

  const slices = data.map((item) => {
    const percentage = total > 0 ? (Math.abs(item.totalPnl) / total) * 100 : 0;
    const angle = (percentage / 100) * 360;
    const color = getCoinColor(item.coin);

    const slice = {
      ...item,
      percentage,
      startAngle: currentAngle,
      endAngle: currentAngle + angle,
      color,
    };

    currentAngle += angle;
    return slice;
  });

  const gradientStops = slices
    .map((s) => `${s.color} ${s.startAngle}deg ${s.endAngle}deg`)
    .join(", ");

  return `
    <div class="pie-chart-container">
      <div class="pie-chart" style="--gradient-stops: ${gradientStops}">
        <div class="pie-chart-hole">
          <div class="pie-chart-total">${formatCurrency(total)}</div>
          <div class="pie-chart-label">Total PnL</div>
        </div>
      </div>
      
      <div class="pie-legend">
        ${slices
          .map(
            (slice) => `
          <div class="legend-item">
            <div class="legend-color" style="--coin-color: ${
              slice.color
            }"></div>
            <span class="legend-label">${slice.coin}</span>
            <span class="legend-value">${slice.percentage.toFixed(1)}%</span>
          </div>
        `
          )
          .join("")}
      </div>
    </div>
  `;
}

// Render Position Card
function renderPositionCard(position) {
  const coinColor = getCoinColor(position.coin);
  const directionClass = position.direction.toLowerCase();
  const directionText = position.direction === "Long" ? "Лонг" : "Шорт";

  return `
    <div class="position-card">
      <div class="position-header">
        <div class="position-coin">
          <span class="position-coin-symbol" style="--coin-color: ${coinColor}">${
    position.coin
  }</span>
          <span class="position-date">${position.dateRange}</span>
        </div>
        <span class="direction-badge ${directionClass}">${directionText}</span>
      </div>
      
      <div class="position-details">
        <div class="detail-item">
          <div class="detail-label">Плечо</div>
          <div class="detail-value">${position.leverage}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Объем</div>
          <div class="detail-value">${formatCurrency(
            position.volumeWithLeverage
          )}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Маржа</div>
          <div class="detail-value">${formatCurrency(position.margin)}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Комиссия</div>
          <div class="detail-value">${formatCurrency(position.fee)}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Фандинг</div>
          <div class="detail-value ${
            position.funding >= 0 ? "positive" : "negative"
          }">
            ${formatCurrency(position.funding)}
          </div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Время</div>
          <div class="detail-value">${position.duration}</div>
        </div>
      </div>
      
      <div class="position-pnl">
        <span class="position-pnl-label">PnL:</span>
        <span class="position-pnl-value ${
          position.pnl >= 0 ? "positive" : "negative"
        }">
          ${formatCurrency(position.pnl)}
        </span>
      </div>
    </div>
  `;
}

// Render Positions List
function renderPositionsList(positions) {
  if (!positions || positions.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">📊</div>
        <div class="empty-state-title">Нет позиций</div>
        <p>Попробуйте изменить фильтры</p>
      </div>
    `;
  }

  return `
    <div class="positions-list">
      ${positions.map((pos) => renderPositionCard(pos)).join("")}
    </div>
  `;
}

// Main Dashboard Render Function
async function renderDashboard(container) {
  // Load data if not loaded
  if (!DashboardState.data) {
    container.innerHTML = `
      <h1>Дашборд</h1>
      <div class="loading-message">
        <div class="skeleton" style="height: 200px; margin-bottom: var(--space-lg);"></div>
        <div class="skeleton" style="height: 300px;"></div>
      </div>
    `;

    await loadDashboardData();

    if (!DashboardState.data) {
      container.innerHTML = `
        <h1>Дашборд</h1>
        <div class="empty-state">
          <div class="empty-state-icon">⚠️</div>
          <div class="empty-state-title">Ошибка загрузки данных</div>
          <p>Не удалось загрузить данные дашборда</p>
        </div>
      `;
      return;
    }
  }

  const stats = calculateDashboardStats(DashboardState.filteredData);
  const groupedData = groupByCoin(DashboardState.filteredData);
  const sortedByPnl = [...groupedData].sort(
    (a, b) => Math.abs(b.totalPnl) - Math.abs(a.totalPnl)
  );

  container.innerHTML = `
    <h1>Дашборд</h1>
    <p class="caption mb-lg">Аналитика торговых позиций MC Recovery Fund</p>
    
    ${renderDashboardFilters()}
    
    ${renderDashboardStats(stats)}
    
    <div class="charts-grid">
      <div class="card">
        <h3 class="mb-md">Распределение PnL по активам</h3>
        ${renderBarChart(sortedByPnl)}
      </div>
      
      <div class="card">
        <h3 class="mb-md">Доли активов в портфеле</h3>
        ${renderPieChart(sortedByPnl)}
      </div>
    </div>
    
    <div class="card">
      <h3 class="mb-md">Все Позиции (${DashboardState.filteredData.length})</h3>
      ${renderPositionsList(DashboardState.filteredData)}
    </div>
  `;

  // Initialize animations and populate filters (DOM is ready)
  initDashboardAnimations();
  populateDashboardFilters();
}

// Initialize Dashboard Animations
function initDashboardAnimations() {
  // Animate stat numbers
  document.querySelectorAll(".stat-value[data-animate]").forEach((el) => {
    const endValue = parseFloat(el.dataset.animate);
    const isNumber = el.dataset.type === "number";
    animateNumber(el, 0, endValue, 1000, !isNumber); // isCurrency = !isNumber
  });

  // Animate bar chart fills
  setTimeout(() => {
    document.querySelectorAll(".bar-fill").forEach((bar) => {
      bar.classList.add("animate");
    });
  }, 300);
}

// Handle Filter Change
async function filterDashboard(element) {
  const filterType = element.dataset.filter;
  const value = element.value;

  // Prevent event propagation during programmatic changes
  if (DashboardState.isUpdatingFilters) return;

  DashboardState.filters[filterType] = value || null;

  // Enable/disable month filter based on year selection
  if (filterType === "year") {
    const monthSelect = document.getElementById("dashboard-month-filter");
    if (monthSelect) {
      DashboardState.isUpdatingFilters = true;
      monthSelect.disabled = !value;
      if (!value) {
        monthSelect.value = "";
        DashboardState.filters.month = null;
      }
      DashboardState.isUpdatingFilters = false;
    }
  }

  await applyDashboardFilters();
  hapticFeedback("light");
}

// Get coin color (from existing function or define colors)
function getCoinColor(coin) {
  const coinColors = {
    BTC: "#F7931A",
    ETH: "#627EEA",
    SOL: "#14F195",
    HYPE: "#00D4FF",
    BNB: "#F3BA2F",
    XRP: "#23292F",
    ADA: "#0033AD",
    DOGE: "#C2A633",
    MATIC: "#8247E5",
    AVAX: "#E84142",
  };

  return coinColors[coin] || "var(--color-primary)";
}
