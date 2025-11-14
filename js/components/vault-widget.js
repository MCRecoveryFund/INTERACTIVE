/**
 * MC Recovery Fund - Vault Widget Component
 * Reusable widget for displaying MC Recovery Vault data
 */

import { AppState } from '../core/state.js';
import { formatCurrency, formatNumber, formatPercent, getAPRClass } from '../utils/helpers.js';
import { loadVaultData } from '../modules/api.js';

/**
 * Render the vault widget
 * @param {HTMLElement} container - Container element to render widget
 * @param {Object} options - Options for rendering (showHeader, compact, etc.)
 */
export function renderVaultWidget(container, options = {}) {
  const {
    showHeader = true,
    compact = false,
    title = '🏦 MC Recovery Vault'
  } = options;

  // Load vault data if not already loaded
  if (!AppState.vaultData.positions && !AppState.vaultData.loading && !AppState.vaultData.error) {
    loadVaultData().catch(err => console.error('[VaultWidget] Failed to load vault data:', err));
  }

  const html = generateVaultWidgetHTML(title, showHeader, compact);
  container.innerHTML = html;

  // Attach event listeners
  attachVaultWidgetEvents(container);
}

/**
 * Generate HTML for vault widget
 */
function generateVaultWidgetHTML(title, showHeader, compact) {
  const { positions, metrics, loading, error, lastUpdated } = AppState.vaultData;

  // Loading state
  if (loading) {
    return `
      <div class="card vault-widget" id="vaultWidget">
        ${showHeader ? `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-md);">
            <h3 style="margin-bottom: 0;">${title}</h3>
            <button class="btn-icon" data-action="refreshVault" aria-label="Обновить">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
              </svg>
            </button>
          </div>
        ` : ''}
        <div style="text-align: center; padding: var(--space-xl) 0;">
          <div class="spinner"></div>
          <p class="caption" style="margin-top: var(--space-md);">Загрузка данных...</p>
        </div>
      </div>
    `;
  }

  // Error state
  if (error) {
    return `
      <div class="card vault-widget" id="vaultWidget">
        ${showHeader ? `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-md);">
            <h3 style="margin-bottom: 0;">${title}</h3>
            <button class="btn-icon" data-action="refreshVault" aria-label="Обновить">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
              </svg>
            </button>
          </div>
        ` : ''}
        <div style="text-align: center; padding: var(--space-lg) 0;">
          <p style="color: var(--color-error);">⚠️ Ошибка загрузки: ${error}</p>
        </div>
      </div>
    `;
  }

  // No data state
  if (!positions || !metrics) {
    return `
      <div class="card vault-widget" id="vaultWidget">
        ${showHeader ? `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-md);">
            <h3 style="margin-bottom: 0;">${title}</h3>
            <button class="btn-icon" data-action="refreshVault" aria-label="Обновить">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
              </svg>
            </button>
          </div>
        ` : ''}
        <div style="text-align: center; padding: var(--space-lg) 0;">
          <p class="caption">Нет данных. Нажмите кнопку обновить.</p>
        </div>
      </div>
    `;
  }

  // Success state with data
  const accountValue = positions.marginSummary?.accountValue || "0";
  const apr = metrics.apr || 0;
  const allTimeData = metrics.portfolio?.find(([period]) => period === "allTime")?.[1];
  const pnlHistory = allTimeData?.pnlHistory || [];
  const latestPnl = pnlHistory.length > 0 ? pnlHistory[pnlHistory.length - 1][1] : "0";
  const openPositions = positions.assetPositions?.filter((ap) => ap.position) || [];
  const lastUpdateTime = lastUpdated ? new Date(lastUpdated).toLocaleTimeString("ru-RU") : "";

  if (compact) {
    // Compact version - just metrics
    return `
      <div class="card vault-widget vault-widget-compact" id="vaultWidget">
        ${showHeader ? `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-md);">
            <div>
              <h3 style="margin-bottom: var(--space-xs);">${title}</h3>
              ${lastUpdateTime ? `<span class="caption" style="font-size: 12px;">Обновлено: ${lastUpdateTime}</span>` : ""}
            </div>
            <button class="btn-icon" data-action="refreshVault" aria-label="Обновить">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
              </svg>
            </button>
          </div>
        ` : ''}
        
        <div class="vault-metrics">
          <div class="vault-metric">
            <span class="caption">Account Value</span>
            <strong style="font-size: 20px; color: var(--color-success);">${formatCurrency(accountValue)}</strong>
          </div>
          <div class="vault-metric">
            <span class="caption">APR</span>
            <strong style="font-size: 18px;" class="${getAPRClass(apr)}">${formatPercent(apr)}</strong>
          </div>
        </div>
      </div>
    `;
  }

  // Full version with positions
  return `
    <div class="card vault-widget" id="vaultWidget">
      ${showHeader ? `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-md);">
          <div>
            <h3 style="margin-bottom: var(--space-xs);">${title}</h3>
            ${lastUpdateTime ? `<span class="caption" style="font-size: 12px;">Обновлено: ${lastUpdateTime}</span>` : ""}
          </div>
          <button class="btn-icon" data-action="refreshVault" aria-label="Обновить">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
            </svg>
          </button>
        </div>
      ` : ''}
      
      <div class="vault-metrics">
        <div class="vault-metric">
          <span class="caption">Account Value</span>
          <strong style="font-size: 20px; color: var(--color-success);">${formatCurrency(accountValue)}</strong>
        </div>
        <div class="vault-metric">
          <span class="caption">APR</span>
          <strong style="font-size: 18px;" class="${getAPRClass(apr)}">${formatPercent(apr)}</strong>
        </div>
        <div class="vault-metric">
          <span class="caption">All-Time PnL</span>
          <strong style="font-size: 18px;" class="${parseFloat(latestPnl) >= 0 ? 'positive' : 'negative'}">
            ${formatCurrency(latestPnl)}
          </strong>
        </div>
        <div class="vault-metric">
          <span class="caption">Открытые позиции</span>
          <strong style="font-size: 18px;">${openPositions.length > 0 ? openPositions.length : 'открытых позиций нет'}</strong>
        </div>
      </div>

      ${openPositions.length > 0 ? `
        <div style="margin-top: var(--space-lg);">
          <h4 style="margin-bottom: var(--space-sm); font-size: 14px; color: var(--text-muted);">Позиции:</h4>
          <div class="vault-positions">
            ${openPositions.slice(0, 5).map(renderPosition).join('')}
          </div>
          ${openPositions.length > 5 ? `
            <p class="caption" style="margin-top: var(--space-sm); text-align: center;">
              И еще ${openPositions.length - 5} позиций...
            </p>
          ` : ''}
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * Get coin color from CSS variables
 */
