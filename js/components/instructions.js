/**
 * MC Recovery Fund - Instructions Component
 * Step-by-step guides
 */

import { ensureDataLoaded } from '../utils/performance.js';
import { openLink } from '../modules/telegram.js';
import { showLoading, showError } from '../utils/component-helpers.js';

export async function render(container, params = {}) {
  showLoading(container);
  
  const loaded = await ensureDataLoaded('instructions');
  if (!loaded) {
    showError(container);
    return;
  }
  
  const data = window.APP_DATA.instructions;
  if (!data || !data.groups) {
    container.innerHTML = `<div class="card"><p>❌ Данные недоступны</p></div>`;
    return;
  }

  container.innerHTML = `
    <h1>${data.title}</h1>
    <p class="caption mb-lg">${data.description}</p>
    <div class="card-grid">
      ${data.groups
        .map(
          (group) => `
        <div class="collapsible">
          <div class="collapsible-header" data-action="toggleCollapsible">
            <span><span style="font-size: 24px; margin-right: var(--space-sm);">${
              group.icon
            }</span><strong>${group.title}</strong></span>
            <svg class="collapsible-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </div>
          <div class="collapsible-content">
            <div class="collapsible-body">
              <p class="caption mb-md">${group.description}</p>
              <div class="list">
                ${group.items
                  .map((item) => {
                    const isPlaceholder = item.url.includes("<ADD_LINK>");
                    return `
                    <div class="list-item ${
                      isPlaceholder ? "opacity-50" : ""
                    }" ${
                      !isPlaceholder
                        ? `data-action="openLink" data-url="${item.url}"`
                        : ""
                    }>
                      <div style="flex: 1;">
                        <strong>${item.title}</strong>
                        <p class="caption" style="margin: var(--space-xs) 0 0 0;">${
                          item.description
                        }</p>
                        ${
                          item.videos
                            ? `
                          <div style="margin-top: var(--space-sm); display: flex; gap: var(--space-sm); flex-wrap: wrap;">
                            ${item.videos
                              .map(
                                (video) => `
                              <button class="btn btn-ghost" data-action="openLink" data-url="${video.url}" style="padding: var(--space-xs) var(--space-sm); font-size: var(--font-size-small);">
                                ▶️ ${video.title}
                              </button>
                            `
                              )
                              .join("")}
                          </div>
                        `
                            : ""
                        }
                      </div>
                      ${
                        isPlaceholder
                          ? '<span class="caption" style="color: var(--text-muted);">Скоро</span>'
                          : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>'
                      }
                    </div>
                  `;
                  })
                  .join("")}
              </div>
            </div>
          </div>
        </div>
      `
        )
        .join("")}
    </div>
  `;
}
