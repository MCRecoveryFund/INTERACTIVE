/**
 * MC Recovery Fund - Documents Component
 * Official documents and materials
 */

import { ensureDataLoaded } from '../utils/performance.js';
import { openLink } from '../modules/telegram.js';
import { showLoading, showError } from '../utils/component-helpers.js';

export async function render(container, params = {}) {
  showLoading(container);
  
  const loaded = await ensureDataLoaded('documents');
  if (!loaded) {
    showError(container);
    return;
  }
  
  const documents = window.APP_DATA.documents || [];

  container.innerHTML = `
    <h1>Документы</h1>
    <p class="caption mb-lg">Официальные документы и материалы</p>
    
    <div class="card-grid">
      ${documents
        .map(
          (doc) => `
        <div class="card card-interactive" data-action="openLink" data-url="${
          doc.url || "#"
        }">
          <div style="display: flex; align-items: start; gap: var(--space-md);">
            <div style="font-size: 40px; line-height: 1;">${
              doc.icon || "📄"
            }</div>
            <div style="flex: 1;">
              <h3 style="margin-bottom: var(--space-sm);">${
                doc.title || "Без названия"
              }</h3>
              <p class="caption">${doc.description || ""}</p>
              <div style="margin-top: var(--space-md);">
                <span class="caption" style="color: var(--color-primary); font-weight: 600;">
                  ${(doc.type || "PDF").toUpperCase()} документ →
                </span>
              </div>
            </div>
          </div>
        </div>
      `
        )
        .join("")}
    </div>
    
    <div class="card mt-lg" style="border: 2px solid var(--border-strong); background: var(--surface-2);">
      <p class="caption" style="line-height: var(--line-height-relaxed);">
        <strong>Важно:</strong> Все документы предоставлены исключительно в информационных целях. 
        Перед принятием инвестиционных решений рекомендуется проконсультироваться с финансовым консультантом.
      </p>
    </div>
  `;
}
