/**
 * MC Recovery Fund - Quiz Component
 * Full quiz functionality
 */

import { AppState } from '../core/state.js';
import { ensureDataLoaded } from '../utils/performance.js';
import { getDifficultyLabel, shuffleArray } from '../utils/helpers.js';
import { hapticFeedback, tg } from '../modules/telegram.js';
import { navigate } from '../modules/navigation.js';
import { saveUserData, updateStreak } from '../modules/storage.js';
import { initLazyList } from '../utils/lazy-render.js';

export async function renderQuizzes(container) {
  // Ensure quizzes data is loaded с логированием производительности
  if (!window.APP_DATA._loaded['quizzes']) {
    container.innerHTML = '<div class="skeleton-screen"><div class="skeleton-box skeleton-card"></div><div class="skeleton-box skeleton-card"></div></div>';
    await ensureDataLoaded('quizzes');
  }
  
  const quizzes = window.APP_DATA.quizzes || [];
  
  // Group quizzes by difficulty
  const groupedQuizzes = {
    easy: quizzes.filter(q => q.difficulty === 'easy'),
    medium: quizzes.filter(q => q.difficulty === 'medium'),
    hard: quizzes.filter(q => q.difficulty === 'hard')
  };
  
  // Calculate total completed quizzes per difficulty
  const completedCounts = {
    easy: groupedQuizzes.easy.filter(q => AppState.userData.completedQuizzes.includes(q.id)).length,
    medium: groupedQuizzes.medium.filter(q => AppState.userData.completedQuizzes.includes(q.id)).length,
    hard: groupedQuizzes.hard.filter(q => AppState.userData.completedQuizzes.includes(q.id)).length
  };
  
  const difficultyConfig = [
    { 
      key: 'easy', 
      label: 'Легкие', 
      icon: '🟢', 
      color: 'var(--color-success)',
      description: 'Базовые концепции и термины'
    },
    { 
      key: 'medium', 
      label: 'Средние', 
      icon: '🟡', 
      color: 'var(--color-primary)',
      description: 'Углубленные знания и практика'
    },
    { 
      key: 'hard', 
      label: 'Сложные', 
      icon: '🔴', 
      color: 'var(--color-error)',
      description: 'Продвинутые стратегии и анализ'
    }
  ];
  
  const renderQuizCard = (quiz) => {
    const isCompleted = AppState.userData.completedQuizzes.includes(quiz.id);
    return `
      <div class="card card-interactive" data-action="navigate" data-route="quiz" data-quiz-id="${quiz.id || "unknown"}">
        <div style="display: flex; justify-content: space-between; align-items: start;">
          <h3>${quiz.title || "Без названия"}</h3>
          ${isCompleted ? '<span style="font-size: 24px;" aria-label="Завершено">✓</span>' : ''}
        </div>
        <p class="caption mb-md">${quiz.description || ""}</p>
        <div style="display: flex; gap: var(--space-md); flex-wrap: wrap; align-items: center;">
          <span class="caption">📝 ${(quiz.questions || []).length} вопросов</span>
          <span class="caption">⏱️ ~${quiz.duration || "—"} мин</span>
        </div>
      </div>
    `;
  };
  
  container.innerHTML = `
    <h1>Квизы</h1>
    <p class="caption mb-lg">Проверьте свои знания о финансовых инструментах и стратегиях</p>
    
    ${difficultyConfig.map(config => {
      const quizzesInCategory = groupedQuizzes[config.key];
      const completedCount = completedCounts[config.key];
      
      if (quizzesInCategory.length === 0) return '';
      
      return `
        <div style="margin-bottom: var(--space-xl);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-md); padding: var(--space-md); background: var(--surface-2); border-radius: var(--radius-lg); border-left: 4px solid ${config.color};">
            <div style="flex: 1;">
              <div style="display: flex; align-items: center; gap: var(--space-sm); margin-bottom: var(--space-xs);">
                <span style="font-size: 20px;" aria-hidden="true">${config.icon}</span>
                <h2 style="margin: 0; font-size: 1.25rem; font-weight: 600; color: ${config.color};">${config.label}</h2>
              </div>
              <p class="caption" style="margin: 0; opacity: 0.8;">${config.description}</p>
            </div>
            <div style="text-align: right; margin-left: var(--space-md);">
              <div style="font-size: 1.5rem; font-weight: 700; color: ${config.color}; line-height: 1;">${quizzesInCategory.length}</div>
              <div class="caption" style="opacity: 0.7; margin-top: 2px;">
                ${completedCount > 0 ? `${completedCount} пройдено` : 'квизов'}
              </div>
            </div>
          </div>
          <div class="card-grid" id="quiz-grid-${config.key}">
            <!-- Lazy rendering with Intersection Observer -->
          </div>
        </div>
      `;
    }).join('')}
    
    ${quizzes.length === 0 ? `
      <div class="card" style="text-align: center; padding: var(--space-xl);">
        <div style="font-size: 64px; margin-bottom: var(--space-lg);">📚</div>
        <h2>Квизы скоро появятся</h2>
        <p class="caption">Мы работаем над созданием интересных квизов для вас</p>
      </div>
    ` : ''}
  `;
  
  // Инициализируем lazy rendering для каждой категории
  difficultyConfig.forEach(config => {
    const gridId = `quiz-grid-${config.key}`;
    const grid = document.getElementById(gridId);
    if (grid && groupedQuizzes[config.key].length > 0) {
      initLazyList(
        grid,
        groupedQuizzes[config.key],
        renderQuizCard,
        {
          initialRender: 5, // Показываем 5 квизов сразу
          rootMargin: '150px 0px',
          batchSize: 3
        }
      );
    }
  });
}

