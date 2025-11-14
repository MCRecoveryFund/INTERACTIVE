/**
 * MC Recovery Fund - Literature Component
 * Recommended books for investors
 */

import { ensureDataLoaded } from '../utils/performance.js';
import { openLink } from '../modules/telegram.js';
import { showLoading, showError } from '../utils/component-helpers.js';

export async function render(container, params = {}) {
  showLoading(container);
  
  const loaded = await ensureDataLoaded('literature');
  if (!loaded) {
    showError(container);
    return;
  }
  
  const data = window.APP_DATA.literature;
  if (!data || !data.categories) {
    container.innerHTML = `<div class="card"><p>❌ Данные недоступны</p></div>`;
    return;
  }

  const categoriesHTML = data.categories
    .map((category) => {
      const booksHTML = category.books
        .map((book) => {
          const linkButton = book.url
            ? `<button class="btn btn-primary" data-action="openLink" data-url="${book.url}" style="margin-top: var(--space-md); width: 100%;">
               🛒 Купить на Litres
             </button>`
            : "";

          const coverImage = book.cover
            ? `
              <div style="float: left; margin-right: var(--space-md); margin-bottom: var(--space-sm); width: 120px; flex-shrink: 0;">
                <img src="${book.cover}" 
                     alt="${book.title}" 
                     loading="lazy"
                     decoding="async"
                     style="width: 100%; height: auto; border-radius: var(--radius-md); box-shadow: 0 4px 12px rgba(0,0,0,0.15);" />
              </div>
            `
            : "";

          return `
          <div class="card" style="margin-bottom: var(--space-md); overflow: hidden;">
            ${coverImage}
            <div style="min-height: ${book.cover ? '140px' : 'auto'};">
              <h3 style="margin-bottom: var(--space-xs); color: var(--color-primary);">${
                book.title
              }</h3>
              <p class="caption" style="margin-bottom: var(--space-xs);"><strong>✍️ Автор:</strong> ${
                book.author
              }</p>
              ${
                book.year
                  ? `<p class="caption" style="margin-bottom: var(--space-sm); opacity: 0.7;">📅 Год издания: ${book.year}</p>`
                  : ""
              }
              <p style="margin-bottom: var(--space-sm); line-height: var(--line-height-relaxed); color: var(--text-secondary);">${
                book.description
              }</p>
            </div>
            <div style="clear: both;"></div>
            ${linkButton}
          </div>
        `;
        })
        .join("");

      return `
        <section class="content-section">
          <h2 class="section-title">${category.icon} ${category.name}</h2>
          ${booksHTML}
        </section>
      `;
    })
    .join("");

  container.innerHTML = `
    <h1>${data.title}</h1>
    <p class="caption mb-lg">${data.description}</p>
    
    ${categoriesHTML}
    
    <div class="card mt-lg" style="border: 2px solid var(--border-strong); background: var(--surface-2);">
      <p class="caption" style="line-height: var(--line-height-relaxed);">
        <strong>Совет:</strong> Начните с категории "Основы инвестирования", если вы новичок. 
        Книги расположены в рекомендуемом порядке для изучения. 
      </p>
    </div>
  `;
}
