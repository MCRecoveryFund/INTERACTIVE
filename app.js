// MC Recovery Fund - Main Application Logic
// Part 1: Core functionality and routing
// ==========================================

// Hyperliquid API Configuration
const HYPERLIQUID_API = {
  endpoint: "https://api.hyperliquid.xyz/info",
  vaultAddress: "0x914434e8a235cb608a94a5f70ab8c40927152a24",
};

// Global State
const AppState = {
  currentRoute: "home",
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

function navigate(route, params = {}) {
  hapticFeedback("light");
  AppState.currentRoute = route;
  window.location.hash = route;
  if (tg?.MainButton) tg.MainButton.hide();
  const backBtn = document.getElementById("backBtn");
  backBtn.style.display = route === "home" ? "none" : "flex";
  renderRoute(route, params);
}

function renderRoute(route, params) {
  const content = document.getElementById("content");
  switch (route) {
    case "home":
      renderHome(content);
      break;
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
    case "progress":
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
    default:
      renderHome(content);
  }
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
        <h3>🏦 MC Recovery Vault</h3>
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
        <h3>🏦 MC Recovery Vault</h3>
        <div style="text-align: center; padding: var(--space-lg) 0;">
          <p style="color: var(--color-error);">⚠️ Ошибка загрузки: ${error}</p>
          <button class="btn btn-secondary" data-action="refreshVault" style="margin-top: var(--space-md);">Обновить</button>
        </div>
      </div>
    `;
  }

  if (!positions || !metrics) {
    return `
      <div class="card vault-widget" id="vaultWidget">
        <h3>🏦 MC Recovery Vault</h3>
        <div style="text-align: center; padding: var(--space-lg) 0;">
          <p class="caption">Нет данных</p>
          <button class="btn btn-secondary" data-action="refreshVault" style="margin-top: var(--space-md);">Загрузить данные</button>
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
        <h3>🏦 MC Recovery Vault</h3>
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
          <strong style="font-size: 18px; color: var(--color-primary);">${formatPercent(
            apr
          )}</strong>
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
      
      <div style="margin-top: var(--space-md); text-align: right;">
        <span class="caption" style="font-size: 12px;">Обновлено: ${lastUpdateTime}</span>
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

function renderHome(container) {
  const streak = AppState.userData.streak;
  const completedQuizzes = AppState.userData.completedQuizzes.length;
  container.innerHTML = `
    <div class="hero">
      <h1 class="hero-title">MC Recovery Fund</h1>
      <p class="hero-subtitle">Интерактивный контент</p>
      <p class="hero-description">
        Добро пожаловать в развлекательно-образовательный формат MC Recovery Fund. 
        Проходите квизы, изучайте ключевые термины через интерактив и отслеживайте прогресс обучения.
      </p>
    </div>
    ${
      streak > 0
        ? `<div style="text-align: center; margin: var(--space-lg) 0;">
      <div class="streak"><span class="streak-icon">🔥</span><span>Ваша серия: ${streak} ${getDaysWord(
            streak
          )}</span></div>
    </div>`
        : ""
    }
    ${renderVaultWidget()}
    <div class="nav-grid" style="margin-top: var(--space-xl);">
      <div class="nav-card" data-action="navigate" data-route="instructions"><div class="nav-card-icon">📖</div><div class="nav-card-title">Инструкции</div></div>
      <div class="nav-card" data-action="navigate" data-route="dashboard"><div class="nav-card-icon">📊</div><div class="nav-card-title">Дашборд</div></div>
      <div class="nav-card" data-action="navigate" data-route="broadcasts"><div class="nav-card-icon">📡</div><div class="nav-card-title">Эфиры</div></div>
      <div class="nav-card" data-action="navigate" data-route="announcements"><div class="nav-card-icon">📢</div><div class="nav-card-title">Анонсы</div></div>
      <div class="nav-card" data-action="navigate" data-route="documents"><div class="nav-card-icon">📄</div><div class="nav-card-title">Документы</div></div>
      <div class="nav-card" data-action="navigate" data-route="faq"><div class="nav-card-icon">❓</div><div class="nav-card-title">FAQ</div></div>
      <div class="nav-card" data-action="navigate" data-route="quizzes"><div class="nav-card-icon">🎯</div><div class="nav-card-title">Квизы</div></div>
      <div class="nav-card" data-action="navigate" data-route="edu"><div class="nav-card-icon">🎓</div><div class="nav-card-title">Инфографика</div></div>
      <div class="nav-card" data-action="navigate" data-route="glossary"><div class="nav-card-icon">📚</div><div class="nav-card-title">Глоссарий</div></div>
      <div class="nav-card" data-action="navigate" data-route="progress"><div class="nav-card-icon">📈</div><div class="nav-card-title">Мой прогресс</div></div>
      <div class="nav-card" data-action="navigate" data-route="achievements"><div class="nav-card-icon">🏆</div><div class="nav-card-title">Достижения</div></div>
      <div class="nav-card" data-action="navigate" data-route="support"><div class="nav-card-icon">💬</div><div class="nav-card-title">Поддержка</div></div>
    </div>
    <div class="preview-cards">
      <div class="preview-card"><div class="preview-label">Ваш прогресс</div><p><strong>${completedQuizzes}</strong> завершённых квизов</p><p><strong>${
    AppState.userData.progress.glossaryViewed
  }</strong> изученных терминов</p></div>
      <div class="preview-card"><div class="preview-label">Тема дня</div><p><strong>Диверсификация портфеля</strong></p><p class="caption">Изучите, как правильно распределять активы</p></div>
    </div>
    <div class="footer"><p class="disclaimer">Материалы носят образовательный характер и не являются инвестиционной рекомендацией. Перед принятием финансовых решений проконсультируйтесь со специалистом.</p><p class="caption">Версия 1.0.0</p> <p class="caption">©Copyright 2025 MC Recovery Fund — designed &amp; developed by the MC
        Recovery Fund team.</p></div>
  `;
}

function renderQuizzes(container) {
  const quizzes = window.APP_DATA.quizzes;
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
            quiz.id
          }">
          <div style="display: flex; justify-content: space-between; align-items: start;">
            <h3>${quiz.title}</h3>${
            isCompleted ? '<span style="font-size: 24px;">✓</span>' : ""
          }
          </div>
          <p class="caption mb-md">${quiz.description}</p>
          <div style="display: flex; gap: var(--space-md); flex-wrap: wrap;">
            <span class="caption">📝 ${quiz.questions.length} вопросов</span>
            <span class="caption">⏱️ ~${quiz.duration} мин</span>
            <span class="caption" style="color: ${getDifficultyColor(
              quiz.difficulty
            )}">${getDifficultyLabel(quiz.difficulty)}</span>
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
      ${question.options
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
  const isCorrect = AppState.selectedAnswer === question.correct;
  const options = document.querySelectorAll(".quiz-option");
  options[AppState.selectedAnswer].classList.remove("card-selected");
  if (isCorrect) {
    options[AppState.selectedAnswer].classList.add("card-correct");
    hapticFeedback("success");
  } else {
    options[AppState.selectedAnswer].classList.add("card-incorrect");
    options[question.correct].classList.add("card-correct");
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

function renderEdu(container) {
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

function renderGlossary(container) {
  const terms = window.APP_DATA.glossary;
  container.innerHTML = `<h1>Глоссарий</h1><p class="caption mb-lg">Основные финансовые термины и определения</p><div class="search-box"><svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg><input type="text" class="search-input" placeholder="Поиск терминов..." oninput="filterGlossary(this.value)"></div><div id="glossaryList" class="list">${terms
    .map(
      (term) =>
        `<div class="list-item" data-action="showTermDetail" data-term-id="${
          term.id
        }"><div><strong>${
          term.term
        }</strong><p class="caption" style="margin: 0;">${term.definition.substring(
          0,
          80
        )}...</p></div></div>`
    )
    .join("")}</div>`;
}

function filterGlossary(query) {
  const terms = window.APP_DATA.glossary;
  const filtered = terms.filter(
    (t) =>
      t.term.toLowerCase().includes(query.toLowerCase()) ||
      t.definition.toLowerCase().includes(query.toLowerCase())
  );
  const list = document.getElementById("glossaryList");
  list.innerHTML = filtered
    .map(
      (term) =>
        `<div class="list-item" data-action="showTermDetail" data-term-id="${
          term.id
        }"><div><strong>${
          term.term
        }</strong><p class="caption" style="margin: 0;">${term.definition.substring(
          0,
          80
        )}...</p></div></div>`
    )
    .join("");
}

// Debounced version of filterGlossary for better performance
const debouncedFilterGlossary = debounce(filterGlossary, 300);

function showTermDetail(termId) {
  hapticFeedback("light");
  const term = window.APP_DATA.glossary.find((t) => t.id === termId);
  if (!term) return;
  if (!AppState.userData.progress.glossaryViewed)
    AppState.userData.progress.glossaryViewed = 0;
  if (!AppState.userData.viewedTerms) AppState.userData.viewedTerms = [];
  if (!AppState.userData.viewedTerms.includes(termId)) {
    AppState.userData.viewedTerms.push(termId);
    AppState.userData.progress.glossaryViewed++;
    saveUserData();
  }
  const modal = document.createElement("div");
  modal.style.cssText =
    "position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000;padding:20px;";
  modal.innerHTML = `<div class="card" style="max-width:500px;max-height:80vh;overflow-y:auto;"><h2>${
    term.term
  }</h2><p>${term.definition}</p>${
    term.videoUrl
      ? `<button class="btn btn-primary" data-action="openVideo" data-url="${term.videoUrl}">▶️ Смотреть видео</button>`
      : ""
  }<button class="btn btn-ghost" data-action="closeModal" style="width:100%;margin-top:var(--space-md);">Закрыть</button></div>`;
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };
  document.body.appendChild(modal);
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

function renderInstructions(container) {
  const data = window.APP_DATA.instructions;
  if (!data || !data.groups) {
    container.innerHTML = `<div class="card"><p>Загрузка данных...</p></div>`;
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

function renderAnnouncements(container) {
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
          const date = new Date(announcement.date);
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
                announcement.icon
              }</div>
              <div style="flex: 1;">
                <div class="caption" style="color: var(--color-primary); font-weight: 600; margin-bottom: var(--space-xs);">
                  ${dateStr}, ${announcement.time} ${announcement.timezone}
                </div>
                <h3 style="margin-bottom: var(--space-sm);">${
                  announcement.title
                }</h3>
              </div>
            </div>
            <p>${announcement.description}</p>
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

function renderBroadcasts(container) {
  const data = window.APP_DATA.broadcasts;
  if (!data || !data.schedule) {
    container.innerHTML = `<div class="card"><p>Загрузка данных...</p></div>`;
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
            const date = new Date(broadcast.date);
            const dateStr = date.toLocaleDateString("ru-RU", {
              day: "numeric",
              month: "long",
            });

            return `
            <div class="card" style="border: 2px solid var(--color-primary);">
              <div class="preview-label" style="color: var(--color-primary);">
                ${broadcast.day}, ${dateStr} • ${broadcast.time} ${broadcast.timezone}
              </div>
              <h3>${broadcast.title}</h3>
              <p class="caption">${broadcast.description}</p>
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
          const date = new Date(broadcast.date);
          const dateStr = date.toLocaleDateString("ru-RU", {
            day: "numeric",
            month: "long",
          });

          return `
          <div class="list-item">
            <div style="flex: 1;">
              <div class="caption" style="margin-bottom: var(--space-xs);">
                ${broadcast.day}, ${dateStr} • ${broadcast.time} ${
            broadcast.timezone
          }
              </div>
              <strong>${broadcast.title}</strong>
              <p class="caption" style="margin: var(--space-xs) 0 0 0;">${
                broadcast.description
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

function renderSupport(container) {
  const data = window.APP_DATA.support;
  if (!data || !data.channels) {
    container.innerHTML = `<div class="card"><p>Загрузка данных...</p></div>`;
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

function renderDocuments(container) {
  const documents = window.APP_DATA.documents || [];

  container.innerHTML = `
    <h1>Документы</h1>
    <p class="caption mb-lg">Официальные документы и материалы</p>
    
    <div class="card-grid">
      ${documents
        .map(
          (doc) => `
        <div class="card card-interactive" data-action="openLink" data-url="${
          doc.url
        }">
          <div style="display: flex; align-items: start; gap: var(--space-md);">
            <div style="font-size: 40px; line-height: 1;">${doc.icon}</div>
            <div style="flex: 1;">
              <h3 style="margin-bottom: var(--space-sm);">${doc.title}</h3>
              <p class="caption">${doc.description}</p>
              <div style="margin-top: var(--space-md);">
                <span class="caption" style="color: var(--color-primary); font-weight: 600;">
                  ${doc.type.toUpperCase()} документ →
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

function renderFAQ(container) {
  const data = window.APP_DATA.faq;
  if (!data || !data.url) {
    container.innerHTML = `<div class="card"><p>Загрузка данных...</p></div>`;
    return;
  }

  container.innerHTML = `
    <h1>${data.title}</h1>
    <p class="caption mb-lg">${data.description}</p>
    
    <div class="card" style="text-align: center; padding: var(--space-xl);">
      <div style="font-size: 64px; margin-bottom: var(--space-lg);">❓</div>
      <h2 style="margin-bottom: var(--space-md);">Часто задаваемые вопросы</h2>
      <p class="caption mb-lg">Найдите ответы на популярные вопросы о работе фонда, инвестициях и платформе</p>
      
      <button class="btn btn-primary" data-action="openLink" data-url="${data.url}" style="margin-top: var(--space-lg);">
        📖 Открыть FAQ
      </button>
    </div>
    
    <div class="card mt-lg">
      <h3>Не нашли ответ?</h3>
      <p class="caption mb-md">Обратитесь в службу поддержки — мы поможем разобраться</p>
      <button class="btn btn-secondary" data-action="navigate" data-route="support" style="width: 100%;">
        💬 Связаться с поддержкой
      </button>
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
  loadUserData();
  initThemeIcons();

  // Load Vault data on startup
  loadVaultData().catch((err) => {
    console.error("Failed to load initial vault data:", err);
  });

  // Hide skeleton after initialization
  setTimeout(() => {
    const skeleton = document.getElementById("skeleton");
    if (skeleton && window.APP_DATA.quizzes.length > 0) {
      skeleton.style.display = "none";
    }
  }, 500);

  // Theme toggle
  const themeToggle = document.getElementById("themeToggle");
  if (themeToggle) {
    themeToggle.onclick = toggleTheme;
  }

  // Back button
  document.getElementById("backBtn").onclick = () => {
    if (AppState.currentRoute.startsWith("quiz-")) {
      navigate("quizzes");
    } else {
      navigate("home");
    }
  };

  const hash = window.location.hash.substring(1) || "home";

  // Wait for vault data to load before initial navigation
  setTimeout(() => {
    navigate(hash);
  }, 300);

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
