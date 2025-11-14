/**
 * MC Recovery Fund - Glossary Component
 * Full glossary with virtualization and search
 */

import { AppState, GlossaryState } from "../core/state.js";
import { GLOSSARY_CONFIG } from "../core/config.js";
import { ensureDataLoaded, debounce } from "../utils/performance.js";
import { saveUserData } from "../modules/storage.js";
import { initLazyList } from "../utils/lazy-render.js";
import { hapticFeedback } from "../modules/telegram.js";
import { workerAPI } from "../utils/worker-api.js";
import { normalizeSearchText } from "../utils/helpers.js";
import {
  detectCategory,
  getCategoryInfo,
  showLoading,
  showError,
} from "../utils/component-helpers.js";

// Calculate search relevance
function calculateRelevance(term, query) {
  const normalizedQuery = normalizeSearchText(query);
  const normalizedTerm = normalizeSearchText(term.term || "");
  const normalizedDef = normalizeSearchText(term.definition || "");

  let score = 0;
  const queryWords = normalizedQuery.split(" ").filter((w) => w.length > 0);

  queryWords.forEach((word) => {
    if (normalizedTerm === word) score += 1000;
    if (normalizedTerm.startsWith(word)) score += 500;
    if (normalizedTerm.includes(word)) score += 100;
    if (normalizedDef.includes(word)) score += 10;
  });

  const allWordsInTerm = queryWords.every((w) => normalizedTerm.includes(w));
  const allWordsInDef = queryWords.every((w) => normalizedDef.includes(w));
  if (allWordsInTerm) score += 200;
  else if (allWordsInDef) score += 20;

  return score;
}

export async function render(container, params = {}) {
  // Показываем скелетон пока грузятся данные
  container.innerHTML = `
    <div class="skeleton-screen">
      <div class="skeleton-box skeleton-title"></div>
      <div class="skeleton-box skeleton-text"></div>
      <div class="skeleton-box skeleton-card"></div>
      <div class="skeleton-box skeleton-card"></div>
    </div>
  `;

  const startTime = performance.now();
  const loaded = await ensureDataLoaded("glossary");

  if (!loaded) {
    container.innerHTML = `<div class="card"><p>❌ Ошибка загрузки данных</p></div>`;
    return;
  }

  const terms = window.APP_DATA.glossary || [];

  // Оптимизируем обработку больших массивов - используем requestAnimationFrame для batch-обработки
  const processingStartTime = performance.now();

  GlossaryState.allTerms = terms.map((term) => ({
    ...term,
    category: term.category || detectCategory(term),
    firstLetter: (term.term || "").charAt(0).toUpperCase(),
  }));

  GlossaryState.filteredTerms = [...GlossaryState.allTerms];

  const viewed = AppState.userData.progress.glossaryViewed || 0;
  const percentage = Math.round((viewed / terms.length) * 100);

  const categories = [
    "all",
    ...new Set(GlossaryState.allTerms.map((t) => t.category)),
  ];

  container.innerHTML = `
    <h1>📚 Глоссарий</h1>
    
    <div class="glossary-header">
      <div class="glossary-progress-info">
        <div class="glossary-progress-label">Изучено терминов</div>
        <div class="glossary-progress-stats">
          <span>${viewed}</span>
          <span class="glossary-progress-total">/ ${terms.length}</span>
        </div>
      </div>
      <div class="glossary-progress-bar-container">
        <div class="glossary-progress-percentage">${percentage}%</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${percentage}%"></div>
        </div>
      </div>
    </div>
    
    <div class="search-box">
      <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/>
        <path d="M21 21l-4.35-4.35"/>
      </svg>
      <input 
        type="text" 
        class="search-input" 
        id="glossarySearch"
        placeholder="Поиск по терминам..." 
        autocomplete="off"
      />
    </div>
    
    <div class="glossary-filters" id="glossaryFilters">
      ${categories
        .map((cat) => {
          const info = getCategoryInfo(cat);
          return `<button class="glossary-filter-btn ${
            cat === "all" ? "active" : ""
          }" data-category="${cat}">
          <span>${info.icon}</span>
          <span>${info.label}</span>
        </button>`;
        })
        .join("")}
    </div>
    
    <div class="glossary-container">
      <div class="glossary-card-grid" id="glossary-grid"></div>
    </div>
    
    <button class="glossary-scroll-top" id="scrollTopBtn" aria-label="Наверх">↑</button>
  `;

  initGlossary();
}

