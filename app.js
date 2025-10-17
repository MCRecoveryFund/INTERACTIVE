// MC Recovery Fund - Main Application Logic
// Part 1: Core functionality and routing
// ==========================================

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
    <div class="nav-grid">
      <div class="nav-card" onclick="navigate('quizzes')"><div class="nav-card-icon">🎯</div><div class="nav-card-title">Квизы</div></div>
      <div class="nav-card" onclick="navigate('edu')"><div class="nav-card-icon">📊</div><div class="nav-card-title">Инфографика</div></div>
      <div class="nav-card" onclick="navigate('progress')"><div class="nav-card-icon">📈</div><div class="nav-card-title">Мой прогресс</div></div>
      <div class="nav-card" onclick="navigate('achievements')"><div class="nav-card-icon">🏆</div><div class="nav-card-title">Достижения</div></div>
      <div class="nav-card" onclick="navigate('glossary')"><div class="nav-card-icon">📚</div><div class="nav-card-title">Глоссарий</div></div>
      <div class="nav-card" onclick="navigate('simulator')"><div class="nav-card-icon">💼</div><div class="nav-card-title">Симулятор</div></div>
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
          return `<div class="card card-interactive" onclick="navigate('quiz', {id: '${
            quiz.id
          }'})">
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
      <button class="btn btn-primary" onclick="startQuiz('${quizId}')" style="width: 100%;">${
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
            `<div class="quiz-option" data-index="${index}" onclick="selectAnswer(${index})">${option}</div>`
        )
        .join("")}
    </div>
    <div class="quiz-actions">
      <button class="btn btn-ghost" onclick="showHint()">💡 Подсказка</button>
      <button class="btn btn-ghost" onclick="skipQuestion()">⏭️ Пропустить</button>
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
  if (!AppState.userData.completedQuizzes.includes(quiz.id)) {
    AppState.userData.completedQuizzes.push(quiz.id);
    AppState.userData.progress.quizzes++;
  }
  updateStreak();
  checkBadges();
  saveUserData();
  navigate("quiz-result");
}

function checkBadges() {
  const badges = [
    {
      id: "first_quiz",
      condition: () => AppState.userData.completedQuizzes.length >= 1,
    },
    {
      id: "five_quizzes",
      condition: () => AppState.userData.completedQuizzes.length >= 5,
    },
    { id: "streak_7", condition: () => AppState.userData.streak >= 7 },
    { id: "streak_30", condition: () => AppState.userData.streak >= 30 },
  ];
  badges.forEach((badge) => {
    if (
      badge.condition() &&
      !AppState.userData.unlockedBadges.includes(badge.id)
    ) {
      AppState.userData.unlockedBadges.push(badge.id);
    }
  });
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
  }<div class="result-actions"><button class="btn btn-primary" onclick="downloadResult()">📥 Скачать результат</button><button class="btn btn-secondary" onclick="shareResult()">📤 Поделиться</button><button class="btn btn-ghost" onclick="startQuiz('${
    quiz.id
  }')">🔁 Пройти ещё раз</button><button class="btn btn-ghost" onclick="navigate('quizzes')">Все квизы</button></div></div>`;
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
  const quiz = AppState.currentQuiz;
  const correctCount = AppState.quizAnswers.filter((a) => a.correct).length;
  const totalQuestions = quiz.questions.length;
  const percentage = Math.round((correctCount / totalQuestions) * 100);
  const shareText = `Я прошёл квиз "${quiz.title}" в MC Recovery Fund!\n\nРезультат: ${correctCount}/${totalQuestions} (${percentage}%)\n\nПопробуйте и вы!`;
  if (navigator.share) {
    navigator.share({
      title: "MC Recovery Fund - Результат квиза",
      text: shareText,
    });
  } else if (tg) {
    tg.openTelegramLink(
      `https://t.me/share/url?text=${encodeURIComponent(shareText)}`
    );
  } else {
    alert("Функция поделиться недоступна");
  }
}

