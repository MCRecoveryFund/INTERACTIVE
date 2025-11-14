/**
 * MC Recovery Fund - Dashboard Component  
 * Полная аналитика с данными из Hyperliquid API
 * Дизайн: Верхний блок MC Recovery Vault + История сделок + Статистика
 */

import { AppState } from '../core/state.js';
import { HYPERLIQUID_API } from '../core/config.js';
import { loadDashboardData } from '../modules/api.js';
import { formatCurrency, formatNumber, formatPercent, getAPRClass } from '../utils/helpers.js';

let dashboardData = {
  loading: false,
  error: null,
  data: null,
  lastUpdated: 0
};

export async function render(container, params = {}) {
  // Initial render with loading state
  container.innerHTML = renderDashboard();

  // Load data if not already loading
  if (!dashboardData.loading && (!dashboardData.data || Date.now() - dashboardData.lastUpdated > 60000)) {
    await loadDashboard();
    // Re-render with data
    container.innerHTML = renderDashboard();
    attachEventListeners(container);
  } else {
    attachEventListeners(container);
  }
}

async function loadDashboard() {
  dashboardData.loading = true;
  dashboardData.error = null;

  try {
    const data = await loadDashboardData();
    dashboardData.data = data;
    dashboardData.lastUpdated = Date.now();
    dashboardData.loading = false;
  } catch (error) {
    console.error('[Dashboard] Failed to load:', error);
    dashboardData.error = error.message;
    dashboardData.loading = false;
  }
}

function renderDashboard() {
  if (dashboardData.loading) {
    return `
      <div class="hero">
        <h1 class="hero-title">💼 Дашборд</h1>
        <p class="hero-subtitle">Аналитическая панель инвестора</p>
      </div>
      <div class="card" style="text-align: center; padding: var(--space-xl) 0;">
        <div class="spinner"></div>
        <p class="caption" style="margin-top: var(--space-md);">Загрузка данных дашборда...</p>
      </div>
    `;
  }

  if (dashboardData.error) {
    return `
      <div class="hero">
        <h1 class="hero-title">💼 Дашборд</h1>
        <p class="hero-subtitle">Аналитическая панель инвестора</p>
      </div>
      <div class="card" style="text-align: center; padding: var(--space-lg);">
        <p style="color: var(--color-error); margin-bottom: var(--space-md);">⚠️ Ошибка загрузки: ${dashboardData.error}</p>
        <button class="btn btn-primary" data-action="retryDashboard">🔄 Повторить</button>
      </div>
    `;
  }

  if (!dashboardData.data) {
    return `
      <div class="hero">
        <h1 class="hero-title">💼 Дашборд</h1>
        <p class="hero-subtitle">Аналитическая панель инвестора</p>
      </div>
      <div class="card" style="text-align: center; padding: var(--space-lg);">
        <p class="caption">Нет данных. Нажмите кнопку для загрузки.</p>
        <button class="btn btn-primary" data-action="retryDashboard" style="margin-top: var(--space-md);">Загрузить</button>
      </div>
    `;
  }

  const { positions, portfolio, vaultDetails, referral, fees, lastUpdated } = dashboardData.data;
  const accountValue = positions?.marginSummary?.accountValue || "0";
  const totalPnl = positions?.marginSummary?.totalNtlPos || "0";
  const openPositions = positions?.assetPositions?.filter(ap => ap.position) || [];
  
  // Portfolio stats
  const allTimeData = portfolio?.find(([period]) => period === "allTime")?.[1];
  const dayData = portfolio?.find(([period]) => period === "day")?.[1];
  const weekData = portfolio?.find(([period]) => period === "week")?.[1];
  
  const allTimePnl = allTimeData?.pnlHistory?.slice(-1)[0]?.[1] || "0";
  const dayPnl = dayData?.pnlHistory?.slice(-1)[0]?.[1] || "0";
  const weekPnl = weekData?.pnlHistory?.slice(-1)[0]?.[1] || "0";

  const lastUpdateTime = lastUpdated ? new Date(lastUpdated).toLocaleString("ru-RU") : "";

  return `
    <div class="hero">
      <h1 class="hero-title">💼 Дашборд</h1>
      <p class="hero-subtitle">Аналитическая панель инвестора</p>
      ${lastUpdateTime ? `<p class="caption" style="margin-top: var(--space-xs);">Обновлено: ${lastUpdateTime}</p>` : ""}
    </div>

    <!-- Key Metrics -->
    <div class="card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-md);">
        <h3>📈 Ключевые показатели</h3>
        <button class="btn-icon" data-action="refreshDashboard" aria-label="Обновить">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
          </svg>
        </button>
      </div>
      
      <div class="vault-metrics" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
        <div class="vault-metric">
          <span class="caption">Account Value</span>
          <strong style="font-size: 24px; color: var(--color-success);">${formatCurrency(accountValue)}</strong>
        </div>
        <div class="vault-metric">
          <span class="caption">All-Time PnL</span>
          <strong style="font-size: 20px;" class="${parseFloat(allTimePnl) >= 0 ? 'positive' : 'negative'}">
            ${formatCurrency(allTimePnl)}
          </strong>
        </div>
        <div class="vault-metric">
          <span class="caption">Week PnL</span>
          <strong style="font-size: 18px;" class="${parseFloat(weekPnl) >= 0 ? 'positive' : 'negative'}">
            ${formatCurrency(weekPnl)}
          </strong>
        </div>
        <div class="vault-metric">
          <span class="caption">Day PnL</span>
          <strong style="font-size: 18px;" class="${parseFloat(dayPnl) >= 0 ? 'positive' : 'negative'}">
            ${formatCurrency(dayPnl)}
          </strong>
        </div>
      </div>
    </div>

    <!-- Open Positions -->
    ${openPositions.length > 0 ? `
      <div class="card">
        <h3 style="margin-bottom: var(--space-md);">📊 Открытые позиции (${openPositions.length})</h3>
        <div class="vault-positions">
          ${openPositions.map(renderPosition).join('')}
        </div>
      </div>
    ` : `
      <div class="card" style="text-align: center; padding: var(--space-lg);">
        <p class="caption">Нет открытых позиций</p>
      </div>
    `}

    <!-- Additional Info -->
    ${vaultDetails ? `
      <div class="card">
        <h3 style="margin-bottom: var(--space-md);">🏦 Информация о Vault</h3>
        <div class="vault-metrics">
          <div class="vault-metric">
            <span class="caption">APR</span>
            <strong style="font-size: 20px;" class="${getAPRClass(vaultDetails.apr || 0)}">
              ${formatPercent(vaultDetails.apr || 0)}
            </strong>
          </div>
          <div class="vault-metric">
            <span class="caption">Followers</span>
            <strong style="font-size: 18px;">${formatNumber(vaultDetails.followers?.length || 0)}</strong>
          </div>
          <div class="vault-metric">
            <span class="caption">Max Distributable</span>
            <strong style="font-size: 18px;">${formatCurrency(vaultDetails.maxDistributable || 0)}</strong>
          </div>
          <div class="vault-metric">
            <span class="caption">Status</span>
            <strong style="font-size: 16px; color: var(${vaultDetails.isClosed ? '--color-error' : '--color-success'});">
              ${vaultDetails.isClosed ? '🔒 Closed' : '✅ Open'}
            </strong>
          </div>
        </div>
        ${vaultDetails.description ? `
          <p class="caption" style="margin-top: var(--space-md); line-height: 1.6;">
            ${vaultDetails.description}
          </p>
        ` : ''}
      </div>
    ` : ''}

    <!-- Fees & Referrals (if available) -->
    ${(fees || referral) ? `
      <div class="card">
        <h3 style="margin-bottom: var(--space-md);">💰 Fees & Referrals</h3>
        <div class="vault-metrics">
          ${fees ? `
            <div class="vault-metric">
              <span class="caption">Total Fees Paid</span>
              <strong style="font-size: 18px;">${formatCurrency(fees.totalFees || 0)}</strong>
            </div>
          ` : ''}
          ${referral ? `
            <div class="vault-metric">
              <span class="caption">Referral Rewards</span>
              <strong style="font-size: 18px; color: var(--color-success);">
                ${formatCurrency(referral.claimedRewards || 0)}
              </strong>
            </div>
            <div class="vault-metric">
              <span class="caption">Unclaimed Rewards</span>
              <strong style="font-size: 18px; color: var(--color-warning);">
                ${formatCurrency(referral.unclaimedRewards || 0)}
              </strong>
            </div>
          ` : ''}
        </div>
      </div>
    ` : ''}
  `;
}

