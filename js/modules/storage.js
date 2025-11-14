/**
 * MC Recovery Fund - Storage Module
 * localStorage management for user data
 */

import { AppState } from '../core/state.js';

export function saveUserData() {
  try {
    localStorage.setItem(
      "mc_recovery_user_data",
      JSON.stringify(AppState.userData)
    );
  } catch (e) {
    console.error("Failed to save:", e);
  }
}

export function loadUserData() {
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

export function updateStreak() {
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

export function resetProgress() {
  if (confirm("Вы уверены? Весь прогресс будет удалён.")) {
    localStorage.removeItem("mc_recovery_user_data");
    AppState.userData = {
      streak: 0,
      lastActiveDate: null,
      completedQuizzes: [],
      unlockedBadges: [],
      progress: { quizzes: 0, eduTopics: 0, glossaryViewed: 0 },
      settings: { theme: "auto", language: "ru" },
      viewedTerms: [],
      perfectQuizzes: 0,
      visitedSections: [],
    };
    return true;
  }
  return false;
}

export function resetAppData() {
  if (!confirm("Вы уверены, что хотите удалить все данные приложения?\n\nЭто действие необратимо!")) {
    return false;
  }
  
  if (!confirm("Последнее предупреждение!\n\nВесь ваш прогресс, достижения и настройки будут безвозвратно удалены.\n\nПродолжить?")) {
    return false;
  }
  
  try {
    // Clear all localStorage
    localStorage.clear();
    
    // Reset state
    AppState.userData = {
      streak: 0,
      lastActiveDate: null,
      completedQuizzes: [],
      unlockedBadges: [],
      progress: { quizzes: 0, eduTopics: 0, glossaryViewed: 0 },
      settings: { theme: "auto", language: "ru" },
      viewedTerms: [],
      perfectQuizzes: 0,
      visitedSections: [],
    };
    
    alert("Данные успешно удалены. Страница будет перезагружена.");
    location.reload();
    return true;
  } catch (e) {
    console.error("Failed to reset app data:", e);
    alert("Ошибка при сбросе данных. Попробуйте снова.");
    return false;
  }
}
