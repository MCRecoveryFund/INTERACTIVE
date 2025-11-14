/**
 * MC Recovery Fund - Dashboard Component  
 * MC Recovery Vault - данные из Hyperliquid API
 * Статистика и История - данные из dashboard_data.json
 */

import { AppState } from '../core/state.js';
import { HYPERLIQUID_API } from '../core/config.js';
import { loadDashboardData } from '../modules/api.js';
import { formatCurrency, formatNumber, formatPercent, getAPRClass } from '../utils/helpers.js';

let dashboardState = {
  vaultLoading: false,
  vaultError: null,
  vaultData: null,
  lastUpdated: 0,
  filters: {
    direction: 'all', // 'all', 'long', 'short'
    coin: 'all' // 'all', 'BTC', 'ETH', etc.
  }
};

export async function render(container, params = {}) {
  // Get static data from APP_DATA
  const staticData = window.APP_DATA.dashboard_data;
  
  // Initial render with loading state
  container.innerHTML = renderDashboard(staticData);

  // Load vault data if not already loading
  if (!dashboardState.vaultLoading && (!dashboardState.vaultData || Date.now() - dashboardState.lastUpdated > 60000)) {
    await loadVaultData();
    // Re-render with vault data
    container.innerHTML = renderDashboard(staticData);
    attachEventListeners(container);
  } else {
    attachEventListeners(container);
  }
}

async function loadVaultData() {
  dashboardState.vaultLoading = true;
  dashboardState.vaultError = null;

  try {
    const data = await loadDashboardData();
    dashboardState.vaultData = data;
    dashboardState.lastUpdated = Date.now();
    dashboardState.vaultLoading = false;
  } catch (error) {
    console.error('[Dashboard] Failed to load vault data:', error);
    dashboardState.vaultError = error.message;
    dashboardState.vaultLoading = false;
  }
}

/**
 * Calculate statistics from static dashboard data
 */
function calculateStats(positions) {
  const stats = {
    totalTrades: 0,
    successfulTrades: 0,
    totalVolume: 0,
    totalFees: 0,
    totalFunding: 0,
    grossPnl: 0,
    netPnl: 0,
    assetBreakdown: {}, // { coin: { pnl, trades, successfulTrades } }
  };

  if (!positions || positions.length === 0) return stats;

  // Process positions from dashboard_data.json
  positions.forEach(pos => {
    const coin = pos.coin;
    const pnl = parseFloat(pos.pnl || 0);
    const unrealizedPnl = parseFloat(pos.unrealizedPnl || 0);
    const fee = parseFloat(pos.fee || 0);
    const funding = parseFloat(pos.funding || 0);
    const volume = parseFloat(pos.volumeWithLeverage || 0);

    stats.totalTrades++;
    stats.totalVolume += volume;
    stats.totalFees += fee;
    stats.totalFunding += funding;
    // Гросс прибыль = прибыль до вычета комиссий = pnl + fee
    stats.grossPnl += (pnl + fee);
    stats.netPnl += pnl;

    if (pnl > 0) {
      stats.successfulTrades++;
    }

    // Asset breakdown
    if (!stats.assetBreakdown[coin]) {
      stats.assetBreakdown[coin] = { pnl: 0, trades: 0, successfulTrades: 0 };
    }
    stats.assetBreakdown[coin].pnl += pnl;
    stats.assetBreakdown[coin].trades++;
    if (pnl > 0) {
      stats.assetBreakdown[coin].successfulTrades++;
    }
  });

  return stats;
}


