/**
 * MC Recovery Fund - Component Helpers
 * Общие утилиты для компонентов
 */

import { skeletonCard } from '../components/skeleton.js';

/**
 * Показывает loading state
 */
export function showLoading(container) {
  container.innerHTML = skeletonCard({ height: 200 });
}

/**
 * Показывает ошибку загрузки
 */
export function showError(container, message = 'Ошибка загрузки данных') {
  container.innerHTML = `
    <div class="card" style="text-align: center; padding: var(--space-xl);">
      <div style="font-size: 48px; margin-bottom: var(--space-md);">❌</div>
      <p><strong>${message}</strong></p>
    </div>
  `;
}

/**
 * Определяет категорию термина (единая логика для всего приложения)
 */
export function detectCategory(term) {
  const text = `${term.term || ''} ${term.definition || ''}`.toLowerCase();
  
  if (text.includes('nft') || text.includes('токен') || text.includes('коллекци')) {
    return 'nft';
  }
  if (text.includes('defi') || text.includes('децентрализованн') || text.includes('ликвидност')) {
    return 'defi';
  }
  if (text.includes('блокчейн') || text.includes('майнинг') || text.includes('консенсус')) {
    return 'blockchain';
  }
  if (text.includes('торг') || text.includes('биржа') || text.includes('ордер')) {
    return 'trading';
  }
  if (text.includes('безопасност') || text.includes('защит') || text.includes('взлом')) {
    return 'security';
  }
  
  return 'general';
}

/**
 * Получает информацию о категории
 */
export function getCategoryInfo(category) {
  const categories = {
    all: { icon: '📚', label: 'Все' },
    nft: { icon: '🎨', label: 'NFT' },
    defi: { icon: '💎', label: 'DeFi' },
    trading: { icon: '📈', label: 'Трейдинг' },
    blockchain: { icon: '⛓️', label: 'Техно' },
    security: { icon: '🔒', label: 'Безопасность' },
    general: { icon: '📖', label: 'Общее' }
  };
  return categories[category] || categories.general;
}
