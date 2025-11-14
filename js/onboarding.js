/**
 * MC Recovery Fund - Onboarding Tour System
 * Профессиональная реализация интерактивного туториала
 */

import { TIMING_CONFIG } from './core/config.js';

(function () {
  "use strict";

  // ==========================================
  // Configuration
  // ==========================================

  const CONFIG = {
    localStorageKey: "mcrf_hasSeenOnboarding",
    debounceDelay: 100, // Уменьшено для лучшего INP
    animationDuration: 120, // Уменьшено для INP <200ms
    highlightPadding: 8,
    tooltipOffset: 16,
  };

  // Шаги туториала - расширенная версия для полного знакомства с приложением
  const TOUR_STEPS = [
    // === ПРИВЕТСТВИЕ И ОСНОВЫ ===
    {
      target: ".topbar-logo",
      title: "Добро пожаловать! 👋",
      content:
        "Приложение MC Recovery Fund — ваш проводник в мире инвестирования. Давайте познакомимся с основными элементами!",
      position: "bottom",
    },
    {
      target: "#themeToggle",
      title: "Настройка темы 🌓",
      content:
        "Переключайте светлую и тёмную темы для комфортной работы в любое время суток.",
      position: "bottom",
    },

    // === MC Recovery Vault (теперь в разделе Данные) ===
    {
      target: '[data-tab="data"]',
      title: "Раздел Данные 📊",
      content:
        "Здесь находится MC Recovery Vault с данными в реальном времени. Откроем раздел.",
      position: "top",
      autoClick: true, // Автоматически откроем вкладку
    },
    {
      target: "#vaultWidget",
      title: "MC Recovery Vault 🏦",
      content:
        "Виджет с данными в реальном времени: состояние позиций, используемая маржа, APR и открытые сделки. Обновляется автоматически.",
      position: "bottom",
      requireTab: "data",
    },
    {
      target: ".quick-access",
      title: "Быстрый доступ ⚡",
      content:
        "Мгновенный переход к самым важным разделам: инструкциям, дашборду, эфирам и анонсам.",
      position: "bottom",
    },

    // === НАВИГАЦИЯ ===
    {
      target: ".tab-bar",
      title: "Навигация по разделам 🧭",
      content:
        "Нижнее меню — главный способ навигации. Пять разделов: Главная, Обучение, Игра, Данные и Профиль.",
      position: "top",
    },

    // === ВКЛАДКА ОБУЧЕНИЕ ===
    {
      target: '[data-tab="learn"]',
      title: 'Вкладка "Обучение" 📚',
      content:
        "Раздел для развития знаний об инвестировании. Откроем его и рассмотрим подробнее.",
      position: "top",
      autoClick: true, // Автоматически откроем вкладку при показе этого шага
    },
    {
      target: ".quiz-accordion-card",
      title: "Интерактивные квизы 🎯",
      content:
        "Проверяйте свои знания! Квизы разделены по сложности: легкие, средние и сложные.",
      position: "bottom",
      requireTab: "learn",
    },
    {
      target: 'button[data-route="quizzes"]',
      title: "Все квизы 📝",
      content:
        "Нажмите сюда, чтобы увидеть полный список всех доступных квизов с фильтрами и сортировкой.",
      position: "top",
      requireTab: "learn",
    },
    {
      target: ".quiz-difficulty-group",
      title: "Группы по сложности 🎚️",
      content:
        "Квизы организованы по уровням: 🟢 Легкие для начинающих, 🟡 Средние для практики, 🔴 Сложные для экспертов. Раскройте группу чтобы увидеть квизы.",
      position: "bottom",
      requireTab: "learn",
      autoClick: true,
    },
    {
      target: ".quiz-list-item",
      title: "Выбор квиза 🎲",
      content:
        "Каждый квиз показывает количество вопросов, время прохождения и отметку о завершении. Нажмите на любой квиз для начала!",
      position: "top",
      requireTab: "learn",
    },
    {
      target: '.nav-card[data-route="edu"]',
      title: "Инфографика и обучение 🎓",
      content:
        "Визуальные материалы, схемы и пошаговые руководства по основам инвестирования и работе с платформой.",
      position: "top",
      requireTab: "learn",
    },
    {
      target: '.nav-card[data-route="glossary"]',
      title: "Глоссарий терминов 📚",
      content:
        "База знаний с определениями финансовых терминов. Поиск по алфавиту, категориям и ключевым словам.",
      position: "top",
      requireTab: "learn",
    },
    {
      target: '.nav-card[data-route="literature"]',
      title: "Рекомендуемая литература 📖",
      content:
        "Подборка книг для углубленного изучения инвестиций, трейдинга и финансовых рынков.",
      position: "top",
      requireTab: "learn",
    },
    {
      target: '.nav-card[data-route="faq"]',
      title: "Часто задаваемые вопросы ❓",
      content:
        "Ответы на популярные вопросы о работе платформы, стратегиях фонда и процессах инвестирования.",
      position: "top",
      requireTab: "learn",
    },

    // === ВКЛАДКА ИГРА ===
    {
      target: '[data-tab="game"]',
      title: 'Вкладка "Игра" 🪙',
      content:
        "Трейдинг-симулятор для практики торговли криптовалютами. Зарабатывайте виртуальные TAPS, делайте ставки и учитесь торговать без риска!",
      position: "top",
      autoClick: true,
    },
    {
      target: ".market-selector",
      title: "Выбор актива 💱",
      content:
        "Переключайтесь между BTC, ETH, SOL и HYPE. Цены обновляются в реальном времени.",
      position: "bottom",
      requireTab: "game",
    },
    {
      target: "#tapZone",
      title: "Tap to Earn 👆",
      content:
        "Тапайте на экран чтобы зарабатывать TAPS — виртуальную валюту для игры. Используйте TAPS для торговых ставок!",
      position: "top",
      requireTab: "game",
    },
    {
      target: ".trading-panel",
      title: "Торговая панель 📈",
      content:
        "Делайте ставки LONG (рост) или SHORT (падение). Выберите сумму, укажите направление и проверьте свой прогноз!",
      position: "top",
      requireTab: "game",
    },

    // === ВКЛАДКА ДАННЫЕ ===
    {
      target: '[data-tab="data"]',
      title: 'Вкладка "Данные" 📊',
      content:
        "Аналитика, метрики и актуальная информация о деятельности фонда. Переходим к изучению.",
      position: "top",
      autoClick: true,
    },
    {
      target: '.nav-card[data-route="dashboard"]',
      title: "Дашборд аналитики 📈",
      content:
        "Подробные графики, диаграммы и статистика работы фонда. Визуализация ключевых метрик в реальном времени.",
      position: "bottom",
      requireTab: "data",
    },
    {
      target: '.nav-card[data-route="broadcasts"]',
      title: "Прямые эфиры 📡",
      content:
        "Видеозаписи вебинаров, аналитических обзоров и образовательных стримов от команды MC Recovery.",
      position: "bottom",
      requireTab: "data",
    },
    {
      target: '.nav-card[data-route="announcements"]',
      title: "Объявления и анонсы 📢",
      content:
        "Важные новости, обновления платформы и информация о предстоящих событиях.",
      position: "bottom",
      requireTab: "data",
    },
    {
      target: '.nav-card[data-route="documents"]',
      title: "Официальные документы 📄",
      content:
        "Презентации, отчеты, регламенты и другие важные документы фонда в удобном формате.",
      position: "bottom",
      requireTab: "data",
    },

    // === ВКЛАДКА ПРОФИЛЬ ===
    {
      target: '[data-tab="more"]',
      title: 'Вкладка "Профиль" 👤',
      content:
        "Ваш прогресс, достижения, настройки и дополнительные ресурсы. Всё для управления аккаунтом в одном месте!",
      position: "top",
      autoClick: true,
    },
    {
      target: '.progress-stat-card',
      title: "Карточка прогресса 🏆",
      content:
        "Отслеживайте свои успехи: пройденные квизы, идеальные результаты, дни подряд и полученные достижения.",
      position: "bottom",
      requireTab: "more",
    },
    {
      target: 'button[data-route="my-progress"]',
      title: "Детальная статистика 📊",
      content:
        "Нажмите сюда для просмотра полной статистики по квизам, изученным материалам и общей активности.",
      position: "top",
      requireTab: "more",
    },
    {
      target: '.nav-card[data-route="instructions"]',
      title: "Пошаговые инструкции 📖",
      content:
        "Подробные руководства по работе с платформой, настройке учетной записи и использованию всех функций.",
      position: "top",
      requireTab: "more",
    },
    {
      target: '.nav-card[data-route="support"]',
      title: "Служба поддержки 💬",
      content:
        "Контакты для связи с командой, форма обратной связи и информация о технической поддержке.",
      position: "top",
      requireTab: "more",
    },
    {
      target: 'button[data-action="restartOnboarding"]',
      title: "Перезапуск обучения 🎯",
      content:
        "Хотите пройти этот тур заново? Нажмите сюда чтобы перезапустить обучающий тур в любой момент.",
      position: "top",
      requireTab: "more",
    },
    {
      target: "#resetDataBtn",
      title: "Сброс данных приложения 🗑️",
      content:
        "Если нужно начать заново, нажмите эту кнопку. Все данные будут удалены с двойным подтверждением.",
      position: "top",
      requireTab: "more",
    },

    // === ФИНАЛЬНЫЙ ШАГ ===
    {
      target: '[data-tab="home"]',
      title: "Готово! Начинайте обучение 🎉",
      content:
        "Вы познакомились со всеми разделами платформы. Начните с квизов, изучите материалы и отслеживайте свой прогресс. Удачи в обучении!",
      position: "top",
      autoClick: true,
    },
  ];

  // ==========================================
  // State Management
  // ==========================================

  class OnboardingState {
    constructor() {
      this.currentStep = 0;
      this.isActive = false;
      this.isPaused = false;
      this.isTransitioning = false; // Флаг для предотвращения множественных кликов
      this.elements = {};
    }

    reset() {
      this.currentStep = 0;
      this.isPaused = false;
    }

    hasSeenOnboarding() {
      try {
        return localStorage.getItem(CONFIG.localStorageKey) === "true";
      } catch (e) {
        return false;
      }
    }

    markAsSeenOnboarding() {
      try {
        localStorage.setItem(CONFIG.localStorageKey, "true");
      } catch (e) {
        // Silent fail for localStorage
      }
    }

    resetOnboardingState() {
      try {
        localStorage.removeItem(CONFIG.localStorageKey);
      } catch (e) {
        // Silent fail for localStorage
      }
    }
  }

  // ==========================================
  // DOM Elements Creator
  // ==========================================

  class OnboardingUI {
    constructor(state) {
      this.state = state;
      this.boundHandlers = {};
    }

    createElements() {
      // Overlay
      const overlay = document.createElement("div");
      overlay.className = "onboarding-overlay";
      overlay.setAttribute("aria-hidden", "true");

      // Blur overlay with cutout
      const blurOverlay = document.createElement("div");
      blurOverlay.className = "onboarding-blur-overlay";
      blurOverlay.setAttribute("aria-hidden", "true");

      // Highlight box
      const highlight = document.createElement("div");
      highlight.className = "onboarding-highlight";
      highlight.setAttribute("aria-hidden", "true");

      // Progress bar
      const progress = document.createElement("div");
      progress.className = "onboarding-progress";
      progress.setAttribute("role", "progressbar");
      progress.setAttribute("aria-valuemin", "0");
      progress.setAttribute("aria-valuemax", TOUR_STEPS.length);
      progress.innerHTML = '<div class="onboarding-progress-bar"></div>';

      // Tooltip
      const tooltip = document.createElement("div");
      tooltip.className = "onboarding-tooltip";
      tooltip.setAttribute("role", "dialog");
      tooltip.setAttribute("aria-live", "polite");
      tooltip.innerHTML = `
        <div class="onboarding-tooltip-header">
          <h3 class="onboarding-tooltip-title"></h3>
          <span class="onboarding-tooltip-step"></span>
        </div>
        <div class="onboarding-tooltip-content"></div>
        <div class="onboarding-tooltip-actions">
          <button class="onboarding-btn onboarding-btn-secondary" data-action="skip">
            Пропустить
          </button>
          <button class="onboarding-btn onboarding-btn-primary" data-action="next">
            Далее
          </button>
        </div>
      `;

      // Manual trigger button
      const trigger = document.createElement("button");
      trigger.className = "onboarding-trigger";
      trigger.setAttribute("aria-label", "Запустить обучение");
      trigger.setAttribute("title", "Пройти обучение заново");
      trigger.innerHTML = "?";

      this.state.elements = {
        overlay,
        blurOverlay,
        highlight,
        progress,
        tooltip,
        trigger,
      };

      return this.state.elements;
    }

    appendToDOM() {
      const { overlay, blurOverlay, highlight, progress, tooltip } =
        this.state.elements;
      document.body.appendChild(overlay);
      document.body.appendChild(blurOverlay);
      document.body.appendChild(highlight);
      document.body.appendChild(progress);
      document.body.appendChild(tooltip);
      
      // Trigger button removed - use "Пройти тур заново" in Profile instead
    }

    removeFromDOM() {
      Object.values(this.state.elements).forEach((el) => {
        if (el && el.parentNode) {
          el.parentNode.removeChild(el);
        }
      });
    }

    updateProgress(step) {
      const { progress } = this.state.elements;
      const progressBar = progress.querySelector(".onboarding-progress-bar");
      const percent = ((step + 1) / TOUR_STEPS.length) * 100;
      progressBar.style.width = `${percent}%`;
      progress.setAttribute("aria-valuenow", step + 1);
    }

    showTriggerButton() {
      const { trigger } = this.state.elements;
      if (!trigger) {
        console.error("[Onboarding] Critical: Trigger button element not found");
        return;
      }
      setTimeout(() => {
        trigger.classList.add("visible");
      }, 500);
    }

    hideTriggerButton() {
      const { trigger } = this.state.elements;
      trigger.classList.remove("visible");
    }
  }

  // ==========================================
  // Positioning Logic
  // ==========================================

  class PositionCalculator {
    static getElementPosition(element) {
      if (!element) return null;

      const rect = element.getBoundingClientRect();
      const scrollY = window.scrollY || window.pageYOffset || 0;
      const scrollX = window.scrollX || window.pageXOffset || 0;

      return {
        top: rect.top + scrollY,
        left: rect.left + scrollX,
        width: rect.width,
        height: rect.height,
        rect,
      };
    }

    static isElementInViewport(rect) {
      if (!rect || !window) return false;

      const viewportHeight = window.innerHeight || 0;
      const viewportWidth = window.innerWidth || 0;

      // Учитываем размер tab-bar (обычно 60-70px)
      const tabBarHeight = 80;
      const topOffset = 80;
      const bottomOffset = tabBarHeight + 20;

      return (
        rect.top >= topOffset &&
        rect.left >= 20 &&
        rect.bottom <= viewportHeight - bottomOffset &&
        rect.right <= viewportWidth - 20
      );
    }

    static scrollToElement(element, callback) {
      if (!element) {
        if (callback) callback();
        return;
      }

      const rect = element.getBoundingClientRect();

      // Проверяем, является ли элемент fixed (например, tab-bar или topbar)
      const computedStyle = window.getComputedStyle(element);
      const isFixed =
        computedStyle.position === "fixed" ||
        computedStyle.position === "sticky";

      // Для fixed элементов не скроллим, они всегда видны
      if (isFixed) {
        if (callback) callback();
        return;
      }

      if (!this.isElementInViewport(rect)) {
        const scrollY = window.scrollY || window.pageYOffset || 0;
        const elementTop = rect.top + scrollY;
        const elementHeight = rect.height || 0;
        const viewportHeight = window.innerHeight || 0;

        // Учитываем tab-bar внизу и topbar вверху (Telegram Mini App)
        const tabBarHeight = 80;
        const topBarHeight = 60;

        // Центрируем элемент с учетом tab-bar
        const offset =
          (viewportHeight - tabBarHeight - elementHeight) / 3 + topBarHeight;
        const targetScroll = elementTop - offset;

        try {
          window.scrollTo({
            top: Math.max(0, targetScroll),
            behavior: "smooth",
          });
        } catch (e) {
          // Фоллбэк для старых браузеров
          window.scrollTo(0, Math.max(0, targetScroll));
        }

        setTimeout(() => {
          if (callback) callback();
        }, 500);
      } else {
        if (callback) callback();
      }
    }

    static calculateTooltipPosition(targetRect, tooltip, preferredPosition) {
      if (!targetRect || !tooltip) {
        return {
          position: { top: null, left: null },
          finalPosition: preferredPosition || "bottom",
        };
      }

      const tooltipRect = tooltip.getBoundingClientRect();
      const viewportHeight = window.innerHeight || 0;
      const viewportWidth = window.innerWidth || 0;

      let tooltipHeight = tooltipRect.height || 300;
      const tooltipWidth = Math.min(360, viewportWidth - 32); // max-width с отступами

      const targetTop = targetRect.top || 0;
      const targetBottom = targetRect.bottom || 0;
      const targetLeft = targetRect.left || 0;
      const targetRight = targetRect.right || 0;
      const targetHeight = targetRect.height || 0;

      // Для элементов внизу экрана используем меньшую высоту тултипа если нужно
      if (targetBottom > viewportHeight * 0.7) {
        const maxTooltipHeight = viewportHeight * 0.5; // Максимум 50% высоты экрана
        tooltipHeight = Math.min(tooltipHeight, maxTooltipHeight);
      }

      // Динамический gap - больше для элементов внизу экрана (tab-bar, и т.д.)
      const isBottomElement = targetBottom > viewportHeight * 0.6;
      const gap = isBottomElement ? 32 : 24; // Увеличенный отступ для элементов внизу
      const padding = 16; // Отступ от краев экрана

      let top = null;
      let left = null;
      let finalPosition = preferredPosition || "bottom";

      // Рассчитываем центр по горизонтали
      const targetCenterX = (targetLeft + targetRight) / 2;
      left = Math.max(
        padding,
        Math.min(
          viewportWidth - tooltipWidth - padding,
          targetCenterX - tooltipWidth / 2
        )
      );

      // Рассчитываем позицию по вертикали
      const spaceAbove = targetTop;
      const spaceBelow = viewportHeight - targetBottom;

      // Проверяем, где больше места
      if (
        preferredPosition === "top" ||
        (preferredPosition === "auto" && spaceAbove > spaceBelow)
      ) {
        // Позиция сверху
        if (spaceAbove >= tooltipHeight + gap + padding) {
          top = targetTop - tooltipHeight - gap;
          finalPosition = "top";
        } else {
          // Недостаточно места сверху, пробуем снизу
          top = targetBottom + gap;
          finalPosition = "bottom";
        }
      } else {
        // Позиция снизу
        if (spaceBelow >= tooltipHeight + gap + padding) {
          top = targetBottom + gap;
          finalPosition = "bottom";
        } else {
          // Недостаточно места снизу, пробуем сверху
          top = targetTop - tooltipHeight - gap;
          finalPosition = "top";
        }
      }

      // Убедимся что тултип не выходит за пределы экрана
      // Для элементов внизу экрана (например, tab-bar) - размещаем тултип так, чтобы элемент был виден
      if (finalPosition === "top" && targetBottom > viewportHeight * 0.6) {
        // Элемент в нижней части экрана - размещаем тултип максимально высоко
        // оставляя место для видимости самого элемента
        const minSpaceForElement = targetHeight + gap + 40; // Увеличен отступ для лучшей видимости
        const maxTooltipTop = targetTop - tooltipHeight - gap;

        // Проверяем, помещается ли тултип выше элемента
        if (maxTooltipTop >= padding) {
          top = maxTooltipTop;
        } else {
          // Если не помещается - размещаем как можно выше, но элемент должен быть виден
          top = Math.min(
            padding,
            viewportHeight - tooltipHeight - minSpaceForElement
          );
        }
      } else {
        top = Math.max(
          padding,
          Math.min(viewportHeight - tooltipHeight - padding, top)
        );
      }

      return {
        position: { top, left },
        finalPosition,
      };
    }

    static positionHighlight(targetRect, highlight) {
      if (!targetRect || !highlight) return;

      const pad = CONFIG.highlightPadding;
      const left = targetRect.left || 0;
      const top = targetRect.top || 0;
      const width = targetRect.width || 0;
      const height = targetRect.height || 0;

      // Use transform for better performance
      highlight.style.transform = `translate(${left - pad}px, ${top - pad}px)`;
      highlight.style.width = `${width + pad * 2}px`;
      highlight.style.height = `${height + pad * 2}px`;
      highlight.style.display = "block";
      highlight.style.opacity = "1";
    }

    static updateOverlayCutout(targetRect, blurOverlay) {
      if (!targetRect || !blurOverlay) return;

      const p = CONFIG.highlightPadding;
      const left = targetRect.left || 0;
      const right = targetRect.right || 0;
      const top = targetRect.top || 0;
      const bottom = targetRect.bottom || 0;

      // Simplified clip-path for better performance
      const cutoutPath = `polygon(0 0,0 100%,${left - p}px 100%,${left - p}px ${
        top - p
      }px,${right + p}px ${top - p}px,${right + p}px ${bottom + p}px,${
        left - p
      }px ${bottom + p}px,${left - p}px 100%,100% 100%,100% 0)`;
      blurOverlay.style.clipPath = cutoutPath;
    }

    static clearOverlayCutout(blurOverlay) {
      if (!blurOverlay) return;
      blurOverlay.style.clipPath = "";
      blurOverlay.style.webkitClipPath = "";
    }
  }

  // ==========================================
  // Main Onboarding Controller
  // ==========================================

  class OnboardingTour {
    constructor() {
      this.state = new OnboardingState();
      this.ui = new OnboardingUI(this.state);
      this.resizeDebounceTimer = null;
      this.clickDebounceTimer = null;

      this.boundHandlers = {
        resize: this.debounce(
          this.handleResize.bind(this),
          CONFIG.debounceDelay
        ),
        keydown: this.handleKeydown.bind(this),
        triggerClick: this.debounce(
          this.handleTriggerClick.bind(this),
          CONFIG.debounceDelay
        ),
        nextClick: this.handleNextClick.bind(this),
        skipClick: this.handleSkipClick.bind(this),
        overlayClick: this.handleOverlayClick.bind(this),
      };
    }

    // Initialization
    init() {
      // Create DOM elements
      this.ui.createElements();
      this.ui.appendToDOM();

      // Attach event listeners
      this.attachEventListeners();

      // Check if should auto-start
      const hasSeenOnboarding = this.state.hasSeenOnboarding();

      if (!hasSeenOnboarding) {
        // Wait for app to be ready
        this.waitForAppReady(() => {
          setTimeout(() => this.start(), TIMING_CONFIG.onboardingStepDelay);
        });
      } else {
        // Показываем кнопку для повторного запуска
        this.ui.showTriggerButton();

        // Дополнительная проверка на случай если кнопка не показалась
        setTimeout(() => {
          const { trigger } = this.state.elements;
          if (trigger && !trigger.classList.contains("visible")) {
            trigger.classList.add("visible");
          }
        }, TIMING_CONFIG.triggerButtonDelay);
      }
    }

    waitForAppReady(callback) {
      // Wait for critical data to load
      if (window.APP_DATA_READY) {
        callback();
        return;
      }

      // Listen for ready event
      const onReady = () => {
        clearTimeout(timeout);
        callback();
      };

      document.addEventListener("app-data-ready", onReady, { once: true });

      // Timeout fallback
      const timeout = setTimeout(() => {
        document.removeEventListener("app-data-ready", onReady);
        callback();
      }, 3000);
    }

    attachEventListeners() {
      const { trigger, tooltip, overlay, blurOverlay } = this.state.elements;

      // Passive слушатели для лучшей производительности где возможно
      window.addEventListener("resize", this.boundHandlers.resize, {
        passive: true,
      });
      document.addEventListener("keydown", this.boundHandlers.keydown);
      trigger.addEventListener("click", this.boundHandlers.triggerClick);

      const nextBtn = tooltip.querySelector('[data-action="next"]');
      const skipBtn = tooltip.querySelector('[data-action="skip"]');

      // Оптимизируем клики на кнопках - используем passive где можем
      nextBtn.addEventListener("click", this.boundHandlers.nextClick);
      skipBtn.addEventListener("click", this.boundHandlers.skipClick);
      overlay.addEventListener("click", this.boundHandlers.overlayClick, {
        passive: true,
      });
      blurOverlay.addEventListener("click", this.boundHandlers.overlayClick, {
        passive: true,
      });
    }

    detachEventListeners() {
      const { trigger, tooltip, overlay, blurOverlay } = this.state.elements;

      window.removeEventListener("resize", this.boundHandlers.resize);
      document.removeEventListener("keydown", this.boundHandlers.keydown);
      trigger.removeEventListener("click", this.boundHandlers.triggerClick);

      const nextBtn = tooltip.querySelector('[data-action="next"]');
      const skipBtn = tooltip.querySelector('[data-action="skip"]');

      if (nextBtn)
        nextBtn.removeEventListener("click", this.boundHandlers.nextClick);
      if (skipBtn)
        skipBtn.removeEventListener("click", this.boundHandlers.skipClick);
      overlay.removeEventListener("click", this.boundHandlers.overlayClick);
      if (blurOverlay)
        blurOverlay.removeEventListener(
          "click",
          this.boundHandlers.overlayClick
        );
    }

    // Tour Control
    start() {
      if (this.state.isActive) {
        return;
      }

      try {
        this.state.isActive = true;
        this.state.reset();
        this.ui.hideTriggerButton();

        const { overlay, blurOverlay, progress } = this.state.elements;

        if (!overlay || !blurOverlay || !progress) {
          console.error("Onboarding elements not found");
          return;
        }

        // Show overlay and progress
        setTimeout(() => {
          overlay.classList.add("active");
          blurOverlay.classList.add("active");
        }, 10);
        progress.style.display = "block";

        this.showStep(0);
      } catch (e) {
        console.error("Failed to start onboarding:", e);
        this.state.isActive = false;
      }
    }

    stop(markAsSeen = true) {
      if (!this.state.isActive) return;

      this.state.isActive = false;
      const { overlay, blurOverlay, highlight, tooltip, progress } =
        this.state.elements;

      // Hide all elements
      overlay.classList.remove("active");
      blurOverlay.classList.remove("active");
      tooltip.classList.remove("active");
      progress.style.display = "none";

      // Clear overlay cutout
      PositionCalculator.clearOverlayCutout(blurOverlay);

      // Hide and reset highlight box completely
      highlight.style.top = "-9999px";
      highlight.style.left = "-9999px";
      highlight.style.width = "0";
      highlight.style.height = "0";
      highlight.style.opacity = "0";

      // Remove highlight class from target and force reflow
      const currentTarget = document.querySelector(".onboarding-target");
      if (currentTarget) {
        currentTarget.classList.remove("onboarding-target");
        // Сбрасываем z-index для fixed элементов
        const computedStyle = window.getComputedStyle(currentTarget);
        if (
          computedStyle.position === "fixed" ||
          computedStyle.position === "sticky"
        ) {
          currentTarget.style.zIndex = "";
        }
        // Force a reflow to ensure styles are cleared immediately
        void currentTarget.offsetHeight;
        // Clear any remaining inline styles as backup
        currentTarget.style.cssText = currentTarget.style.cssText.replace(
          /position|z-index|filter|transform/gi,
          ""
        );
      }

      if (markAsSeen) {
        this.state.markAsSeenOnboarding();
      }

      setTimeout(() => {
        this.ui.showTriggerButton();
      }, CONFIG.animationDuration);
    }

    showStep(stepIndex) {
      if (stepIndex >= TOUR_STEPS.length) {
        this.stop();
        return;
      }

      const step = TOUR_STEPS[stepIndex];

      // Используем requestAnimationFrame для оптимизации
      requestAnimationFrame(() => {
        // Автоматическое переключение вкладки если требуется
        if (step.requireTab) {
          this.switchToTab(step.requireTab, () => {
            this.continueShowStep(stepIndex, step);
          });
        } else {
          this.continueShowStep(stepIndex, step);
        }
      });
    }

    switchToTab(tabName, callback) {
      try {
        // Проверяем, существует ли функция switchTab в глобальном контексте
        if (typeof window.switchTab === "function") {
          window.switchTab(tabName);
          // Оптимизированная задержка для загрузки компонентов
          setTimeout(callback, TIMING_CONFIG.onboardingStepDelay);
        } else {
          // Если функции нет, кликаем на таб напрямую
          const tabElement = document.querySelector(`[data-tab="${tabName}"]`);
          if (tabElement) {
            tabElement.click();
            setTimeout(callback, TIMING_CONFIG.onboardingStepDelay);
          } else {
            callback();
          }
        }
      } catch (e) {
        callback();
      }
    }

    continueShowStep(stepIndex, step, retryCount = 0) {
      const targetElement = document.querySelector(step.target);

      if (!targetElement) {
        // Попытаемся найти элемент еще раз (максимум 3 попытки с задержкой)
        const maxRetries = TIMING_CONFIG.onboardingMaxRetries;
        const retryDelay = TIMING_CONFIG.onboardingRetryDelay;

        if (retryCount < maxRetries) {
          // Retry logic: waiting for element to appear
          setTimeout(() => {
            this.continueShowStep(stepIndex, step, retryCount + 1);
          }, retryDelay);
          return;
        }

        // Элемент не найден после всех попыток - пропускаем шаг
        // Skip to next step
        this.state.currentStep = stepIndex + 1;
        this.showStep(stepIndex + 1);
        return;
      }

      this.state.currentStep = stepIndex;

      // Батчим все DOM операции в один requestAnimationFrame
      requestAnimationFrame(() => {
        // Update progress
        this.ui.updateProgress(stepIndex);

        // Remove highlight class from target and force reflow
        const prevTarget = document.querySelector(".onboarding-target");
        if (prevTarget) {
          prevTarget.classList.remove("onboarding-target");
          // Сбрасываем z-index для fixed элементов
          const computedStyle = window.getComputedStyle(prevTarget);
          if (
            computedStyle.position === "fixed" ||
            computedStyle.position === "sticky"
          ) {
            prevTarget.style.zIndex = "";
          }
          // Force reflow to clear styles immediately
          void prevTarget.offsetHeight;
        }

        // Автоматический скролл к элементу если он вне экрана
        PositionCalculator.scrollToElement(targetElement, () => {
          // После скролла продолжаем показ шага
          this.finalizeStepDisplay(targetElement, step, stepIndex);
        });
      });
    }

    finalizeStepDisplay(targetElement, step, stepIndex) {
      if (!targetElement || !step) return;

      // Highlight current target
      targetElement.classList.add("onboarding-target");

      // Для fixed элементов (например tab-bar, topbar) поднимаем z-index
      // НО НЕ меняем position - оставляем fixed как есть (через CSS)
      const computedStyle = window.getComputedStyle(targetElement);
      if (
        computedStyle.position === "fixed" ||
        computedStyle.position === "sticky"
      ) {
        targetElement.style.zIndex = "10000";
        // ВАЖНО: не меняем position, CSS правила справятся
      }

      // Position highlight
      const targetPos = PositionCalculator.getElementPosition(targetElement);

      if (!targetPos || !targetPos.rect) {
        return;
      }

      PositionCalculator.positionHighlight(
        targetPos.rect,
        this.state.elements.highlight
      );

      // Создаем вырез в blur overlay для четкой видимости элемента
      PositionCalculator.updateOverlayCutout(
        targetPos.rect,
        this.state.elements.blurOverlay
      );

      // Update tooltip content
      this.updateTooltipContent(step, stepIndex);

      // Position tooltip
      this.positionTooltip(targetPos.rect, step.position);

      // Show tooltip
      const { tooltip } = this.state.elements;
      setTimeout(() => tooltip.classList.add("active"), 50);

      // Focus on tooltip for accessibility
      try {
        tooltip.focus();
      } catch (e) {
        // Ignore focus errors on mobile
      }

      // Автоматический клик на элемент если задано autoClick
      if (step.autoClick && targetElement) {
        setTimeout(() => {
          try {
            targetElement.click();
          } catch (e) {
            // Silent fail for auto-click
          }
        }, 500); // Быстрый автоклик для плавного UX
      }
    }

    updateTooltipContent(step, stepIndex) {
      if (!step) return;

      const { tooltip } = this.state.elements;
      if (!tooltip) return;

      const title = tooltip.querySelector(".onboarding-tooltip-title");
      const content = tooltip.querySelector(".onboarding-tooltip-content");
      const stepIndicator = tooltip.querySelector(".onboarding-tooltip-step");
      const nextBtn = tooltip.querySelector('[data-action="next"]');

      if (title) title.textContent = step.title || "";
      if (content) content.textContent = step.content || "";
      if (stepIndicator) {
        stepIndicator.textContent = `${stepIndex + 1} / ${TOUR_STEPS.length}`;
      }

      // Change button text on last step
      if (nextBtn) {
        if (stepIndex === TOUR_STEPS.length - 1) {
          nextBtn.textContent = "Готово";
        } else {
          nextBtn.textContent = "Далее";
        }
      }
    }

    positionTooltip(targetRect, preferredPosition) {
      if (!targetRect) return;

      const { tooltip } = this.state.elements;
      if (!tooltip) return;

      // Temporarily show to get dimensions
      tooltip.style.visibility = "hidden";
      tooltip.style.display = "block";

      const { position, finalPosition } =
        PositionCalculator.calculateTooltipPosition(
          targetRect,
          tooltip,
          preferredPosition
        );

      // Применяем позиционирование через JavaScript
      if (position.top !== null && position.left !== null) {
        tooltip.style.top = `${position.top}px`;
        tooltip.style.left = `${position.left}px`;
      }

      tooltip.setAttribute("data-position", finalPosition || "bottom");

      // Применяем ограничение высоты для элементов внизу экрана
      const currentTargetRect = PositionCalculator.getElementPosition(
        document.querySelector(".onboarding-target")
      );
      if (
        currentTargetRect &&
        currentTargetRect.rect.bottom > window.innerHeight * 0.7
      ) {
        tooltip.style.maxHeight = `${window.innerHeight * 0.5}px`;
        tooltip.style.overflowY = "auto";
      } else {
        tooltip.style.maxHeight = "";
        tooltip.style.overflowY = "";
      }

      tooltip.style.visibility = "";
      tooltip.style.display = "";
    }

    // Event Handlers
    handleResize() {
      if (!this.state.isActive) return;

      const step = TOUR_STEPS[this.state.currentStep];
      if (!step) return;

      const targetElement = document.querySelector(step.target);

      if (targetElement) {
        const targetPos = PositionCalculator.getElementPosition(targetElement);
        if (targetPos && targetPos.rect) {
          PositionCalculator.positionHighlight(
            targetPos.rect,
            this.state.elements.highlight
          );
          PositionCalculator.updateOverlayCutout(
            targetPos.rect,
            this.state.elements.blurOverlay
          );
          this.positionTooltip(targetPos.rect, step.position);
        }
      }
    }

    handleKeydown(e) {
      if (!this.state.isActive) return;

      if (e.key === "Escape") {
        this.stop();
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        this.handleNextClick();
      }
    }

    handleTriggerClick() {
      this.state.resetOnboardingState();
      this.start();
    }

    handleNextClick() {
      // Предотвращаем множественные клики
      if (this.state.isTransitioning) return;
      this.state.isTransitioning = true;

      const nextStep = this.state.currentStep + 1;

      // Оптимизированная обработка для INP <200ms
      // Используем один RAF вместо цепочки RAF -> RAF -> setTimeout
      this.state.elements.tooltip.classList.remove("active");
      this.state.elements.highlight.style.opacity = "0";

      // Минимальная задержка для CSS transition (150ms)
      setTimeout(() => {
        if (nextStep >= TOUR_STEPS.length) {
          this.stop();
        } else {
          this.state.elements.highlight.style.opacity = "1";
          this.showStep(nextStep);
        }
        this.state.isTransitioning = false;
      }, CONFIG.animationDuration);
    }

    handleSkipClick() {
      // Предотвращаем множественные клики
      if (this.state.isTransitioning) return;
      this.state.isTransitioning = true;

      // Моментальная обработка без RAF для быстрого отклика
      this.stop();
      this.state.isTransitioning = false;
    }

    handleOverlayClick(e) {
      // Close only if clicking directly on overlay, not on highlighted elements
      if (
        e.target === this.state.elements.overlay ||
        e.target === this.state.elements.blurOverlay
      ) {
        this.stop();
      }
    }

    // Utility
    debounce(func, wait) {
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

    // Cleanup
    destroy() {
      this.stop(false);
      this.detachEventListeners();
      this.ui.removeFromDOM();
    }
  }

  // ==========================================
  // Auto-initialization
  // ==========================================

  let tourInstance = null;

  function initOnboarding() {
    if (tourInstance) {
      return;
    }

    try {
      tourInstance = new OnboardingTour();
      tourInstance.init();

      // Expose to window for debugging/manual control
      window.OnboardingTour = tourInstance;

      // Helper functions for debugging
      window.restartOnboarding = function () {
        try {
          localStorage.removeItem(CONFIG.localStorageKey);
          location.reload();
        } catch (e) {
          console.error("Failed to restart onboarding:", e);
        }
      };

      window.forceOnboarding = function () {
        try {
          if (tourInstance) {
            tourInstance.start();
          }
        } catch (e) {
          console.error("Failed to force onboarding:", e);
        }
      };
    } catch (e) {
      console.error("Failed to initialize onboarding:", e);
    }
  }

  // Initialize when DOM is ready (для динамического импорта)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initOnboarding);
  } else {
    // Небольшая задержка для случаев когда модуль загружается после DOMContentLoaded
    setTimeout(initOnboarding, 100);
  }
})();
