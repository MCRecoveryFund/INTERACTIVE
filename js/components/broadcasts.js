/**
 * MC Recovery Fund - Broadcasts Component
 * Live streams and recordings
 */

import { ensureDataLoaded } from '../utils/performance.js';
import { openLink } from '../modules/telegram.js';
import { showLoading, showError } from '../utils/component-helpers.js';

export async function render(container, params = {}) {
  showLoading(container);
  
  const loaded = await ensureDataLoaded('broadcasts');
  if (!loaded) {
    showError(container);
    return;
  }
  
  const data = window.APP_DATA.broadcasts;
  if (!data || !data.schedule) {
    container.innerHTML = `<div class="card"><p>❌ Данные недоступны</p></div>`;
    return;
  }

  const upcoming = data.schedule.filter((b) => b.status === "upcoming");
  const completed = data.schedule.filter((b) => b.status === "completed");

  container.innerHTML = `
    <h1>${data.title}</h1>
    <p class="caption mb-lg">${data.description}</p>
    
    <div class="card mb-lg" style="background: linear-gradient(135deg, var(--color-primary-light) 0%, var(--surface-1) 100%); border: 2px solid var(--color-primary);">
      <p style="line-height: var(--line-height-relaxed);">${data.intro}</p>
    </div>
    
    ${
      upcoming.length > 0
        ? `
      <h2 style="margin-bottom: var(--space-md);">📅 Предстоящие эфиры</h2>
      <div class="card-grid mb-lg">
        ${upcoming
          .map((broadcast) => {
            const date = broadcast.date ? new Date(broadcast.date) : new Date();
            const dateStr = date.toLocaleDateString("ru-RU", {
              day: "numeric",
              month: "long",
            });

            return `
            <div class="card" style="border: 2px solid var(--color-primary);">
              <div class="preview-label" style="color: var(--color-primary);">
                ${broadcast.day || "Дата"}, ${dateStr} • ${
              broadcast.time || "—"
            } ${broadcast.timezone || "МСК"}
              </div>
              <h3>${broadcast.title || "Без названия"}</h3>
              <p class="caption" style="margin-bottom: ${
                broadcast.recordUrl ? "var(--space-md)" : "0"
              };">${broadcast.description || ""}</p>
              ${
                broadcast.recordUrl
                  ? `<button class="btn btn-primary" data-action="openLink" data-url="${broadcast.recordUrl}" style="width: 100%; margin-top: var(--space-sm);">▶️ Смотреть запись</button>`
                  : ""
              }
            </div>
          `;
          })
          .join("")}
      </div>
    `
        : ""
    }
    
    <h2 style="margin-bottom: var(--space-md);">🎬 Прошедшие эфиры</h2>
    <div class="list">
      ${completed
        .map((broadcast) => {
          const date = broadcast.date ? new Date(broadcast.date) : new Date();
          const dateStr = date.toLocaleDateString("ru-RU", {
            day: "numeric",
            month: "long",
          });

          return `
          <div class="list-item">
            <div style="flex: 1;">
              <div class="caption" style="margin-bottom: var(--space-xs);">
                ${broadcast.day || "Дата"}, ${dateStr} • ${
            broadcast.time || "—"
          } ${broadcast.timezone || "МСК"}
              </div>
              <strong>${broadcast.title || "Без названия"}</strong>
              <p class="caption" style="margin: var(--space-xs) 0 0 0;">${
                broadcast.description || ""
              }</p>
            </div>
            ${
              broadcast.recordUrl
                ? `<button class="btn btn-ghost" data-action="openLink" data-url="${broadcast.recordUrl}" style="white-space: nowrap;">▶️ Запись</button>`
                : '<span class="caption" style="color: var(--text-muted);">Скоро</span>'
            }
          </div>
        `;
        })
        .join("")}
    </div>
  `;
}