function renderDashboard(staticData) {
  if (dashboardState.vaultLoading) {
    return `
      <div style="text-align: center; padding: var(--space-xl) 0;">
        <div class="spinner"></div>
        <p class="caption" style="margin-top: var(--space-md);">Загрузка дашборда...</p>
      </div>
    `;
  }

  if (dashboardState.vaultError) {
    return `
      <div class="card" style="text-align: center; padding: var(--space-lg);">
        <p style="color: var(--color-error); margin-bottom: var(--space-md);">⚠️ Ошибка загрузки vault: ${dashboardState.vaultError}</p>
        <button class="btn btn-primary" data-action="retryDashboard">🔄 Повторить</button>
      </div>
    `;
  }

  if (!staticData) {
    return `
      <div class="card" style="text-align: center; padding: var(--space-lg);">
        <p class="caption">Нет статических данных dashboard_data.json</p>
      </div>
    `;
  }

  // Vault data from API (может быть null при первой загрузке)
  const vaultData = dashboardState.vaultData;
  const { positions, portfolio, vaultDetails, lastUpdated } = vaultData || {};
  const accountValue = positions?.marginSummary?.accountValue || "0";
  const openPositions = positions?.assetPositions?.filter(ap => ap.position) || [];
  
  // Portfolio stats
  const allTimeData = portfolio?.find(([period]) => period === "allTime")?.[1];
  const allTimePnl = allTimeData?.pnlHistory?.slice(-1)[0]?.[1] || "0";
  
  // Calculate stats from static data
  const allTrades = staticData.positions || [];
  
  // Apply filters
  const trades = allTrades.filter(pos => {
    const directionMatch = dashboardState.filters.direction === 'all' || 
                           pos.direction.toLowerCase() === dashboardState.filters.direction;
    const coinMatch = dashboardState.filters.coin === 'all' || 
                      pos.coin === dashboardState.filters.coin;
    return directionMatch && coinMatch;
  });
  
  const stats = calculateStats(trades);
  
  // Get unique coins for filter
  const uniqueCoins = [...new Set(allTrades.map(p => p.coin))].sort();
  
  // APR from vault
  const apr = vaultDetails?.apr || 0;

  const lastUpdateTime = lastUpdated ? new Date(lastUpdated).toLocaleString("ru-RU", {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }) : "Загрузка...";

  return `
    <!-- MC Recovery Vault Header -->
    <div class="card" style="background: var(--surface-1); border: 1px solid var(--border-color);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-sm);">
        <h2 style="font-size: 20px; display: flex; align-items: center; gap: var(--space-sm);">
          🔒 MC Recovery Vault
        </h2>
        <button class="btn-icon" data-action="refreshDashboard" aria-label="Обновить" title="Обновить данные">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
          </svg>
        </button>
      </div>
      ${lastUpdateTime ? `<p class="caption" style="font-size: 12px; margin-bottom: var(--space-md);">Обновлено: ${lastUpdateTime}</p>` : ''}

      <!-- Main Metrics -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: var(--space-md); margin-bottom: var(--space-lg);">
        <div class="card" style="background: var(--surface-2); padding: var(--space-md);">
          <p class="caption" style="margin-bottom: var(--space-xs);">Account Value</p>
          <h3 style="font-size: 28px; color: var(--color-success); margin: 0;">${formatCurrency(accountValue)}</h3>
        </div>
        <div class="card" style="background: var(--surface-2); padding: var(--space-md);">
          <p class="caption" style="margin-bottom: var(--space-xs);">APR</p>
          <h3 style="font-size: 28px; margin: 0;" class="${getAPRClass(apr)}">${formatPercent(apr)}</h3>
        </div>
        <div class="card" style="background: var(--surface-2); padding: var(--space-md);">
          <p class="caption" style="margin-bottom: var(--space-xs);">All-Time PnL</p>
          <h3 style="font-size: 28px; margin: 0;" class="${parseFloat(allTimePnl) >= 0 ? 'positive' : 'negative'}">
            ${formatCurrency(allTimePnl)}
          </h3>
        </div>
      </div>

      <!-- Open Positions -->
      <h4 style="font-size: 16px; margin-bottom: var(--space-md);">Открытые позиции (${openPositions.length})</h4>
      ${openPositions.length > 0 ? `
        <div class="vault-positions" style="max-height: 300px; overflow-y: auto;">
          ${openPositions.slice(0, 1).map(renderOpenPosition).join('')}
        </div>
      ` : `<p class="caption">Нет открытых позиций</p>`}

      <!-- Link to Hyperliquid -->
      <button 
        class="btn btn-primary" 
        data-action="openHyperliquid"
        style="width: 100%; margin-top: var(--space-md); display: flex; align-items: center; justify-content: center; gap: var(--space-sm);"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
        </svg>
        Открыть на Hyperliquid
      </button>
    </div>

    <!-- Additional Stats -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: var(--space-md); margin-top: var(--space-lg);">
      ${renderStatCard('Общая прибыль', formatCurrency(stats.netPnl), 'с учетом комиссий', stats.netPnl >= 0)}
      ${renderStatCard('Гросс прибыль', formatCurrency(stats.grossPnl), 'до вычета комиссий', stats.grossPnl >= 0)}
      ${renderStatCard('Успешные позиции', stats.successfulTrades, `количество успешных позиций`)}
      ${renderStatCard('Всего позиций', stats.totalTrades, 'торговых позиций')}
      ${renderStatCard('Общие комиссии', formatCurrency(stats.totalFees), 'комиссии')}
      ${renderStatCard('Фандинг', formatCurrency(stats.totalFunding), 'начисления фандинга', stats.totalFunding >= 0)}
    </div>

    <!-- Trading History -->
    ${allTrades.length > 0 ? `
      <div class="card" style="margin-top: var(--space-lg);">
        <h3 style="margin-bottom: var(--space-md);">Торговые позиции</h3>
        
        <!-- Filters -->
        <div style="display: flex; gap: var(--space-md); margin-bottom: var(--space-md); flex-wrap: wrap;">
          <div style="flex: 1; min-width: 200px;">
            <label class="caption" style="display: block; margin-bottom: var(--space-xs);">Направление</label>
            <select id="filter-direction" class="filter-select" style="width: 100%; padding: var(--space-sm); border-radius: var(--radius-sm); border: 2px solid var(--border-strong); background: var(--surface-2); color: var(--color-text); font-family: var(--font-family);">
              <option value="all">Все позиции</option>
              <option value="long">Только LONG</option>
              <option value="short">Только SHORT</option>
            </select>
          </div>
          <div style="flex: 1; min-width: 200px;">
            <label class="caption" style="display: block; margin-bottom: var(--space-xs);">Монета</label>
            <select id="filter-coin" class="filter-select" style="width: 100%; padding: var(--space-sm); border-radius: var(--radius-sm); border: 2px solid var(--border-strong); background: var(--surface-2); color: var(--color-text); font-family: var(--font-family);">
              <option value="all">Все монеты</option>
              ${uniqueCoins.map(coin => `<option value="${coin}">${coin}</option>`).join('')}
            </select>
          </div>
        </div>
        
        <p class="caption" style="margin-bottom: var(--space-md);">Показано: ${Math.min(12, trades.length)} из ${allTrades.length} ${trades.length !== allTrades.length ? `(отфильтровано: ${trades.length})` : ''}</p>
        <div style="display: flex; flex-direction: column; gap: var(--space-md);">
          ${trades.slice(0, 12).map(renderTradeCard).join('')}
        </div>
      </div>
    ` : ''}
  `;
}