function renderPosition(assetPos) {
  const position = assetPos.position;
  const coin = position.coin;
  const szi = parseFloat(position.szi);
  const unrealizedPnl = parseFloat(position.unrealizedPnl);
  const entryPx = parseFloat(position.entryPx);
  const leverage = position.leverage?.value || "N/A";
  const side = szi > 0 ? 'LONG' : 'SHORT';

  return `
    <div class="vault-position">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-xs);">
        <div>
          <strong style="font-size: 16px;">${coin}</strong>
          <span class="badge badge-${side.toLowerCase()}" style="margin-left: var(--space-xs);">${side}</span>
          <span class="caption" style="margin-left: var(--space-xs);">@${formatNumber(entryPx)}</span>
        </div>
        <div style="text-align: right;">
          <div class="${unrealizedPnl >= 0 ? 'positive' : 'negative'}" style="font-weight: 700; font-size: 16px;">
            ${formatCurrency(unrealizedPnl)}
          </div>
        </div>
      </div>
      <div style="display: flex; gap: var(--space-md); font-size: 13px; color: var(--text-muted);">
        <span>Size: ${formatNumber(Math.abs(szi))}</span>
        <span>Leverage: ${leverage}x</span>
        <span>ROI: ${formatPercent((unrealizedPnl / (Math.abs(szi) * entryPx)) * 100)}</span>
      </div>
    </div>
  `;
}

function attachEventListeners(container) {
  const refreshBtn = container.querySelector('[data-action="refreshDashboard"]');
  const retryBtn = container.querySelector('[data-action="retryDashboard"]');

  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      refreshBtn.disabled = true;
      refreshBtn.style.opacity = '0.5';
      await loadDashboard();
      render(container);
    });
  }

  if (retryBtn) {
    retryBtn.addEventListener('click', async () => {
      retryBtn.disabled = true;
      retryBtn.textContent = 'Загрузка...';
      await loadDashboard();
      render(container);
    });
  }
}