export function renderQuiz(container, params) {
  const quizId = params.id;
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
        <p class="caption"><strong>Сложность:</strong> ${getDifficultyLabel(quiz.difficulty)}</p>
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

export function startQuiz(quizId) {
  hapticFeedback("medium");
  const quiz = window.APP_DATA.quizzes.find((q) => q.id === quizId);
  if (!quiz) return;
  AppState.currentQuiz = quiz;
  AppState.currentQuestion = 0;
  AppState.quizAnswers = [];
  navigate("quiz-question");
}

export function renderQuizQuestion(container) {
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
      <span class="quiz-counter">${questionIndex + 1} / ${quiz.questions.length}</span>
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
    
    <button 
      id="submitAnswerBtn" 
      class="btn btn-primary" 
      data-action="submitAnswer"
      disabled
      style="width: 100%; margin-top: var(--space-lg); margin-bottom: var(--space-md);">
      ➡️ Продолжить
    </button>
    
    <div class="quiz-actions">
      <button class="btn btn-ghost" data-action="showHint">💡 Подсказка</button>
      <button class="btn btn-ghost" data-action="skipQuestion">⏭️ Пропустить</button>
    </div>
    <div id="hintBox" class="hidden" style="margin-top: var(--space-lg); padding: var(--space-md); background: var(--color-primary-light); border-radius: var(--radius-md);">
      <p><strong>Подсказка:</strong> ${question.hint || "Подсказка недоступна"}</p>
    </div>
  `;
  
  // Hide Telegram MainButton if it exists
  if (tg?.MainButton) {
    tg.MainButton.hide();
  }
}

export function selectAnswer(index) {
  hapticFeedback("light");
  document
    .querySelectorAll(".quiz-option")
    .forEach((opt) => opt.classList.remove("card-selected"));
  document
    .querySelectorAll(".quiz-option")
    [index].classList.add("card-selected");
  AppState.selectedAnswer = index;
  
  // Enable submit button
  const submitBtn = document.getElementById("submitAnswerBtn");
  if (submitBtn) {
    submitBtn.disabled = false;
  }
}

export function submitAnswer() {
  if (AppState.selectedAnswer === undefined) {
    hapticFeedback("error");
    return;
  }
  
  // Disable submit button to prevent double-click
  const submitBtn = document.getElementById("submitAnswerBtn");
  if (submitBtn) {
    submitBtn.disabled = true;
  }
  
  const quiz = AppState.currentQuiz;
  const question = quiz.questions[AppState.currentQuestion];
  const isCorrect = AppState.selectedAnswer === AppState.currentQuestionCorrectIndex;
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

export function showHint() {
  hapticFeedback("light");
  document.getElementById("hintBox").classList.toggle("hidden");
}

export function skipQuestion() {
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
    { id: "first_quiz", condition: () => AppState.userData.completedQuizzes.length >= 1 },
    { id: "quiz_3", condition: () => AppState.userData.completedQuizzes.length >= 3 },
    { id: "quiz_5", condition: () => AppState.userData.completedQuizzes.length >= 5 },
    { id: "quiz_10", condition: () => AppState.userData.completedQuizzes.length >= 10 },
    { id: "quiz_20", condition: () => AppState.userData.completedQuizzes.length >= 20 },
    { id: "quiz_50", condition: () => AppState.userData.completedQuizzes.length >= 50 },
    { id: "perfect_quiz", condition: () => (AppState.userData.perfectQuizzes || 0) >= 1 },
    { id: "perfect_3", condition: () => (AppState.userData.perfectQuizzes || 0) >= 3 },
    { id: "perfect_10", condition: () => (AppState.userData.perfectQuizzes || 0) >= 10 },
    { id: "streak_3", condition: () => AppState.userData.streak >= 3 },
    { id: "streak_7", condition: () => AppState.userData.streak >= 7 },
    { id: "streak_14", condition: () => AppState.userData.streak >= 14 },
    { id: "streak_30", condition: () => AppState.userData.streak >= 30 },
    { id: "streak_60", condition: () => AppState.userData.streak >= 60 },
    { id: "streak_100", condition: () => AppState.userData.streak >= 100 },
    { id: "streak_365", condition: () => AppState.userData.streak >= 365 },
    { id: "glossary_10", condition: () => AppState.userData.progress.glossaryViewed >= 10 },
    { id: "glossary_25", condition: () => AppState.userData.progress.glossaryViewed >= 25 },
    { id: "glossary_50", condition: () => AppState.userData.progress.glossaryViewed >= 50 },
    {
      id: "glossary_master",
      condition: () => {
        const total = window.APP_DATA?.glossary?.length || 100;
        return AppState.userData.progress.glossaryViewed >= total;
      },
    },
    { id: "first_visit", condition: () => true },
    { id: "explorer", condition: () => (AppState.userData.visitedSections || []).length >= 12 },
    { id: "completionist", condition: () => AppState.userData.unlockedBadges.length >= 40 },
  ];

  badges.forEach((badge) => {
    if (badge.condition() && !AppState.userData.unlockedBadges.includes(badge.id)) {
      AppState.userData.unlockedBadges.push(badge.id);
      showBadgeNotification(badge.id);
    }
  });
}

function showBadgeNotification(badgeId) {
  hapticFeedback("success");
}

export function renderQuizResult(container) {
  const quiz = AppState.currentQuiz;
  const correctCount = AppState.quizAnswers.filter((a) => a.correct).length;
  const totalQuestions = quiz.questions.length;
  const percentage = Math.round((correctCount / totalQuestions) * 100);
  let badge = "🥉", badgeText = "Бронзовый уровень", badgeColor = "var(--color-premium)";
  if (percentage >= 90) {
    badge = "🥇";
    badgeText = "Золотой уровень";
    badgeColor = "var(--color-gold)";
  } else if (percentage >= 70) {
    badge = "🥈";
    badgeText = "Серебряный уровень";
  }
  
  container.innerHTML = `
    <div class="result-card">
      <h1>Квиз завершён!</h1>
      <div class="result-badge">
        <div class="badge" style="background-color: ${badgeColor}; animation: unlockBadge var(--transition-slow);">${badge}</div>
      </div>
      <p class="result-score">${correctCount} / ${totalQuestions}</p>
      <p><strong>${percentage}%</strong> правильных ответов</p>
      <p class="caption">${badgeText}</p>
      ${percentage < 70 ? `
        <div style="margin-top: var(--space-lg); padding: var(--space-md); background: var(--color-primary-light); border-radius: var(--radius-md);">
          <p><strong>Рекомендации:</strong></p>
          <ul style="text-align: left; margin-top: var(--space-sm);">
            <li>Изучите раздел "Инфографика и видео"</li>
            <li>Просмотрите глоссарий ключевых терминов</li>
            <li>Попробуйте пройти квиз ещё раз</li>
          </ul>
        </div>
      ` : ""}
      <div class="result-actions">
        <button class="btn btn-secondary" data-action="shareResult">📤 Поделиться</button>
        <button class="btn btn-primary" data-action="startQuiz" data-quiz-id="${quiz.id}">🔁 Пройти ещё раз</button>
        <button class="btn btn-ghost" data-action="navigate" data-route="quizzes">Все квизы</button>
      </div>
    </div>
  `;
}

export function downloadResult() {
  hapticFeedback("success");
  const quiz = AppState.currentQuiz;
  const correctCount = AppState.quizAnswers.filter((a) => a.correct).length;
  const totalQuestions = quiz.questions.length;
  const resultHTML = `<html><head><meta charset="UTF-8"><style>body{font-family:Inter,sans-serif;padding:40px;background:linear-gradient(135deg,#C6D9FD 0%,white 100%)}.card{background:white;padding:40px;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,0.1);text-align:center;max-width:400px;margin:0 auto}h1{color:#1326FD;font-size:32px}.score{font-size:48px;color:#1326FD;margin:20px 0}</style></head><body><div class="card"><h1>MC Recovery Fund</h1><p><strong>${quiz.title}</strong></p><div class="score">${correctCount}/${totalQuestions}</div><p>Результат: ${Math.round((correctCount / totalQuestions) * 100)}%</p></div></body></html>`;
  const blob = new Blob([resultHTML], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `mc-recovery-${quiz.id}-result.html`;
  a.click();
}

export function shareResult() {
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

export function render(container, params = {}) {
  renderQuizzes(container);
}