function renderStatCard(title, value, subtitle, positive = null) {
  let colorClass = '';
  if (positive !== null) {
    colorClass = positive ? 'positive' : 'negative';
  }

  return `
    <div class="card" style="background: var(--surface-2); padding: var(--space-md);">
      <p class="caption" style="margin-bottom: var(--space-xs);">${title}</p>
      <h3 style="font-size: 24px; margin: 0 0 var(--space-xs) 0;" class="${colorClass}">${value}</h3>
      <p style="font-size: 12px; color: var(--text-muted);">${subtitle}</p>
    </div>
  `;
}

function renderOpenPosition(assetPos) {
  const position = assetPos.position;
  const coin = position.coin;
  const szi = parseFloat(position.szi);
  const unrealizedPnl = parseFloat(position.unrealizedPnl);
  const entryPx = parseFloat(position.entryPx);
  const leverage = position.leverage?.value || "N/A";
  const side = szi > 0 ? 'LONG' : 'SHORT';
  const coinColor = getCoinColor(coin);

  return `
    <div class="card" style="background: var(--surface-2); padding: var(--space-lg); margin-bottom: var(--space-md); border: 1px solid var(--border);">
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: var(--space-md);">
        <div>
          <div style="display: flex; align-items: center; gap: var(--space-sm); margin-bottom: var(--space-xs);">
            <h4 style="font-size: 20px; color: ${coinColor}; margin: 0; font-weight: 700;">${coin}</h4>
            <span style="background: ${side === 'SHORT' ? '#f44336' : '#4caf50'}; color: white; padding: 4px 10px; border-radius: var(--radius-sm); font-size: 12px; font-weight: 600;">${side}</span>
          </div>
        </div>
        <div style="text-align: right;">
          <div class="${unrealizedPnl >= 0 ? 'positive' : 'negative'}" style="font-weight: 700; font-size: 18px;">
            ${formatCurrency(unrealizedPnl)}
          </div>
        </div>
      </div>
      
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-md); font-size: 14px;">
        <div>
          <span class="caption">ПЛЕЧО</span>
          <div style="font-weight: 600; margin-top: var(--space-xs);">x${leverage}</div>
        </div>
        <div>
          <span class="caption">ОБЪЕМ</span>
          <div style="font-weight: 600; margin-top: var(--space-xs);">${formatCurrency(Math.abs(szi) * entryPx)}</div>
        </div>
        <div>
          <span class="caption">МАРЖА</span>
          <div style="font-weight: 600; margin-top: var(--space-xs);">${formatCurrency(Math.abs(szi) * entryPx / (leverage === 'N/A' ? 1 : leverage))}</div>
        </div>
        <div>
          <span class="caption">Entry</span>
          <div style="font-weight: 600; margin-top: var(--space-xs);">$${formatNumber(entryPx)}</div>
        </div>
      </div>
    </div>
  `;
}