function initGlossary() {
  const searchInput = document.getElementById("glossarySearch");
  const filterButtons = document.querySelectorAll(".glossary-filter-btn");
  const scrollTopBtn = document.getElementById("scrollTopBtn");

  if (searchInput) {
    searchInput.addEventListener(
      "input",
      debounce((e) => {
        GlossaryState.searchQuery = e.target.value;
        filterGlossary();
      }, 300)
    );
  }

  if (filterButtons) {
    filterButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        filterButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        GlossaryState.currentCategory = btn.dataset.category;
        filterGlossary();
      });
    });
  }

  // Слушаем скролл страницы (единый скролл)
  if (scrollTopBtn) {
    const handleScroll = debounce(() => {
      if (window.scrollY > 500) {
        scrollTopBtn.classList.add("visible");
      } else {
        scrollTopBtn.classList.remove("visible");
      }
    }, 50);

    window.addEventListener("scroll", handleScroll);

    scrollTopBtn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  filterGlossary();
}

async function filterGlossary() {
  const category = GlossaryState.currentCategory;
  const query = GlossaryState.searchQuery.trim();

  // Используем Web Worker для фильтрации и поиска
  let filtered;
  let useWorker = true;

  try {
    // Фильтрация по категории через worker
    if (category !== "all") {
      filtered = await workerAPI.filterGlossary(
        GlossaryState.allTerms,
        category
      );
    } else {
      filtered = [...GlossaryState.allTerms];
    }

    // Поиск через worker
    if (query) {
      filtered = await workerAPI.searchGlossary(filtered, query);
    }
    console.log(
      "[Glossary] Search completed via worker, found:",
      filtered.length
    );
  } catch (error) {
    console.log("[Glossary] Using main thread fallback:", error.message);
    useWorker = false;

    // Fallback to main thread if worker fails
    filtered =
      category === "all"
        ? [...GlossaryState.allTerms]
        : GlossaryState.allTerms.filter((term) => term.category === category);

    if (query) {
      // Используем правильную нормализацию и скоринг
      const normalizedQuery = normalizeSearchText(query);
      if (normalizedQuery) {
        console.log(
          "[Glossary] Searching in main thread for:",
          normalizedQuery
        );
        filtered = filtered
          .map((term) => {
            const score = calculateRelevance(term, query);
            return { term, score };
          })
          .filter((item) => item.score > 0)
          .sort((a, b) => b.score - a.score)
          .map((item) => item.term);
        console.log("[Glossary] Main thread search found:", filtered.length);
      }
    }
  }

  GlossaryState.filteredTerms = filtered;
  GlossaryState.visibleStart = 0;
  GlossaryState.visibleEnd = 30;

  // updateAlphabetNav() удалён - алфавитная навигация не используется
  renderVirtualScroll();
}

// Глобальная переменная для lazy renderer
let glossaryLazyRenderer = null;

function renderVirtualScroll() {
  const grid = document.getElementById("glossary-grid");

  if (!grid) return;

  const terms = GlossaryState.filteredTerms;

  if (terms.length === 0) {
    grid.innerHTML = `
      <div class="glossary-empty">
        <div class="glossary-empty-icon">🔍</div>
        <p><strong>Ничего не найдено</strong></p>
        <p class="caption">Попробуйте изменить параметры поиска</p>
      </div>
    `;
    return;
  }

  // Отключаем предыдущий observer если был
  if (glossaryLazyRenderer) {
    glossaryLazyRenderer.disconnect();
  }

  // Очищаем grid
  grid.innerHTML = "";

  // Используем Intersection Observer для ленивого рендеринга
  glossaryLazyRenderer = initLazyList(
    grid,
    terms,
    (term) => renderGlossaryCard(term),
    {
      initialRender: 15, // Рендерим 15 карточек сразу
      rootMargin: "300px 0px", // Начинаем рендерить за 300px
      batchSize: 10, // По 10 карточек за раз
    }
  );

  // Event delegation для кликов по карточкам
  grid.addEventListener("click", (e) => {
    const card = e.target.closest(".glossary-card");
    if (card && card.dataset.termId) {
      showTermDetail(card.dataset.termId);
    }
  });
}

