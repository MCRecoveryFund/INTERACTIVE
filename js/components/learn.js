/**
 * MC Recovery Fund - Learn Component
 * Learning materials and quizzes
 */

import { AppState } from '../core/state.js';
import { ensureDataLoaded } from '../utils/performance.js';

export async function render(container) {
  // Load quizzes data on-demand if not already loaded
  if (!window.APP_DATA._loaded['quizzes']) {
    container.innerHTML = `
      <div class="skeleton-screen">
        <div class="skeleton-box skeleton-title"></div>
        <div class="skeleton-box skeleton-card"></div>
        <div class="skeleton-box skeleton-card"></div>
      </div>
    `;
    await ensureDataLoaded('quizzes');
  }
  
  const completedQuizzes = AppState.userData.completedQuizzes.length;
  const quizzes = window.APP_DATA?.quizzes || [];
  
  // Group quizzes by difficulty
  const groupedQuizzes = {
    easy: quizzes.filter(q => q.difficulty === 'easy'),
    medium: quizzes.filter(q => q.difficulty === 'medium'),
    hard: quizzes.filter(q => q.difficulty === 'hard')
  };
  
  const difficultyConfig = [
    { key: 'easy', label: 'Легкие', icon: '🟢', color: '#10b981' },
    { key: 'medium', label: 'Средние', icon: '🟡', color: '#5C62EC' },
    { key: 'hard', label: 'Сложные', icon: '🔴', color: '#ef4444' }
  ];
  
  container.innerHTML = `
    <div class="hero">
      <h1 class="hero-title">📚 Обучение</h1>
      <p class="hero-subtitle">Развивайте свои знания</p>
    </div>

    <section class="content-section">
      <h2 class="section-title">🎯 Квизы</h2>
      
      <div class="card quiz-accordion-card">
        <div class="quiz-accordion-header">
          <div style="display: flex; align-items: center; gap: var(--space-md);">
            <div class="nav-card-icon" style="margin: 0;">🎯</div>
            <div style="flex: 1;">
              <h3 style="margin: 0; font-size: 1.1rem;">Все квизы</h3>
              <p class="caption" style="margin: var(--space-xs) 0 0 0;">${completedQuizzes} из ${quizzes.length} пройдено</p>
            </div>
          </div>
          <button class="btn-link" style="color: var(--color-primary); font-weight: 500; text-decoration: none;" data-action="navigate" data-route="quizzes">
            Посмотреть все →
          </button>
        </div>
        
        <div class="quiz-accordion-content">
          ${difficultyConfig.map(config => {
            const categoryQuizzes = groupedQuizzes[config.key];
            if (categoryQuizzes.length === 0) return '';
            
            const completedInCategory = categoryQuizzes.filter(q => 
              AppState.userData.completedQuizzes.includes(q.id)
            ).length;
            
            return `
              <div class="quiz-difficulty-group">
                <button class="quiz-difficulty-header" data-action="toggleQuizGroup" data-difficulty="${config.key}">
                  <div style="display: flex; align-items: center; gap: var(--space-sm); flex: 1;">
                    <span style="font-size: 16px;">${config.icon}</span>
                    <span style="font-weight: 600; color: ${config.color};">${config.label}</span>
                    <span class="caption" style="opacity: 0.7;">${completedInCategory}/${categoryQuizzes.length}</span>
                  </div>
                  <svg class="quiz-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
                
                <div class="quiz-difficulty-list" data-difficulty="${config.key}">
                  ${categoryQuizzes.map(quiz => {
                    const isCompleted = AppState.userData.completedQuizzes.includes(quiz.id);
                    return `
                      <div class="quiz-list-item" data-action="navigate" data-route="quiz" data-quiz-id="${quiz.id}">
                        <div style="flex: 1;">
                          <div style="font-weight: 500; margin-bottom: 2px;">${quiz.title}</div>
                          <div class="caption" style="font-size: 11px;">📝 ${quiz.questions?.length || 0} вопросов · ⏱️ ${quiz.duration || 5} мин</div>
                        </div>
                        ${isCompleted ? '<span style="color: var(--color-success); font-size: 18px;">✓</span>' : '<span class="caption" style="opacity: 0.5;">→</span>'}
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `;
          }).join('')}
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
