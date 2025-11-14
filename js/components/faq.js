/**
 * MC Recovery Fund - FAQ Component
 * Frequently asked questions with search and accordion
 */

import { ensureDataLoaded } from '../utils/performance.js';
import { hapticFeedback } from '../modules/telegram.js';
import { showLoading, showError } from '../utils/component-helpers.js';

export async function render(container, params = {}) {
  showLoading(container);
  
  const loaded = await ensureDataLoaded('faq');
  if (!loaded) {
    showError(container);
    return;
  }
  
  const data = window.APP_DATA.faq;
  if (!data || !data.categories) {
    container.innerHTML = `<div class="card"><p>❌ Данные недоступны</p></div>`;
    return;
  }

  // Build FAQ items map
  const faqMap = new Map();
  data.categories.forEach(category => {
    category.items.forEach(item => {
      faqMap.set(item.id, { ...item, categoryId: category.id, categoryTitle: category.title });
    });
  });

  // Render quick links
  const quickLinksHTML = data.quickLinks && data.quickLinks.length > 0
    ? `
      <div class="faq-quick-links">
        <h2 class="section-title">Популярные темы</h2>
        <div class="quick-links-grid">
          ${data.quickLinks.map(link => `
            <button 
              class="quick-link-card" 
              data-action="scrollToFAQ" 
              data-faq-id="${link.questionIds[0]}">
              <span class="quick-link-icon">${link.icon}</span>
              <span class="quick-link-title">${link.title}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          `).join('')}
        </div>
      </div>
    `
    : '';

  // Render categories
  const categoriesHTML = data.categories.map(category => {
    const itemsHTML = category.items.map((item) => {
      const hasLink = item.link && item.link.url;
      const relatedQuestionsHTML = item.relatedIds && item.relatedIds.length > 0
        ? `
          <div class="faq-related">
            <p class="faq-related-title"><strong>Смотрите также:</strong></p>
            <ul class="faq-related-list">
              ${item.relatedIds.map(relatedId => {
                const related = faqMap.get(relatedId);
                return related 
                  ? `<li><button class="faq-related-link" data-action="scrollToFAQ" data-faq-id="${relatedId}">${related.question}</button></li>`
                  : '';
              }).join('')}
            </ul>
          </div>
        `
        : '';

      return `
        <div class="faq-item" id="${item.id}" data-faq-id="${item.id}">
          <h3 class="faq-question">
            <button 
              class="faq-toggle" 
              aria-expanded="false" 
              id="faq-btn-${item.id}">
              <span class="faq-toggle-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </span>
              <span class="faq-question-text">${item.question}</span>
            </button>
          </h3>
          <div 
            class="faq-answer" 
            id="faq-answer-${item.id}" 
            hidden>
            <div class="faq-answer-content">
              <p style="white-space: pre-line; line-height: 1.6;">${item.answer}</p>
              ${hasLink ? `
                <a 
                  href="${item.link.url}" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  class="btn btn-primary btn-sm" 
                  style="margin-top: var(--space-md); display: inline-flex; align-items: center; gap: var(--space-xs);">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
                  </svg>
                  ${item.link.text}
                </a>
              ` : ''}
              ${relatedQuestionsHTML}
            </div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <section class="faq-category">
        <h2 class="faq-category-title">
          <span>${category.icon}</span> ${category.title}
        </h2>
        <div class="faq-items">
          ${itemsHTML}
        </div>
      </section>
    `;
  }).join('');

  container.innerHTML = `
    <div class="faq-container">
      <header class="faq-header">
        <h1>${data.icon} ${data.title}</h1>
        <p class="caption">${data.description}</p>
      </header>

      <div class="faq-search">
        <div class="search-input-wrapper">
          <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input 
            type="search" 
            id="faq-search-input" 
            class="faq-search-input" 
            placeholder="Поиск по вопросам и ответам..."
            autocomplete="off">
          <button 
            class="search-clear" 
            id="faq-search-clear" 
            hidden>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <p id="faq-search-results" class="faq-search-results"></p>
      </div>

      ${quickLinksHTML}

      <div class="faq-categories">
        ${categoriesHTML}
      </div>

      <div class="card" style="margin-top: var(--space-xl);">
        <h3>Не нашли ответ?</h3>
        <p class="caption mb-md">Обратитесь в службу поддержки — мы поможем разобраться</p>
        <button class="btn btn-secondary" data-action="navigate" data-route="support" style="width: 100%;">
          💬 Связаться с поддержкой
        </button>
      </div>
    </div>
  `;

  initFAQInteractions(faqMap);
}

function initFAQInteractions(faqMap) {
  // Accordion toggle
  document.querySelectorAll('.faq-toggle').forEach(button => {
    button.addEventListener('click', () => {
      hapticFeedback('light');
      const isExpanded = button.getAttribute('aria-expanded') === 'true';
      const answerId = button.getAttribute('aria-controls') || `faq-answer-${button.closest('.faq-item').id}`;
      const answer = document.getElementById(answerId);
      
      // Close others
      document.querySelectorAll('.faq-toggle[aria-expanded="true"]').forEach(otherBtn => {
        if (otherBtn !== button) {
          const otherAnswerId = otherBtn.getAttribute('aria-controls') || `faq-answer-${otherBtn.closest('.faq-item').id}`;
          const otherAnswer = document.getElementById(otherAnswerId);
          otherBtn.setAttribute('aria-expanded', 'false');
          otherAnswer.hidden = true;
          otherBtn.closest('.faq-item').classList.remove('faq-item-open');
        }
      });

      // Toggle current
      button.setAttribute('aria-expanded', !isExpanded);
      answer.hidden = isExpanded;
      button.closest('.faq-item').classList.toggle('faq-item-open', !isExpanded);

      if (!isExpanded) {
        setTimeout(() => {
          button.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
      }
    });
  });

  // Search
  const searchInput = document.getElementById('faq-search-input');
  const searchClear = document.getElementById('faq-search-clear');
  const searchResults = document.getElementById('faq-search-results');
  
  let searchTimeout;
  
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim().toLowerCase();
    searchClear.hidden = query.length === 0;
    
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      filterFAQItems(query, searchResults, faqMap);
    }, 300);
  });

  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    searchClear.hidden = true;
    filterFAQItems('', searchResults, faqMap);
    searchInput.focus();
  });

  // Quick links navigation
  document.querySelectorAll('[data-action="scrollToFAQ"]').forEach(button => {
    button.addEventListener('click', () => {
      hapticFeedback('light');
      const faqId = button.getAttribute('data-faq-id');
      const faqItem = document.getElementById(faqId);
      const faqToggle = document.getElementById(`faq-btn-${faqId}`);
      
      if (faqItem && faqToggle) {
        faqToggle.setAttribute('aria-expanded', 'true');
        const answerId = `faq-answer-${faqId}`;
        const answer = document.getElementById(answerId);
        answer.hidden = false;
        faqItem.classList.add('faq-item-open');
        
        faqItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        faqItem.classList.add('faq-item-highlight');
        setTimeout(() => {
          faqItem.classList.remove('faq-item-highlight');
        }, 2000);
      }
    });
  });
}

