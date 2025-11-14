/**
 * MC Recovery Fund - Lazy Rendering Utility
 * Intersection Observer для отложенного рендеринга списков
 */

/**
 * Создает Intersection Observer для ленивого рендеринга карточек
 * @param {Function} renderCallback - функция рендеринга карточки (item) => HTML
 * @param {Object} options - настройки observer
 */
export function createLazyRenderer(renderCallback, options = {}) {
  const {
    rootMargin = '100px 0px', // Начинаем рендерить за 100px до появления
    threshold = 0.01,
    batchSize = 10 // Рендерим по 10 элементов за раз
  } = options;

  let renderQueue = [];
  let isRendering = false;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const element = entry.target;
        
        // Добавляем в очередь рендеринга
        renderQueue.push(element);
        observer.unobserve(element);
        
        // Запускаем батч-рендеринг
        if (!isRendering) {
          scheduleRender();
        }
      }
    });
  }, { rootMargin, threshold });

  function scheduleRender() {
    if (renderQueue.length === 0) {
      isRendering = false;
      return;
    }

    isRendering = true;

    requestAnimationFrame(() => {
      // Берем batch элементов из очереди
      const batch = renderQueue.splice(0, batchSize);
      
      batch.forEach(element => {
        const itemData = JSON.parse(element.dataset.item || '{}');
        const html = renderCallback(itemData);
        
        // Используем requestAnimationFrame для плавного рендеринга
        requestAnimationFrame(() => {
          element.innerHTML = html;
          element.classList.add('rendered');
          element.classList.remove('lazy-placeholder');
        });
      });

      // Продолжаем рендерить следующий batch
      if (renderQueue.length > 0) {
        setTimeout(scheduleRender, 0);
      } else {
        isRendering = false;
      }
    });
  }

  return {
    observe: (element) => observer.observe(element),
    disconnect: () => {
      observer.disconnect();
      renderQueue = [];
      isRendering = false;
    },
    getRemainingCount: () => renderQueue.length
  };
}

/**
 * Создает placeholder элемент для ленивого рендеринга
 * @param {Object} itemData - данные элемента
 * @param {Number} index - индекс элемента
 */
export function createLazyPlaceholder(itemData, index = 0) {
  const div = document.createElement('div');
  div.className = 'lazy-placeholder';
  div.dataset.item = JSON.stringify(itemData);
  div.dataset.index = index;
  div.style.minHeight = '150px'; // Примерная высота карточки
  
  // SVG skeleton для placeholder
  div.innerHTML = `
    <div class="skeleton-card" style="height: 150px;">
      <div class="skeleton-shimmer"></div>
    </div>
  `;
  
  return div;
}

/**
 * Инициализирует ленивый рендеринг для контейнера со списком
 * @param {HTMLElement} container - контейнер списка
 * @param {Array} items - массив данных
 * @param {Function} renderCallback - функция рендеринга
 * @param {Object} options - опции
 */
export function initLazyList(container, items, renderCallback, options = {}) {
  const {
    initialRender = 10, // Сколько рендерим сразу
    ...observerOptions
  } = options;

  // Создаем lazy renderer
  const lazyRenderer = createLazyRenderer(renderCallback, observerOptions);
  
  // Рендерим первые элементы сразу
  const initialItems = items.slice(0, initialRender);
  const lazyItems = items.slice(initialRender);
  
  // Добавляем начальные элементы (рендерим сразу)
  initialItems.forEach((item, index) => {
    const html = renderCallback(item);
    const div = document.createElement('div');
    div.innerHTML = html;
    div.classList.add('rendered');
    container.appendChild(div.firstElementChild || div);
  });
  
  // Добавляем остальные как placeholders
  lazyItems.forEach((item, index) => {
    const placeholder = createLazyPlaceholder(item, initialRender + index);
    container.appendChild(placeholder);
    lazyRenderer.observe(placeholder);
  });
  
  return lazyRenderer;
}

/**
 * Быстрый хелпер для простых списков
 */
export function lazyRenderList(containerId, items, renderFn, options) {
  const container = document.getElementById(containerId);
  if (!container) {
    return null;
  }
  
  container.innerHTML = ''; // Очищаем
  return initLazyList(container, items, renderFn, options);
}