function renderGlossaryCard(term) {
  const isViewed = AppState.userData.viewedTerms?.includes(term.id);
  const categoryInfo = getCategoryInfo(term.category);
  const definition = (term.definition || "").substring(0, 150);

  return `
    <div class="glossary-card" data-term-id="${term.id}" data-letter="${
    term.firstLetter
  }">
      <div class="glossary-card-header">
        <div class="glossary-card-icon">${categoryInfo.icon}</div>
        <h3 class="glossary-card-title">${term.term || "Без названия"}</h3>
      </div>
      
      <div class="glossary-card-category category-${term.category}">
        ${categoryInfo.label}
      </div>
      
      <p class="glossary-card-definition">
        ${definition}${definition.length >= 150 ? "..." : ""}
      </p>
      
      <div class="glossary-card-footer">
        <div class="glossary-card-meta">
          <div class="${
            isViewed ? "glossary-read-indicator" : "glossary-unread-indicator"
          }"></div>
          <span>${isViewed ? "Изучено" : "Новое"}</span>
        </div>
        <span class="caption">→</span>
      </div>
    </div>
  `;
}

// Алфавитная навигация удалена для Telegram Web App
// renderAlphabetNav() и updateAlphabetNav() больше не используются

export function scrollToLetter(letter) {
  hapticFeedback("light");

  const index = GlossaryState.filteredTerms.findIndex(
    (t) => t.firstLetter === letter
  );
  if (index === -1) return;

  // Используем скролл страницы
  const card = document.querySelector(
    `[data-term-id="${GlossaryState.filteredTerms[index].id}"]`
  );
  if (card) {
    card.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function showTermDetail(termId) {
  hapticFeedback("light");

  const term = GlossaryState.allTerms.find((t) => t.id === termId);
  if (!term) return;

  if (!AppState.userData.progress.glossaryViewed) {
    AppState.userData.progress.glossaryViewed = 0;
  }
  if (!AppState.userData.viewedTerms) {
    AppState.userData.viewedTerms = [];
  }

  const isNewTerm = !AppState.userData.viewedTerms.includes(termId);
  if (isNewTerm) {
    AppState.userData.viewedTerms.push(termId);
    AppState.userData.progress.glossaryViewed++;
    saveUserData();
  }

  const categoryInfo = getCategoryInfo(term.category);

  const modal = document.createElement("div");
  modal.className = "glossary-modal";
  modal.innerHTML = `
    <div class="glossary-modal-content">
      <div class="glossary-modal-header">
        <div class="glossary-modal-icon">${categoryInfo.icon}</div>
        <div class="glossary-modal-title-wrapper">
          <h2 class="glossary-modal-title">${term.term}</h2>
          <div class="glossary-card-category category-${term.category}">
            ${categoryInfo.label}
          </div>
        </div>
        <button class="glossary-modal-close" aria-label="Закрыть">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
      
      <div class="glossary-modal-body">
        <div class="glossary-modal-definition">${
          term.definition || "Определение отсутствует"
        }</div>
      </div>
      
      <div class="glossary-modal-footer">
        <button class="btn btn-secondary" data-action="close-modal">
          Закрыть
        </button>
      </div>
    </div>
  `;

  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });

  // Обработчики для всех кнопок закрытия
  const closeButtons = modal.querySelectorAll(
    '.glossary-modal-close, [data-action="close-modal"]'
  );

  if (closeButtons.length > 0) {
    closeButtons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        modal.remove();
      });
    });
  }

  document.addEventListener("keydown", function handleEscape(e) {
    if (e.key === "Escape") {
      modal.remove();
      document.removeEventListener("keydown", handleEscape);
    }
  });

  document.body.appendChild(modal);

  if (isNewTerm) {
    setTimeout(() => {
      const card = document.querySelector(`[data-term-id="${termId}"]`);
      if (card) {
        const indicator = card.querySelector(".glossary-unread-indicator");
        if (indicator) {
          indicator.className = "glossary-read-indicator";
          card.querySelector(".glossary-card-meta span").textContent =
            "Изучено";
        }
      }
    }, 300);
  }
}

// Export for global access
window.scrollToLetter = scrollToLetter;