function renderEdu(container) {
  const topics = window.APP_DATA.edu;
  container.innerHTML = `<h1>Инфографика и видео</h1><p class="caption mb-lg">Интерактивные материалы о финансовых инструментах</p><div class="card-grid">${topics
    .map(
      (topic) =>
        `<div class="collapsible"><div class="collapsible-header" onclick="toggleCollapsible(this)"><span><strong>${
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
            ? `<button class="btn btn-primary" onclick="openVideo('${topic.videoUrl}')">▶️ Смотреть видео</button>`
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
  } бейджей разблокировано</p><button class="btn btn-secondary" onclick="navigate('achievements')" style="width: 100%; margin-top: var(--space-md);">Смотреть все достижения</button></div>`;
}

function renderAchievements(container) {
  const allBadges = [
    {
      id: "first_quiz",
      icon: "🎓",
      name: "Первый шаг",
      desc: "Завершите первый квиз",
      condition: "Пройдите 1 квиз",
    },
    {
      id: "five_quizzes",
      icon: "🏅",
      name: "Знаток",
      desc: "Завершите 5 квизов",
      condition: "Пройдите 5 квизов",
    },
    {
      id: "streak_7",
      icon: "🔥",
      name: "Неделя",
      desc: "Серия 7 дней",
      condition: "Заходите 7 дней подряд",
    },
    {
      id: "streak_30",
      icon: "⭐",
      name: "Месяц",
      desc: "Серия 30 дней",
      condition: "Заходите 30 дней подряд",
    },
    {
      id: "perfect_quiz",
      icon: "💎",
      name: "Перфекционист",
      desc: "Пройдите квиз на 100%",
      condition: "Получите 100% в квизе",
    },
    {
      id: "glossary_master",
      icon: "📚",
      name: "Эрудит",
      desc: "Изучите все термины",
      condition: "Просмотрите весь глоссарий",
    },
  ];
  container.innerHTML = `<h1>Достижения</h1><p class="caption mb-lg">Разблокируйте бейджи, проходя квизы и изучая материалы</p><div class="badge-grid">${allBadges
    .map((badge) => {
      const isUnlocked = AppState.userData.unlockedBadges.includes(badge.id);
      return `<div class="badge-item"><div class="badge ${
        isUnlocked ? "" : "badge-locked"
      }">${badge.icon}</div><div class="badge-name">${
        badge.name
      }</div><div class="badge-desc">${
        isUnlocked ? badge.desc : badge.condition
      }</div></div>`;
    })
    .join("")}</div>`;
}

function renderGlossary(container) {
  const terms = window.APP_DATA.glossary;
  container.innerHTML = `<h1>Глоссарий</h1><p class="caption mb-lg">Основные финансовые термины и определения</p><div class="search-box"><svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg><input type="text" class="search-input" placeholder="Поиск терминов..." oninput="filterGlossary(this.value)"></div><div id="glossaryList" class="list">${terms
    .map(
      (term) =>
        `<div class="list-item" onclick="showTermDetail('${
          term.id
        }')"><div><strong>${
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
        `<div class="list-item" onclick="showTermDetail('${
          term.id
        }')"><div><strong>${
          term.term
        }</strong><p class="caption" style="margin: 0;">${term.definition.substring(
          0,
          80
        )}...</p></div></div>`
    )
    .join("");
}

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
      ? `<button class="btn btn-primary" onclick="openVideo('${term.videoUrl}')">▶️ Смотреть видео</button>`
      : ""
  }<button class="btn btn-ghost" onclick="this.closest('div[style*=fixed]').remove()" style="width:100%;margin-top:var(--space-md);">Закрыть</button></div>`;
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
  }</strong></p></div><div class="card mb-lg"><h3>Настройки</h3><button class="btn btn-ghost" onclick="resetProgress()" style="width: 100%; margin-top: var(--space-md); color: var(--color-error);">Сбросить прогресс</button></div>`;
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

// Initialize app
document.addEventListener("DOMContentLoaded", () => {
  loadUserData();
  initThemeIcons();

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
  navigate(hash);
});
