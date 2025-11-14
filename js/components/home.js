/**
 * MC Recovery Fund - Home Component
 * Main dashboard/landing page
 */

import { AppState } from '../core/state.js';
import { getDaysWord } from '../utils/helpers.js';
import { renderVaultWidget } from './vault-widget.js';
import { loadVaultData } from '../modules/api.js';

export async function render(container) {
  const streak = AppState.userData.streak;
  
  container.innerHTML = `
    <div class="hero">
      <h1 class="hero-title">MC Recovery Fund</h1>
      <p class="hero-subtitle">Ваш проводник в мире инвестирования</p>
      ${streak > 0 ? `
        <div style="display: flex; justify-content: center; margin-top: var(--space-md);">
          <div class="streak">
            <span class="streak-icon">🔥</span>
            <span>Серия: ${streak} ${getDaysWord(streak)}</span>
          </div>
        </div>
      ` : ''}
    </div>

    <!-- MC Recovery Vault Widget -->
    <div id="vaultWidget" style="margin-bottom: var(--space-xl);"></div>

    <section class="content-section">
      <h2 class="section-title">⚡ Быстрый доступ</h2>
      <div class="quick-access" role="list">
        <button
          type="button"
          class="nav-card"
          data-action="navigate"
          data-route="instructions"
          role="listitem"
        >
          <span class="nav-card-icon" aria-hidden="true">📖</span>
          <span class="nav-card-title">Инструкции</span>
        </button>
        <button
          type="button"
          class="nav-card"
          data-action="navigate"
          data-route="data"
          role="listitem"
        >
          <span class="nav-card-icon" aria-hidden="true">📊</span>
          <span class="nav-card-title">Данные</span>
        </button>
        <button
          type="button"
          class="nav-card"
          data-action="navigate"
          data-route="dashboard"
          role="listitem"
        >
          <span class="nav-card-icon" aria-hidden="true">💼</span>
          <span class="nav-card-title">Дашборд</span>
        </button>
        <button
          type="button"
          class="nav-card"
          data-action="navigate"
          data-route="broadcasts"
          role="listitem"
        >
          <span class="nav-card-icon" aria-hidden="true">📡</span>
          <span class="nav-card-title">Эфиры</span>
        </button>
        <button
          type="button"
          class="nav-card"
          data-action="navigate"
          data-route="announcements"
          role="listitem"
        >
          <span class="nav-card-icon" aria-hidden="true">📢</span>
          <span class="nav-card-title">Анонсы</span>
        </button>
      </div>
    </section>
  `;
  
  // Render vault widget
  const vaultContainer = document.getElementById('vaultWidget');
  if (vaultContainer) {
    renderVaultWidget(vaultContainer, { showHeader: true, compact: false });
  }
}

/**
 * Refresh vault data and re-render widget
 */
export async function refreshVault() {
  try {
    await loadVaultData();
    const vaultContainer = document.getElementById('vaultWidget');
    if (vaultContainer) {
      renderVaultWidget(vaultContainer, { showHeader: true, compact: false });
    }
  } catch (error) {
    console.error('[Home] Failed to refresh vault:', error);
  }
}