function getCoinColor(coin) {
  const colorMap = {
    'BTC': 'var(--coin-btc)',
    'ETH': 'var(--coin-eth)',
    'HYPE': 'var(--coin-hype)',
    'SOL': 'var(--coin-sol)',
    'BNB': 'var(--coin-bnb)',
    'XRP': 'var(--coin-xrp)',
    'ADA': 'var(--coin-ada)',
    'DOGE': 'var(--coin-doge)',
    'TON': 'var(--coin-ton)',
    'LTC': 'var(--coin-ltc)',
    'AVAX': 'var(--coin-avax)',
    'TRX': 'var(--coin-trx)',
    'MATIC': 'var(--coin-matic)',
    'LINK': 'var(--coin-link)',
    'BCH': 'var(--coin-bch)',
    'ARB': 'var(--coin-arb)',
    'OP': 'var(--coin-op)'
  };
  return colorMap[coin] || 'var(--color-text)';
}

/**
 * Render a single position
 */
function renderPosition(assetPos) {
  const position = assetPos.position;
  const coin = position.coin;
  const szi = parseFloat(position.szi);
  const unrealizedPnl = parseFloat(position.unrealizedPnl);
  const side = szi > 0 ? 'LONG' : 'SHORT';
  const coinColor = getCoinColor(coin);

  return `
    <div class="vault-position">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: var(--space-xs);">
          <strong style="color: ${coinColor};">${coin}</strong>
          <span style="background: ${side === 'SHORT' ? '#f44336' : '#4caf50'}; color: white; padding: 4px 10px; border-radius: var(--radius-sm); font-size: 12px; font-weight: 600;">${side}</span>
        </div>
        <div style="text-align: right;">
          <div class="${unrealizedPnl >= 0 ? 'positive' : 'negative'}" style="font-weight: 600;">
            ${formatCurrency(unrealizedPnl)}
          </div>
          <div class="caption" style="font-size: 11px;">
            Size: ${formatNumber(Math.abs(szi))}
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Attach event listeners to vault widget
 */
function attachVaultWidgetEvents(container) {
  const refreshBtn = container.querySelector('[data-action="refreshVault"]');
  
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      try {
        refreshBtn.disabled = true;
        refreshBtn.style.opacity = '0.5';
        
        await loadVaultData();
        
        // Re-render widget
        renderVaultWidget(container.parentElement, { 
          showHeader: true,
          compact: container.querySelector('.vault-widget-compact') !== null
        });
      } catch (error) {
        console.error('[VaultWidget] Refresh failed:', error);
      } finally {
        refreshBtn.disabled = false;
        refreshBtn.style.opacity = '1';
      }
    });
  }
}

/**
 * Update existing vault widget without full re-render
 */
export function updateVaultWidget(container) {
  const widget = container.querySelector('#vaultWidget');
  if (!widget) return;
  
  // Re-render the widget
  renderVaultWidget(container, {
    showHeader: true,
    compact: widget.classList.contains('vault-widget-compact')
  });
}
