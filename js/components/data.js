/**
 * MC Recovery Fund - Data Component
 * Analytics and data section with MC Recovery Vault
 */

import { renderVaultWidget } from './vault-widget.js';

export function render(container) {
  container.innerHTML = `
    <div class="hero">
      <h1 class="hero-title">📊 Данные</h1>
      <p class="hero-subtitle">Аналитика и информация</p>
    </div>

    <!-- MC Recovery Vault Widget -->
    <div class="priority-section" id="vaultWidgetContainer">
    </div>

    <section class="content-section">
      <h2 class="section-title">📈 Аналитика</h2>
      <div class="nav-grid-compact">
        <div class="nav-card" data-action="navigate" data-route="dashboard">
          <div class="nav-card-icon">💼</div>
          <div class="nav-card-title">Дашборд</div>
        </div>
        <div class="nav-card" data-action="navigate" data-route="broadcasts">
          <div class="nav-card-icon">📡</div>
          <div class="nav-card-title">Эфиры</div>
        </div>
        <div class="nav-card" data-action="navigate" data-route="announcements">
          <div class="nav-card-icon">📢</div>
          <div class="nav-card-title">Анонсы</div>
        </div>
      </div>
    </section>

    <section class="content-section">
      <h2 class="section-title">📄 Документы</h2>
      <div class="nav-grid-compact">
        <div class="nav-card" data-action="navigate" data-route="documents">
          <div class="nav-card-icon">📄</div>
          <div class="nav-card-title">Документы</div>
        </div>
      </div>
    </section>
  `;

  // Render vault widget after container is in DOM
  const vaultContainer = container.querySelector('#vaultWidgetContainer');
  if (vaultContainer) {
    renderVaultWidget(vaultContainer, { showHeader: true, compact: false });
  }
}
