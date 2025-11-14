/**
 * MC Recovery Fund - Edu Component
 * Educational materials with collapsibles
 */

import { ensureDataLoaded } from '../utils/performance.js';
import { hapticFeedback, openLink as tgOpenLink } from '../modules/telegram.js';
import { showLoading, showError } from '../utils/component-helpers.js';

export async function render(container, params = {}) {
  showLoading(container);
  
  const loaded = await ensureDataLoaded('edu');
  if (!loaded) {
    showError(container);
    return;
  }
  
  const topics = window.APP_DATA.edu;
  container.innerHTML = `<h1>Инфографика и видео</h1><p class="caption mb-lg">Интерактивные материалы о финансовых инструментах</p><div class="card-grid">${topics
    .map(
      (topic) =>
        `<div class="collapsible"><div class="collapsible-header" data-action="toggleCollapsible"><span><strong>${
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
          .join("")}
${
          topic.videoUrl
            ? `<button class="btn btn-primary" data-action="openVideo" data-url="${topic.videoUrl}">▶️ Смотреть видео</button>`
            : ""
        }</div></div></div>`
    )
    .join("")}</div>`;
}

export function toggleCollapsible(header) {
  hapticFeedback("light");
  const content = header.nextElementSibling;
  const icon = header.querySelector(".collapsible-icon");
  content.classList.toggle("open");
  icon.classList.toggle("open");
}

export function openVideo(url) {
  hapticFeedback("light");
  tgOpenLink(url);
}
