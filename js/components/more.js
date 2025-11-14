/**
 * MC Recovery Fund - Profile (More) Component
 * User progress, settings and additional resources
 */

import { AppState } from '../core/state.js';

export function render(container) {
  // Calculate progress stats
  const stats = calculateProgressStats();
  
  container.innerHTML = `
    <div class="hero">
      <h1 class="hero-title">👤 Профиль</h1>
      <p class="hero-subtitle">Ваш прогресс и настройки</p>
    </div>

    <!-- Progress Card -->
    <section class="content-section">
      <div class="card" style="background: linear-gradient(135deg, var(--color-primary) 0%, color-mix(in srgb, var(--color-primary) 70%, var(--color-success)) 100%); color: white; padding: var(--space-lg); border-radius: var(--radius-lg); box-shadow: var(--shadow-md);">
        <div style="display: flex; align-items: center; gap: var(--space-md); margin-bottom: var(--space-lg);">
          <div style="font-size: 48px; line-height: 1;">🏆</div>
          <div>
            <h2 style="margin: 0; font-size: 24px; font-weight: 700; color: white;">Мой прогресс</h2>
            <p style="margin: 4px 0 0 0; font-size: 14px; opacity: 0.9;">Отслеживайте свои достижения</p>
          </div>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-md);">
          <div class="progress-stat-card">
            <div class="progress-stat-icon">📚</div>
            <div class="progress-stat-value">${stats.completedQuizzes}</div>
            <div class="progress-stat-label">Квизов пройдено</div>
          </div>
          <div class="progress-stat-card">
            <div class="progress-stat-icon">⭐</div>
            <div class="progress-stat-value">${stats.perfectQuizzes}</div>
            <div class="progress-stat-label">Идеальных</div>
          </div>
          <div class="progress-stat-card">
            <div class="progress-stat-icon">🔥</div>
            <div class="progress-stat-value">${stats.streak}</div>
            <div class="progress-stat-label">Дней подряд</div>
          </div>
          <div class="progress-stat-card">
            <div class="progress-stat-icon">🎯</div>
            <div class="progress-stat-value">${stats.badges}</div>
            <div class="progress-stat-label">Достижений</div>
          </div>
        </div>
        
        <div style="margin-top: var(--space-lg); padding-top: var(--space-md); border-top: 1px solid rgba(255,255,255,0.2);">
          <button 
            class="btn btn-secondary" 
            data-action="navigate" 
            data-route="my-progress"
            style="width: 100%; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3); color: white; font-weight: 600;">
            📊 Детальная статистика →
          </button>
        </div>
      </div>
    </section>

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

    <section class="content-section">
      <h2 class="section-title">⚙️ Настройки</h2>
      <div class="nav-grid-compact">
        <button 
          class="nav-card"
          data-action="restartOnboarding"
          style="
            border: 2px solid var(--color-primary);
            background: var(--surface-1);
            cursor: pointer;
            transition: all var(--transition-fast);
          ">
          <div class="nav-card-icon" style="color: var(--color-primary);">🎯</div>
          <div class="nav-card-title" style="color: var(--color-primary);">Пройти тур заново</div>
          <p class="caption" style="margin: var(--space-xs) 0 0 0; font-size: 12px;">Показать обучение</p>
        </button>
        
        <button 
          class="nav-card"
          id="resetDataBtn"
          data-action="resetAppData"
          style="
            border: 2px solid var(--color-error);
            background: var(--surface-1);
            cursor: pointer;
            transition: all var(--transition-fast);
          ">
          <div class="nav-card-icon" style="color: var(--color-error);">🗑️</div>
          <div class="nav-card-title" style="color: var(--color-error);">Сброс данных</div>
          <p class="caption" style="margin: var(--space-xs) 0 0 0; font-size: 12px;">Удалить весь прогресс</p>
        </button>
      </div>
    </section>

    <div class="footer" style="margin-top: var(--space-xl);">
      <p class="disclaimer">Материалы носят образовательный характер и не являются инвестиционной рекомендацией. Перед принятием финансовых решений проконсультируйтесь со специалистом.</p>
      <p class="caption">Версия 2.0.0</p>
      <p class="caption">©Copyright 2025 MC Recovery Fund</p>
    </div>
  `;
  
  // Add CSS for progress stat cards if not exists
  if (!document.getElementById('progress-stat-styles')) {
    const style = document.createElement('style');
    style.id = 'progress-stat-styles';
    style.textContent = `
      .progress-stat-card {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 12px;
        padding: 16px;
        text-align: center;
        backdrop-filter: blur(10px);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .progress-stat-card:hover {
        transform: translateY(-2px);
        background: rgba(255, 255, 255, 0.15);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }
      .progress-stat-icon {
        font-size: 32px;
        margin-bottom: 8px;
        line-height: 1;
      }
      .progress-stat-value {
        font-size: 28px;
        font-weight: 700;
        color: white;
        margin-bottom: 4px;
        line-height: 1;
      }
      .progress-stat-label {
        font-size: 12px;
        opacity: 0.9;
        font-weight: 500;
        color: white;
      }
    `;
    document.head.appendChild(style);
  }
}

function calculateProgressStats() {
  const userData = AppState.userData || {};
  
  return {
    completedQuizzes: (userData.completedQuizzes || []).length,
    perfectQuizzes: userData.perfectQuizzes || 0,
    streak: userData.streak || 0,
    badges: (userData.unlockedBadges || []).length
  };
}
