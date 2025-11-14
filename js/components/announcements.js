/**
 * MC Recovery Fund - Announcements Component
 * News and upcoming events
 */

import { ensureDataLoaded } from '../utils/performance.js';
import { openLink } from '../modules/telegram.js';
import { showLoading, showError } from '../utils/component-helpers.js';

export async function render(container, params = {}) {
  showLoading(container);
  
  const loaded = await ensureDataLoaded('announcements');
  if (!loaded) {
    showError(container);
    return;
  }
  
  const announcements = window.APP_DATA.announcements || [];

  if (announcements.length === 0) {
    container.innerHTML = `
      <h1>Анонсы</h1>
      <div class="card" style="text-align: center; padding: var(--space-xl);">
        <div style="font-size: 48px; margin-bottom: var(--space-md);">📢</div>
        <h3>Пока нет новых анонсов</h3>
        <p class="caption">Следите за обновлениями</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <h1>Анонсы</h1>
    <p class="caption mb-lg">Предстоящие события и важные объявления</p>
    <div class="card-grid">
      ${announcements
        .map((announcement) => {
          const date = announcement.date
            ? new Date(announcement.date)
            : new Date();
          const dateStr = date.toLocaleDateString("ru-RU", {
            day: "numeric",
            month: "long",
            year: "numeric",
          });
          const isPast = date < new Date();

          return `
          <div class="card ${isPast ? "opacity-50" : ""}">
            <div style="display: flex; align-items: start; gap: var(--space-md); margin-bottom: var(--space-md);">
              <div style="font-size: 40px; line-height: 1;">${
                announcement.icon || "📢"
              }</div>
              <div style="flex: 1;">
                <div class="caption" style="color: var(--color-primary); font-weight: 600; margin-bottom: var(--space-xs);">
                  ${dateStr}, ${announcement.time || "—"} ${
            announcement.timezone || "МСК"
          }
                </div>
                <h3 style="margin-bottom: var(--space-sm);">${
                  announcement.title || "Без названия"
                }</h3>
              </div>
            </div>
            <p>${announcement.description || ""}</p>
            ${
              announcement.formUrl
                ? `
              <button class="btn btn-primary" data-action="openLink" data-url="${announcement.formUrl}" style="width: 100%; margin-top: var(--space-md);">
                📝 Задать вопрос заранее
              </button>
            `
                : ""
            }
            ${
              isPast
                ? '<p class="caption" style="margin-top: var(--space-md); color: var(--text-muted);">Событие завершено</p>'
                : ""
            }
          </div>
        `;
        })
        .join("")}
    </div>
  `;
}