function renderTradeCard(position) {
  const dateRange = position.dateRange || '—';
  const side = position.direction.toUpperCase();
  const pnl = parseFloat(position.pnl || 0);
  const coinColor = getCoinColor(position.coin);

  return `
    <div class="card" style="background: var(--surface-2); padding: var(--space-lg); border: 1px solid var(--border);">
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: var(--space-md);">
        <div style="display: flex; align-items: center; gap: var(--space-sm); flex-wrap: wrap;">
          <h4 style="font-size: 18px; color: ${coinColor}; margin: 0; font-weight: 700;">${position.coin}</h4>
          <span style="font-size: 13px; color: var(--text-muted);">${dateRange}</span>
          <span style="background: ${side === 'SHORT' ? '#f44336' : '#4caf50'}; color: white; padding: 4px 10px; border-radius: var(--radius-sm); font-size: 12px; font-weight: 600;">${side}</span>
        </div>
        <div class="${pnl >= 0 ? 'positive' : 'negative'}" style="font-weight: 700; font-size: 16px;">
          ${formatCurrency(pnl)}
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: var(--space-md); font-size: 13px;">
        <div>
          <span class="caption">ПЛЕЧО</span>
          <div style="font-weight: 600; margin-top: var(--space-xs);">${position.leverage}</div>
        </div>
        <div>
          <span class="caption">ОБЪЕМ</span>
          <div style="font-weight: 600; margin-top: var(--space-xs);">${formatCurrency(position.volumeWithLeverage)}</div>
        </div>
        <div>
          <span class="caption">МАРЖА</span>
          <div style="font-weight: 600; margin-top: var(--space-xs);">${formatCurrency(position.margin)}</div>
        </div>
        <div>
          <span class="caption">КОМИССИЯ (FEE)</span>
          <div style="font-weight: 600; margin-top: var(--space-xs);">${formatCurrency(position.fee)}</div>
        </div>
        <div>
          <span class="caption">ФАНДИНГ (FUNDING)</span>
          <div style="font-weight: 600; margin-top: var(--space-xs);">${formatCurrency(position.funding)}</div>
        </div>
        <div>
          <span class="caption">ВРЕМЯ СДЕЛКИ</span>
          <div style="font-weight: 600; margin-top: var(--space-xs);">${position.duration}</div>
        </div>
      </div>
    </div>
  `;
}


// Helper function to get coin color from CSS variables
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

function attachEventListeners(container) {
  const refreshBtn = container.querySelector('[data-action="refreshDashboard"]');
  const retryBtn = container.querySelector('[data-action="retryDashboard"]');
  const hyperliquidBtn = container.querySelector('[data-action="openHyperliquid"]');
  const filterDirection = container.querySelector('#filter-direction');
  const filterCoin = container.querySelector('#filter-coin');

  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      refreshBtn.disabled = true;
      refreshBtn.style.opacity = '0.5';
      const staticData = window.APP_DATA.dashboard_data;
      await loadVaultData();
      container.innerHTML = renderDashboard(staticData);
      attachEventListeners(container);
    });
  }

  if (retryBtn) {
    retryBtn.addEventListener('click', async () => {
      retryBtn.disabled = true;
      retryBtn.textContent = 'Загрузка...';
      const staticData = window.APP_DATA.dashboard_data;
      await loadVaultData();
      container.innerHTML = renderDashboard(staticData);
      attachEventListeners(container);
    });
  }

  if (hyperliquidBtn) {
    hyperliquidBtn.addEventListener('click', () => {
      const vaultUrl = `https://app.hyperliquid.xyz/vaults/${HYPERLIQUID_API.vaultAddress}`;
      window.open(vaultUrl, '_blank', 'noopener,noreferrer');
    });
  }

  // Filter event listeners
  if (filterDirection) {
    filterDirection.value = dashboardState.filters.direction;
    filterDirection.addEventListener('change', (e) => {
      dashboardState.filters.direction = e.target.value;
      const staticData = window.APP_DATA.dashboard_data;
      container.innerHTML = renderDashboard(staticData);
      attachEventListeners(container);
    });
  }

  if (filterCoin) {
    filterCoin.value = dashboardState.filters.coin;
    filterCoin.addEventListener('change', (e) => {
      dashboardState.filters.coin = e.target.value;
      const staticData = window.APP_DATA.dashboard_data;
      container.innerHTML = renderDashboard(staticData);
      attachEventListeners(container);
    });
  }
}
