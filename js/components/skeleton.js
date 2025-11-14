/**
 * MC Recovery Fund - SVG Skeleton Components
 * Красивые SVG skeleton screens с анимацией
 */

/**
 * Генерирует SVG gradient для shimmer эффекта
 */
const shimmerGradient = `
  <defs>
    <linearGradient id="shimmer-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="var(--skeleton-from, #f0f0f0)" stop-opacity="1">
        <animate attributeName="offset" values="-2; 1" dur="1.5s" repeatCount="indefinite"/>
      </stop>
      <stop offset="50%" stop-color="var(--skeleton-via, #e0e0e0)" stop-opacity="1">
        <animate attributeName="offset" values="-1; 2" dur="1.5s" repeatCount="indefinite"/>
      </stop>
      <stop offset="100%" stop-color="var(--skeleton-from, #f0f0f0)" stop-opacity="1">
        <animate attributeName="offset" values="0; 3" dur="1.5s" repeatCount="indefinite"/>
      </stop>
    </linearGradient>
  </defs>
`;

/**
 * Skeleton для карточки
 */
export function skeletonCard(options = {}) {
  const { width = '100%', height = 150, radius = 12 } = options;
  
  return `
    <svg class="skeleton-svg" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      ${shimmerGradient}
      <rect x="0" y="0" width="100%" height="100%" rx="${radius}" fill="url(#shimmer-gradient)"/>
    </svg>
  `;
}

/**
 * Skeleton для списка карточек
 */
export function skeletonCardList(count = 3, options = {}) {
  return Array.from({ length: count }, () => `
    <div class="skeleton-card-wrapper" style="margin-bottom: 16px;">
      ${skeletonCard(options)}
    </div>
  `).join('');
}

/**
 * Skeleton для quiz карточки с деталями
 */
export function skeletonQuizCard() {
  return `
    <svg class="skeleton-svg" width="100%" height="140" xmlns="http://www.w3.org/2000/svg">
      ${shimmerGradient}
      <!-- Заголовок -->
      <rect x="16" y="16" width="60%" height="20" rx="4" fill="url(#shimmer-gradient)"/>
      <!-- Описание -->
      <rect x="16" y="44" width="85%" height="14" rx="3" fill="url(#shimmer-gradient)"/>
      <rect x="16" y="64" width="75%" height="14" rx="3" fill="url(#shimmer-gradient)"/>
      <!-- Метаданные -->
      <rect x="16" y="92" width="80" height="12" rx="3" fill="url(#shimmer-gradient)"/>
      <rect x="110" y="92" width="70" height="12" rx="3" fill="url(#shimmer-gradient)"/>
      <!-- Фон карточки -->
      <rect x="0" y="0" width="100%" height="100%" rx="12" fill="url(#shimmer-gradient)" opacity="0.3"/>
    </svg>
  `;
}

/**
 * Skeleton для glossary карточки
 */
export function skeletonGlossaryCard() {
  return `
    <svg class="skeleton-svg" width="100%" height="180" xmlns="http://www.w3.org/2000/svg">
      ${shimmerGradient}
      <!-- Иконка категории -->
      <circle cx="32" cy="32" r="16" fill="url(#shimmer-gradient)"/>
      <!-- Термин -->
      <rect x="16" y="56" width="70%" height="18" rx="4" fill="url(#shimmer-gradient)"/>
      <!-- Определение -->
      <rect x="16" y="84" width="90%" height="12" rx="3" fill="url(#shimmer-gradient)"/>
      <rect x="16" y="102" width="85%" height="12" rx="3" fill="url(#shimmer-gradient)"/>
      <rect x="16" y="120" width="75%" height="12" rx="3" fill="url(#shimmer-gradient)"/>
      <!-- Badge -->
      <rect x="16" y="146" width="60" height="20" rx="10" fill="url(#shimmer-gradient)"/>
      <!-- Фон -->
      <rect x="0" y="0" width="100%" height="100%" rx="12" fill="url(#shimmer-gradient)" opacity="0.2"/>
    </svg>
  `;
}

/**
 * Skeleton для dashboard
 */
export function skeletonDashboard() {
  return `
    <div class="skeleton-dashboard">
      <svg class="skeleton-svg" width="100%" height="300" xmlns="http://www.w3.org/2000/svg">
        ${shimmerGradient}
        <!-- Header -->
        <rect x="16" y="16" width="50%" height="24" rx="6" fill="url(#shimmer-gradient)"/>
        <rect x="16" y="48" width="70%" height="16" rx="4" fill="url(#shimmer-gradient)"/>
        
        <!-- Metrics -->
        <rect x="16" y="80" width="30%" height="60" rx="8" fill="url(#shimmer-gradient)"/>
        <rect x="calc(33% + 8px)" y="80" width="30%" height="60" rx="8" fill="url(#shimmer-gradient)"/>
        <rect x="calc(66% + 16px)" y="80" width="30%" height="60" rx="8" fill="url(#shimmer-gradient)"/>
        
        <!-- Chart area -->
        <rect x="16" y="160" width="calc(100% - 32px)" height="120" rx="8" fill="url(#shimmer-gradient)"/>
      </svg>
    </div>
  `;
}

/**
 * Skeleton для home страницы
 */
export function skeletonHomePage() {
  return `
    <div class="skeleton-home">
      <!-- Приветствие -->
      <svg class="skeleton-svg" width="100%" height="60" xmlns="http://www.w3.org/2000/svg" style="margin-bottom: 16px;">
        ${shimmerGradient}
        <rect x="0" y="8" width="60%" height="24" rx="6" fill="url(#shimmer-gradient)"/>
        <rect x="0" y="40" width="40%" height="16" rx="4" fill="url(#shimmer-gradient)"/>
      </svg>
      
      <!-- Vault Widget -->
      ${skeletonDashboard()}
      
      <!-- Quick Access -->
      <svg class="skeleton-svg" width="100%" height="40" xmlns="http://www.w3.org/2000/svg" style="margin: 24px 0 16px 0;">
        ${shimmerGradient}
        <rect x="0" y="8" width="40%" height="20" rx="5" fill="url(#shimmer-gradient)"/>
      </svg>
      
      <div class="skeleton-card-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
        ${skeletonCard({ height: 100 })}
        ${skeletonCard({ height: 100 })}
        ${skeletonCard({ height: 100 })}
        ${skeletonCard({ height: 100 })}
      </div>
    </div>
  `;
}

/**
 * Показать skeleton для контейнера
 */
export function showSkeleton(containerId, skeletonType = 'card', options = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  let skeletonHTML = '';
  
  switch (skeletonType) {
    case 'card':
      skeletonHTML = skeletonCard(options);
      break;
    case 'cardList':
      skeletonHTML = skeletonCardList(options.count || 3, options);
      break;
    case 'quiz':
      skeletonHTML = skeletonQuizCard();
      break;
    case 'glossary':
      skeletonHTML = skeletonGlossaryCard();
      break;
    case 'dashboard':
      skeletonHTML = skeletonDashboard();
      break;
    case 'home':
      skeletonHTML = skeletonHomePage();
      break;
    default:
      skeletonHTML = skeletonCard(options);
  }
  
  container.innerHTML = `<div class="skeleton-container">${skeletonHTML}</div>`;
}

/**
 * Убрать skeleton
 */
export function hideSkeleton(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const skeletonContainer = container.querySelector('.skeleton-container');
  if (skeletonContainer) {
    skeletonContainer.style.opacity = '0';
    skeletonContainer.style.transition = 'opacity 0.3s ease-out';
    setTimeout(() => {
      skeletonContainer.remove();
    }, 300);
  }
}