function filterFAQItems(query, resultsElement, faqMap) {
  const items = document.querySelectorAll('.faq-item');
  const categories = document.querySelectorAll('.faq-category');
  
  if (!query) {
    items.forEach(item => item.style.display = '');
    categories.forEach(cat => cat.style.display = '');
    resultsElement.textContent = '';
    return;
  }

  let matchCount = 0;
  
  items.forEach(item => {
    const faqId = item.getAttribute('data-faq-id');
    const faqData = faqMap.get(faqId);
    
    if (faqData) {
      const questionMatch = faqData.question.toLowerCase().includes(query);
      const answerMatch = faqData.answer.toLowerCase().includes(query);
      const tagsMatch = faqData.tags && faqData.tags.some(tag => tag.toLowerCase().includes(query));
      
      const isMatch = questionMatch || answerMatch || tagsMatch;
      
      if (isMatch) {
        item.style.display = '';
        matchCount++;
      } else {
        item.style.display = 'none';
      }
    }
  });

  // Hide empty categories
  categories.forEach(category => {
    const visibleItems = category.querySelectorAll('.faq-item:not([style*="display: none"])');
    category.style.display = visibleItems.length > 0 ? '' : 'none';
  });

  // Update results
  if (matchCount === 0) {
    resultsElement.textContent = `По запросу "${query}" ничего не найдено`;
  } else {
    const declension = getDeclension(matchCount, ['вопрос', 'вопроса', 'вопросов']);
    resultsElement.textContent = `Найдено: ${matchCount} ${declension}`;
  }
}

function getDeclension(number, titles) {
  const cases = [2, 0, 1, 1, 1, 2];
  return titles[(number % 100 > 4 && number % 100 < 20) ? 2 : cases[(number % 10 < 5) ? number % 10 : 5]];
}
