/**
 * MC Recovery Fund - Achievements Component
 * Full achievements system with 40+ badges
 */

import { AppState } from '../core/state.js';

export function render(container, params = {}) {
  const allBadges = getAllBadges();
  const userData = AppState.userData;
  const unlockedIds = userData.unlockedBadges || [];
  
  const categories = {
    quiz: { name: 'Квизы', icon: '🎯' },
    streak: { name: 'Серии', icon: '🔥' },
    glossary: { name: 'Глоссарий', icon: '📚' },
    education: { name: 'Образование', icon: '🎓' },
    activity: { name: 'Активность', icon: '📢' },
    documents: { name: 'Документы', icon: '📄' },
    broadcasts: { name: 'Эфиры', icon: '🎪' }
  };
  
  const unlockedCount = unlockedIds.length;
  const totalCount = allBadges.length;
  const percentage = Math.round((unlockedCount / totalCount) * 100);
  
  const badgesByCategory = {};
  allBadges.forEach(badge => {
    if (!badgesByCategory[badge.category]) {
      badgesByCategory[badge.category] = [];
    }
    badgesByCategory[badge.category].push(badge);
  });
  
  const categoriesHTML = Object.entries(badgesByCategory).map(([catKey, badges]) => {
    const catInfo = categories[catKey] || { name: catKey, icon: '🏆' };
    const unlockedInCat = badges.filter(b => unlockedIds.includes(b.id)).length;
    
    return `
      <div class="card mb-lg">
        <h3 style="margin-bottom: var(--space-md);">${catInfo.icon} ${catInfo.name}</h3>
        <p class="caption mb-md">${unlockedInCat} из ${badges.length} разблокировано</p>
        <div class="badges-grid">
          ${badges.map(badge => {
            const isUnlocked = unlockedIds.includes(badge.id);
            return `
              <div class="badge-card ${isUnlocked ? '' : 'badge-locked'}">
                <div class="badge-icon">${badge.icon}</div>
                <div class="badge-name">${badge.name}</div>
                <p class="badge-desc caption">${badge.desc}</p>
                <p class="badge-condition caption" style="margin-top: var(--space-xs); font-size: 11px; opacity: 0.7;">
                  ${badge.condition}
                </p>
                ${!isUnlocked ? '<div class="badge-lock">🔒</div>' : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');
  
  container.innerHTML = `
    <h1>🏆 Достижения</h1>
    
    <div class="card mb-lg" style="text-align: center;">
      <div style="font-size: 48px; margin-bottom: var(--space-md);">🎖️</div>
      <h2>${unlockedCount} / ${totalCount}</h2>
      <p class="caption mb-md">Достижений разблокировано</p>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${percentage}%"></div>
      </div>
      <p class="caption" style="margin-top: var(--space-sm);">${percentage}% прогресс</p>
    </div>
    
    ${categoriesHTML}
  `;
}

function getAllBadges() {
  return [
    // 🎯 Квизы (12)
    { id: "first_quiz", icon: "🎓", name: "Первый шаг", desc: "Завершён первый квиз", condition: "Пройдите 1 квиз", category: "quiz" },
    { id: "quiz_3", icon: "📝", name: "Новичок", desc: "Завершено 3 квиза", condition: "Пройдите 3 квиза", category: "quiz" },
    { id: "quiz_5", icon: "🏅", name: "Знаток", desc: "Завершено 5 квизов", condition: "Пройдите 5 квизов", category: "quiz" },
    { id: "quiz_10", icon: "🎖️", name: "Эксперт", desc: "Завершено 10 квизов", condition: "Пройдите 10 квизов", category: "quiz" },
    { id: "quiz_20", icon: "🏆", name: "Мастер", desc: "Завершено 20 квизов", condition: "Пройдите 20 квизов", category: "quiz" },
    { id: "quiz_50", icon: "👑", name: "Легенда", desc: "Завершено 50 квизов", condition: "Пройдите 50 квизов", category: "quiz" },
    { id: "perfect_quiz", icon: "💎", name: "Перфекционист", desc: "100% в квизе", condition: "Получите 100% в квизе", category: "quiz" },
    { id: "perfect_3", icon: "💠", name: "Безупречный", desc: "3 идеальных квиза", condition: "Получите 100% в 3 квизах", category: "quiz" },
    { id: "perfect_10", icon: "✨", name: "Непобедимый", desc: "10 идеальных квизов", condition: "Получите 100% в 10 квизах", category: "quiz" },
    { id: "speed_demon", icon: "⚡", name: "Скоростной", desc: "Квиз за 2 минуты", condition: "Пройдите квиз менее чем за 2 минуты", category: "quiz" },
    { id: "no_hints", icon: "🧠", name: "Самостоятельный", desc: "Квиз без подсказок", condition: "Пройдите квиз не используя подсказки", category: "quiz" },
    { id: "comeback", icon: "🔄", name: "Возвращение", desc: "Повторное прохождение", condition: "Повторно пройдите квиз с лучшим результатом", category: "quiz" },
    
    // 🔥 Серии (10)
    { id: "streak_3", icon: "🔥", name: "Три дня", desc: "Серия 3 дня", condition: "Заходите 3 дня подряд", category: "streak" },
    { id: "streak_7", icon: "🌟", name: "Неделя", desc: "Серия 7 дней", condition: "Заходите 7 дней подряд", category: "streak" },
    { id: "streak_14", icon: "💫", name: "Две недели", desc: "Серия 14 дней", condition: "Заходите 14 дней подряд", category: "streak" },
    { id: "streak_30", icon: "⭐", name: "Месяц", desc: "Серия 30 дней", condition: "Заходите 30 дней подряд", category: "streak" },
    { id: "streak_60", icon: "🌠", name: "Два месяца", desc: "Серия 60 дней", condition: "Заходите 60 дней подряд", category: "streak" },
    { id: "streak_100", icon: "🎆", name: "Сотня", desc: "Серия 100 дней", condition: "Заходите 100 дней подряд", category: "streak" },
    { id: "streak_365", icon: "🎇", name: "Год вместе", desc: "Серия 365 дней", condition: "Заходите год подряд", category: "streak" },
    { id: "early_bird", icon: "🌅", name: "Ранняя птица", desc: "Вход до 6 утра", condition: "Зайдите до 6:00 утра", category: "streak" },
    { id: "night_owl", icon: "🦉", name: "Ночная сова", desc: "Вход после полуночи", condition: "Зайдите после 00:00", category: "streak" },
    { id: "weekend_warrior", icon: "🎮", name: "Выходной воин", desc: "Активность в выходные", condition: "Будьте активны в субботу и воскресенье", category: "streak" },
    
    // 📚 Глоссарий (8)
    { id: "glossary_10", icon: "📖", name: "Читатель", desc: "Изучено 10 терминов", condition: "Просмотрите 10 терминов", category: "glossary" },
    { id: "glossary_25", icon: "📕", name: "Студент", desc: "Изучено 25 терминов", condition: "Просмотрите 25 терминов", category: "glossary" },
    { id: "glossary_50", icon: "📗", name: "Грамотный", desc: "Изучено 50 терминов", condition: "Просмотрите 50 терминов", category: "glossary" },
    { id: "glossary_master", icon: "📚", name: "Эрудит", desc: "Все термины изучены", condition: "Просмотрите весь глоссарий", category: "glossary" },
    { id: "search_master", icon: "🔍", name: "Искатель", desc: "Использование поиска", condition: "Воспользуйтесь поиском в глоссарии 10 раз", category: "glossary" },
    { id: "video_watcher", icon: "🎬", name: "Зритель", desc: "Просмотр видео", condition: "Посмотрите 5 видео из глоссария", category: "glossary" },
    { id: "definition_expert", icon: "📝", name: "Знаток определений", desc: "Детальное изучение", condition: "Откройте полные определения 20 терминов", category: "glossary" },
    { id: "quick_learner", icon: "💡", name: "Быстрое обучение", desc: "Изучение за день", condition: "Изучите 10 терминов за один день", category: "glossary" },
    
    // 🎓 Образование (7)
    { id: "edu_visitor", icon: "👀", name: "Любопытный", desc: "Посещение раздела", condition: "Посетите раздел Инфографика", category: "education" },
    { id: "edu_explorer", icon: "🗺️", name: "Исследователь", desc: "Изучение материалов", condition: "Откройте 5 разных тем", category: "education" },
    { id: "video_fan", icon: "📹", name: "Видеолюбитель", desc: "Просмотр видео", condition: "Посмотрите 10 видео", category: "education" },
    { id: "all_topics", icon: "🎯", name: "Всезнающий", desc: "Все темы изучены", condition: "Откройте все темы в инфографике", category: "education" },
    { id: "first_visit", icon: "👋", name: "Добро пожаловать", desc: "Первый визит", condition: "Впервые откройте приложение", category: "activity" },
    { id: "explorer", icon: "🧭", name: "Путешественник", desc: "Посещение разделов", condition: "Посетите все разделы приложения", category: "activity" }
  ];
}
