/**
 * MC Recovery Fund - Game UI Module
 * UI функции и рендеринг для торговой игры
 */

import { GameState } from '../core/state.js';
import { hapticFeedback } from '../modules/telegram.js';

/**
 * Основная функция рендеринга игры
 */
export function render(container) {
  container.innerHTML = `
    <div class="game-container">
      <!-- Панель цен -->
      <div class="price-panel">
        <div class="price-display">
          <div class="asset-selector">
            <button class="asset-btn ${GameState.selectedAsset === 'BTC' ? 'active' : ''}" data-asset="BTC">BTC</button>
            <button class="asset-btn ${GameState.selectedAsset === 'ETH' ? 'active' : ''}" data-asset="ETH">ETH</button>
            <button class="asset-btn ${GameState.selectedAsset === 'SOL' ? 'active' : ''}" data-asset="SOL">SOL</button>
            <button class="asset-btn ${GameState.selectedAsset === 'HYPE' ? 'active' : ''}" data-asset="HYPE">HYPE</button>
          </div>
          <div class="current-price">
            <div class="price-value" id="currentPrice">$0.00</div>
            <div class="price-change" id="priceChange">0.00%</div>
          </div>
        </div>
        <div class="chart-container">
          <canvas id="priceChart" width="300" height="200"></canvas>
          <div class="chart-intervals">
            <button class="interval-btn active" data-interval="1h">1ч</button>
            <button class="interval-btn" data-interval="4h">4ч</button>
            <button class="interval-btn" data-interval="1d">1д</button>
          </div>
        </div>
      </div>

      <!-- Панель игры -->
      <div class="game-panel">
        <div class="balance-section">
          <div class="balance-display">
            <div class="balance-label">Баланс TAPS</div>
            <div class="balance-value" id="balance">${GameState.balance.toLocaleString()}</div>
          </div>
          <div class="tap-section">
            <canvas id="tapCanvas" width="200" height="200" class="tap-canvas"></canvas>
            <div class="tap-instruction">Нажимайте для заработка TAPS</div>
          </div>
        </div>

        <div class="betting-section">
          <div class="bet-amount">
            <label for="betAmount">Сумма ставки:</label>
            <input type="number" id="betAmount" min="10" max="1000" value="10" step="10">
            <div class="potential-profit" id="potentialProfit">Прибыль: $8.00</div>
          </div>
          <div class="bet-buttons">
            <button class="btn btn-success" id="longButton" data-direction="long">
              📈 LONG
            </button>
            <button class="btn btn-danger" id="shortButton" data-direction="short">
              📉 SHORT
            </button>
          </div>
        </div>
      </div>

      <!-- Панель позиций -->
      <div class="positions-panel">
        <div class="panel-tabs">
          <button class="tab-btn active" data-panel="active">Активные (0)</button>
          <button class="tab-btn" data-panel="history">История</button>
        </div>
        <div class="panel-content">
          <div class="active-positions" id="activePositions">
            <p class="text-muted">Нет активных позиций</p>
          </div>
          <div class="bet-history" id="betHistory" style="display: none;">
            <p class="text-muted">Нет истории ставок</p>
          </div>
        </div>
      </div>

      <!-- Статистика -->
      <div class="stats-section">
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-label">Всего ставок</div>
            <div class="stat-value" id="totalBets">${GameState.stats.totalBets}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Win Rate</div>
            <div class="stat-value" id="winRate">${GameState.stats.winRate.toFixed(1)}%</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Общая прибыль</div>
            <div class="stat-value ${GameState.stats.totalProfit >= 0 ? 'text-success' : 'text-error'}" id="totalProfit">
              $${GameState.stats.totalProfit.toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Инициализация
  setupEventListeners();
  initializeTapCanvas();
  updateUI();
}

/**
 * Настройка обработчиков событий
 */
function setupEventListeners() {
  // Выбор актива
  document.querySelectorAll('.asset-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const asset = e.target.dataset.asset;
      selectAsset(asset);
      
      // Обновляем активную кнопку
      document.querySelectorAll('.asset-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      
      hapticFeedback('light');
    });
  });

  // Интервалы графика
  document.querySelectorAll('.interval-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const interval = e.target.dataset.interval;
      changeChartInterval(interval);
      
      // Обновляем активную кнопку
      document.querySelectorAll('.interval-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      
      hapticFeedback('light');
    });
  });

  // Кнопки ставок
  document.getElementById('longButton')?.addEventListener('click', () => {
    const amount = parseInt(document.getElementById('betAmount').value);
    placeBet('long', amount);
  });

  document.getElementById('shortButton')?.addEventListener('click', () => {
    const amount = parseInt(document.getElementById('betAmount').value);
    placeBet('short', amount);
  });

  // Изменение суммы ставки
  document.getElementById('betAmount')?.addEventListener('input', (e) => {
    updatePotentialProfit(parseInt(e.target.value) || 0);
  });

  // Переключение панелей
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const panel = e.target.dataset.panel;
      switchPanel(panel);
      
      // Обновляем активную кнопку
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      
      hapticFeedback('light');
    });
  });
}

/**
 * Инициализация canvas для тапов
 */
function initializeTapCanvas() {
  const canvas = document.getElementById('tapCanvas');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  
  // Рисуем круг для тапов
  function drawTapCircle() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Внешний круг
    ctx.beginPath();
    ctx.arc(100, 100, 80, 0, Math.PI * 2);
    ctx.fillStyle = '#1326FD';
    ctx.fill();
    
    // Внутренний круг
    ctx.beginPath();
    ctx.arc(100, 100, 60, 0, Math.PI * 2);
    ctx.fillStyle = '#0f1fdb';
    ctx.fill();
    
    // Текст
    ctx.fillStyle = 'white';
    ctx.font = 'bold 24px Inter';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('TAP', 100, 100);
  }
  
  drawTapCircle();
  
  // Обработчик тапов
  canvas.addEventListener('click', handleTap);
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    handleTap({ clientX: touch.clientX, clientY: touch.clientY, currentTarget: canvas });
  });
}

/**
 * Переключение панели
 */
export function switchPanel(panelName) {
  const activePanel = document.getElementById('activePositions');
  const historyPanel = document.getElementById('betHistory');
  
  if (panelName === 'active') {
    activePanel.style.display = 'block';
    historyPanel.style.display = 'none';
  } else {
    activePanel.style.display = 'none';
    historyPanel.style.display = 'block';
    renderBetHistory();
  }
}

/**
 * Обновление потенциальной прибыли
 */
export function updatePotentialProfit(amount) {
  const profitElement = document.getElementById('potentialProfit');
  if (profitElement) {
    const profit = amount * 0.8; // 80% от ставки
    profitElement.textContent = `Прибыль: $${profit.toFixed(2)}`;
  }
}

/**
 * Выбор актива
 */
function selectAsset(asset) {
  if (typeof window.selectGameAsset === 'function') {
    window.selectGameAsset(asset);
  }
}

/**
 * Изменение интервала графика
 */
function changeChartInterval(interval) {
  if (typeof window.loadPriceDataForInterval === 'function') {
    window.loadPriceDataForInterval(interval);
  }
}

/**
 * Размещение ставки
 */
function placeBet(direction, amount) {
  if (typeof window.placeGameBet === 'function') {
    window.placeGameBet(direction, amount);
  }
}

/**
 * Обработка тапа
 */
function handleTap(e) {
  if (typeof window.handleGameTap === 'function') {
    window.handleGameTap(e);
  }
}

/**
 * Обновление UI
 */
export function updateUI() {
  updateBalance();
  updatePriceDisplay();
  updateActivePositions();
  updateBetButtons();
  updateStats();
}

/**
 * Обновление баланса
 */
function updateBalance() {
  const balanceElement = document.getElementById('balance');
  if (balanceElement) {
    balanceElement.textContent = GameState.balance.toLocaleString();
  }
}

/**
 * Обновление отображения цен
 */
function updatePriceDisplay() {
  const asset = GameState.selectedAsset;
  const priceData = GameState.prices[asset];
  
  if (!priceData || !priceData.current) return;
  
  const priceElement = document.getElementById('currentPrice');
  const changeElement = document.getElementById('priceChange');
  
  if (priceElement) {
    priceElement.textContent = `$${priceData.current.toFixed(2)}`;
  }
  
  if (changeElement && priceData.history.length > 1) {
    const change = calculatePriceChange(priceData.history);
    changeElement.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
    changeElement.className = change >= 0 ? 'text-success' : 'text-error';
  }
}

/**
 * Расчет изменения цены
 */
function calculatePriceChange(history) {
  if (!history || history.length < 2) return 0;
  const oldPrice = history[0].price;
  const newPrice = history[history.length - 1].price;
  return ((newPrice - oldPrice) / oldPrice) * 100;
}

/**
 * Обновление активных позиций
 */
function updateActivePositions() {
  const container = document.getElementById('activePositions');
  if (!container) return;
  
  // Обновляем счетчик на табе
  const activeTab = document.querySelector('[data-panel="active"]');
  if (activeTab) {
    activeTab.textContent = `Активные (${GameState.activeBets.length})`;
  }
  
  if (GameState.activeBets.length === 0) {
    container.innerHTML = '<p class="text-muted">Нет активных позиций</p>';
    return;
  }
  
  const html = GameState.activeBets.map(bet => {
    const currentPrice = GameState.prices[bet.asset].current;
    const pnl = bet.direction === 'long' 
      ? (currentPrice - bet.openPrice) / bet.openPrice * bet.amount
      : (bet.openPrice - currentPrice) / bet.openPrice * bet.amount;
    
    const timeLeft = Math.max(0, bet.duration - (Date.now() - bet.startTime));
    const secondsLeft = Math.ceil(timeLeft / 1000);
    
    return `
      <div class="active-bet">
        <div class="bet-header">
          <span class="bet-asset">${bet.asset}</span>
          <span class="bet-direction bet-${bet.direction}">${bet.direction.toUpperCase()}</span>
          <span class="bet-timer">${secondsLeft}s</span>
        </div>
        <div class="bet-details">
          <div>Ставка: $${bet.amount}</div>
          <div>Открытие: $${bet.openPrice.toFixed(2)}</div>
          <div>Текущая: $${currentPrice.toFixed(2)}</div>
          <div class="${pnl >= 0 ? 'text-success' : 'text-error'}">
            PnL: $${pnl.toFixed(2)}
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  container.innerHTML = html;
}

