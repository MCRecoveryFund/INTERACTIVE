/**
 * MC Recovery Fund - Progress Component
 * User progress and achievements
 */

import { AppState } from '../core/state.js';

export function render(container) {
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
