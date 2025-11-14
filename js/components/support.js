/**
 * MC Recovery Fund - Support Component
 * Support channels and contact information
 */

import { ensureDataLoaded } from '../utils/performance.js';
import { openLink } from '../modules/telegram.js';
import { showLoading, showError } from '../utils/component-helpers.js';

export async function render(container, params = {}) {
  showLoading(container);
  
  const loaded = await ensureDataLoaded('support');
  if (!loaded) {
    showError(container);
    return;
  }
  
  const data = window.APP_DATA.support;
  if (!data || !data.channels) {
    container.innerHTML = `<div class="card"><p>❌ Данные недоступны</p></div>`;
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