/**
 * Обновление кнопок ставок
 */
function updateBetButtons() {
  const betAmount = document.getElementById('betAmount');
  const longButton = document.getElementById('longButton');
  const shortButton = document.getElementById('shortButton');
  
  if (betAmount) {
    const maxBet = Math.min(GameState.balance, 1000);
    betAmount.max = maxBet;
    
    if (parseInt(betAmount.value) > maxBet) {
      betAmount.value = maxBet;
    }
  }
  
  if (longButton && shortButton) {
    const disabled = GameState.balance < 10 || !GameState.isOnline;
    longButton.disabled = disabled;
    shortButton.disabled = disabled;
  }
}

/**
 * Обновление статистики
 */
function updateStats() {
  document.getElementById('totalBets').textContent = GameState.stats.totalBets;
  document.getElementById('winRate').textContent = `${GameState.stats.winRate.toFixed(1)}%`;
  
  const profitElement = document.getElementById('totalProfit');
  profitElement.textContent = `$${GameState.stats.totalProfit.toFixed(2)}`;
  profitElement.className = `stat-value ${GameState.stats.totalProfit >= 0 ? 'text-success' : 'text-error'}`;
}

/**
 * Рендеринг истории ставок
 */
function renderBetHistory() {
  const container = document.getElementById('betHistory');
  if (!container) return;
  
  if (GameState.betHistory.length === 0) {
    container.innerHTML = '<p class="text-muted">Нет истории ставок</p>';
    return;
  }
  
  // Показываем последние 20 ставок
  const recentBets = GameState.betHistory.slice(-20).reverse();
  
  const html = recentBets.map(bet => `
    <div class="bet-history-item">
      <div class="bet-header">
        <span class="bet-asset">${bet.asset}</span>
        <span class="bet-direction bet-${bet.direction}">${bet.direction.toUpperCase()}</span>
        <span class="bet-status ${bet.won ? 'status-win' : 'status-loss'}">
          ${bet.won ? 'WIN' : 'LOSS'}
        </span>
      </div>
      <div class="bet-details">
        <div>Ставка: $${bet.amount}</div>
        <div>Открытие: $${bet.openPrice.toFixed(2)}</div>
        <div>Закрытие: $${bet.closePrice.toFixed(2)}</div>
        <div class="${bet.pnl >= 0 ? 'text-success' : 'text-error'}">
          PnL: $${bet.pnl.toFixed(2)}
        </div>
      </div>
    </div>
  `).join('');
  
  container.innerHTML = html;
}

/**
 * Показать уведомление
 */
export function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

/**
 * Очистка
 */
export function cleanup() {
  // Удаляем обработчики событий
  const canvas = document.getElementById('tapCanvas');
  if (canvas) {
    canvas.removeEventListener('click', handleTap);
    canvas.removeEventListener('touchstart', handleTap);
  }
}
