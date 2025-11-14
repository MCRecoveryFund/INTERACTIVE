/**
 * Game Component - Trading Simulator
 * Canvas-игра "Тапалка-Трейдинг симулятор"
 */

import { GameState } from "../core/state.js";
import { GAME_CONFIG } from "../core/config.js";
import { CanvasRenderer } from "../utils/canvas-renderer.js";
import { hapticFeedback, tg } from "../modules/telegram.js";
import {
  fetchCoinGeckoPrices,
  fetchMultipleMarketCharts,
} from "../modules/api.js";

let renderer = null;
let animationFrameId = null;
let tapCanvas = null;
let tapCtx = null;
let uiRefreshInterval = null;
let priceUpdateIntervalId = null;
const PRICE_UPDATE_INTERVAL = 30000;

// Вспомогательная функция для расчета изменения цены
function calculatePriceChange(history) {
  if (!history || history.length < 2) return 0;
  const oldPrice = history[0].price;
  const newPrice = history[history.length - 1].price;
  return ((newPrice - oldPrice) / oldPrice) * 100;
}

export function render(container) {
  loadGameState();

  const currentAsset = GameState.selectedAsset;
  const currentPrice = GameState.prices[currentAsset]?.current || 0;
  const priceHistory = GameState.prices[currentAsset]?.history || [];
  const priceChange = calculatePriceChange(priceHistory);

  container.innerHTML = `
    <div class="game-container">
      <!-- Terminal Header - Account Info -->
      <div class="terminal-header">
        <div class="account-balance">
          <div class="balance-item">
            <div class="balance-label">Баланс</div>
            <div class="balance-value" 
                 aria-live="polite" 
                 aria-atomic="true">${GameState.balance.toLocaleString()} TAPS</div>
          </div>
          <div class="balance-item">
            <div class="balance-label">Макс. баланс</div>
            <div class="balance-value ${
              GameState.maxBalance > GameState.balance ? "positive" : ""
            }" 
                 aria-live="polite" 
                 aria-atomic="true">${GameState.maxBalance.toLocaleString()}</div>
          </div>
          <div class="balance-item">
            <div class="balance-label">Всего тапов</div>
            <div class="balance-value" 
                 aria-live="polite" 
                 aria-atomic="true">${GameState.totalTaps.toLocaleString()}</div>
          </div>
        </div>
        <div class="account-stats">
          <div class="stat-mini">
            <span>Винрейт:</span>
            <span class="stat-mini-value">${GameState.stats.winRate.toFixed(
              1
            )}%</span>
          </div>
          <div class="stat-mini">
            <span>Сделок:</span>
            <span class="stat-mini-value">${GameState.stats.totalBets}</span>
          </div>
          <div class="stat-mini">
            <span>P&L:</span>
            <span class="stat-mini-value ${
              GameState.stats.totalProfit >= 0 ? "positive" : "negative"
            }">
              ${
                GameState.stats.totalProfit >= 0 ? "+" : ""
              }${GameState.stats.totalProfit.toFixed(0)}
            </span>
          </div>
        </div>
      </div>
      
      <!-- Market Selector -->
      <div class="market-selector" id="marketSelector">
        ${GAME_CONFIG.assets
          .map((asset) => {
            const price = GameState.prices[asset]?.current || 0;
            const history = GameState.prices[asset]?.history || [];
            const change = calculatePriceChange(history);
            return `
            <button class="market-tab ${
              currentAsset === asset ? "active" : ""
            }" data-asset="${asset}" aria-label="${asset} market">
              <div class="market-symbol">${asset}</div>
              <div class="market-price" 
                   id="price-${asset}" 
                   aria-live="polite" 
                   aria-atomic="true">$${price.toLocaleString(
              "en-US",
              { minimumFractionDigits: 2, maximumFractionDigits: 2 }
            )}</div>
              <div class="market-change ${
                change >= 0 ? "up" : "down"
              }" 
                   id="change-${asset}" 
                   aria-live="polite" 
                   aria-atomic="true">
                ${change >= 0 ? "▲" : "▼"} ${Math.abs(change).toFixed(2)}%
              </div>
            </button>
          `;
          })
          .join("")}
      </div>
      
      <!-- Main Trading Layout -->
      <div class="trading-layout">
        <!-- Chart Section -->
        <div class="chart-section">
          <div class="chart-header">
            <h3>${GameState.selectedAsset}/USDT</h3>
          </div>
          <div class="chart-controls">
            <button class="chart-control-btn active" data-action="change-interval" data-interval="1m">1m</button>
            <button class="chart-control-btn" data-action="change-interval" data-interval="5m">5m</button>
            <button class="chart-control-btn" data-action="change-interval" data-interval="15m">15m</button>
            <div class="chart-status ${
              GameState.isOnline ? "online" : "offline"
            }">
              ${GameState.isOnline ? "🟢 Live" : "🔴 Offline"}
            </div>
          </div>
          <div class="chart-canvas-container">
            <canvas id="priceChart"></canvas>
          </div>
        </div>
        
        <!-- Trading Panel -->
        <div class="trading-panel">
          <!-- Tabs -->
          <div class="panel-tabs">
            <button class="panel-tab active" data-panel="trade">Trade</button>
            <button class="panel-tab" data-panel="positions">Positions</button>
            <button class="panel-tab" data-panel="leaderboard">Top</button>
          </div>
          
          <!-- Trade Panel Content -->
          <div class="panel-content" id="tradePanel">
            <!-- Tap to Earn Section -->
            <div class="tap-earn-section">
              <div class="tap-zone-compact" id="tapZone">
                <canvas id="tapCanvas"></canvas>
                <div class="tap-instruction">Tap to Earn</div>
                <div class="tap-reward">+${GAME_CONFIG.tapReward} TAPS</div>
              </div>
            </div>
            
            <!-- Order Entry -->
            <div class="order-entry">
              <div class="order-type-selector">
                <button class="order-type-btn active">Market</button>
                <button class="order-type-btn" disabled>Limit</button>
              </div>
              
              <div class="order-input-group">
                <div class="order-label">
                  <span>Amount (TAPS)</span>
                  <span class="order-label-hint">Available: ${
                    GameState.balance
                  }</span>
                </div>
                <input type="number" 
                       class="order-input" 
                       id="betAmount"
                       min="${GAME_CONFIG.minBet}" 
                       max="${GameState.balance}"
                       value="${Math.max(
                         GAME_CONFIG.minBet,
                         Math.min(100, GameState.balance)
                       )}"
                       placeholder="Enter amount">
                <div class="quick-amount-buttons">
                  <button class="quick-amount-btn" data-percent="25">25%</button>
                  <button class="quick-amount-btn" data-percent="50">50%</button>
                  <button class="quick-amount-btn" data-percent="75">75%</button>
                  <button class="quick-amount-btn" data-percent="100">Max</button>
                </div>
              </div>
              
              <div class="order-buttons">
                <button class="order-btn order-btn-buy" id="betUp" ${
                  GameState.balance < GAME_CONFIG.minBet ? "disabled" : ""
                }>
                  <span class="order-btn-icon">↑</span>
                  <span>LONG / UP</span>
                </button>
                <button class="order-btn order-btn-sell" id="betDown" ${
                  GameState.balance < GAME_CONFIG.minBet ? "disabled" : ""
                }>
                  <span class="order-btn-icon">↓</span>
                  <span>SHORT / DOWN</span>
                </button>
              </div>
              
              <div class="order-info">
                <div class="order-info-row">
                  <span>Duration</span>
                  <strong>${GAME_CONFIG.betDuration}s</strong>
                </div>
                <div class="order-info-row">
                  <span>Potential Profit</span>
                  <strong class="positive">+${(
                    Math.max(
                      GAME_CONFIG.minBet,
                      Math.min(100, GameState.balance)
                    ) *
                    (GAME_CONFIG.betMultiplier - 1)
                  ).toFixed(0)} TAPS</strong>
                </div>
                <div class="order-info-row">
                  <span>Multiplier</span>
                  <strong>×${GAME_CONFIG.betMultiplier}</strong>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Positions Panel Content -->
          <div class="panel-content" id="positionsPanel" style="display: none;">
            <div class="positions-section">
              <div class="section-header">
                <div class="section-title">Active Positions</div>
                <div class="section-count">${GameState.activeBets.length}</div>
              </div>
              <div id="activePositions">
                ${renderActivePositions()}
              </div>
            </div>
            <div class="positions-section">
              <div class="section-header">
                <div class="section-title">History</div>
                <div class="section-count">${GameState.betHistory.length}</div>
              </div>
              <div id="positionHistory">
                ${renderPositionHistory()}
              </div>
            </div>
          </div>
          
          <!-- Leaderboard Panel Content -->
          <div class="panel-content" id="leaderboardPanel" style="display: none;">
            <div class="leaderboard-section">
              <div class="leaderboard-header">
                <div class="leaderboard-title">
                  🏆 Top Traders
                </div>
                <button class="leaderboard-refresh" data-action="refreshLeaderboard">
                  ↻
                </button>
              </div>
              <div id="leaderboard">
                <div class="loading-placeholder">Loading...</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  initializeGame();
}

function initializeGame() {
  // Инициализация Canvas для графика
  const chartCanvas = document.getElementById("priceChart");
  if (chartCanvas) {
    renderer = new CanvasRenderer(chartCanvas);
  }

  // Инициализация Canvas для тапов
  tapCanvas = document.getElementById("tapCanvas");
  if (tapCanvas) {
    const rect = tapCanvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    tapCanvas.width = rect.width * dpr;
    tapCanvas.height = rect.height * dpr;
    tapCanvas.style.width = rect.width + "px";
    tapCanvas.style.height = rect.height + "px";
    tapCtx = tapCanvas.getContext("2d");
    if (tapCtx) {
      tapCtx.scale(dpr, dpr);
    }
  }

  // Initialize price data (load historical data from CoinGecko)
  const priceDataPromise = initializePriceData();

  // Event listeners
  setupEventListeners();

  // Запуск анимации
  startAnimation();

  // Загрузка лидерборда
  loadLeaderboard();

  priceDataPromise
    .catch(() => {
      // Ошибку уже обработали внутри initializePriceData, но продолжаем
    })
    .finally(() => {
      startPriceUpdates();
    });
  startUIRefresh();
}

function startUIRefresh() {
  if (uiRefreshInterval) {
    clearInterval(uiRefreshInterval);
  }

  uiRefreshInterval = setInterval(() => {
    updateBalance();
    updatePriceDisplay();

    const positionsTabActive = document
      .querySelector('.panel-tab[data-panel="positions"]')
      ?.classList.contains('active');

    if (positionsTabActive) {
      updateActivePositions();
    }
  }, 1000);
}

/**
 * Initialize price data by loading historical data from CoinGecko API
 */
async function initializePriceData() {
  try {
    // Get current prices from CoinGecko
    const currentPrices = await fetchCoinGeckoPrices();

    // Get historical data for the last hour only
    const historicalData = await fetchMultipleMarketCharts(
      ["BTC", "ETH", "SOL", "HYPE"],
      0.0417
    );

    // Check if we got any valid data
    const hasValidData = Object.keys(currentPrices).some(
      (asset) =>
        currentPrices[asset] &&
        historicalData[asset] &&
        historicalData[asset].length > 0
    );

    if (!hasValidData) {
      showDataLoadingError();
      return;
    }

    // Initialize GameState with real data
    Object.keys(GameState.prices).forEach((asset) => {
      if (!GameState.prices[asset]) {
        GameState.prices[asset] = { current: 0, history: [], lastUpdate: null };
      }

      if (
        currentPrices[asset] &&
        historicalData[asset] &&
        historicalData[asset].length > 0
      ) {
        GameState.prices[asset].current = currentPrices[asset];
        GameState.prices[asset].history = historicalData[asset];
        GameState.prices[asset].lastUpdate = Date.now();
      } else {
        // Don't set any data - will show error message
      }
    });

    GameState.isOnline = true;

    // Update UI with loaded prices
    updatePriceDisplay();
  } catch (error) {
    console.error("[Game] Failed to initialize price data:", error);
    GameState.isOnline = false;

    // Show error message instead of mock data
    showDataLoadingError();
  }
}

/**
 * Show data loading error message
 */
function showDataLoadingError() {
  const gameContainer = document.querySelector(".game-container");
  if (gameContainer) {
    const errorHtml = `
      <div class="data-error" style="text-align: center; padding: 20px; color: var(--color-error);">
        <div style="font-size: 24px; margin-bottom: 10px;">⚠️</div>
        <h3 style="margin: 0 0 10px 0; color: var(--color-error);">Ошибка загрузки данных</h3>
        <p style="margin: 0 0 15px 0; color: var(--text-muted);">
          Не удалось загрузить данные от CoinGecko API.<br>
          Попробуйте позже или проверьте подключение к интернету.
        </p>
        <button class="btn btn-primary" id="gameReloadBtn">
          🔄 Обновить
        </button>
      </div>
    `;

    // Find price display area and replace with error message
    const priceDisplay = gameContainer.querySelector(".price-display");
    if (priceDisplay) {
      priceDisplay.innerHTML = errorHtml;
    } else {
      // Insert error message at the beginning of game container
      gameContainer.insertAdjacentHTML("afterbegin", errorHtml);
    }
    
    // Add event listener for reload button
    setTimeout(() => {
      const reloadBtn = document.getElementById("gameReloadBtn");
      if (reloadBtn) {
        reloadBtn.addEventListener("click", () => location.reload());
      }
    }, 0);
  }
}

/**
 * Start live price updates from CoinGecko API
 * Обновление каждые 30 секунд для соблюдения лимитов free API
 */
function startPriceUpdates() {
  if (priceUpdateIntervalId) {
    clearInterval(priceUpdateIntervalId);
    priceUpdateIntervalId = null;
  }

  const runPriceUpdate = async () => {
    try {
      const prices = await fetchCoinGeckoPrices();

      const hasValidData = Object.values(prices).some(
        (price) => price && !Number.isNaN(price)
      );

      if (!hasValidData) {
        GameState.isOnline = false;
        updatePriceDisplay();
        return;
      }

      Object.keys(GameState.prices).forEach((asset) => {
        if (!GameState.prices[asset]) return;

        const rawPrice = prices[asset];
        if (!rawPrice || Number.isNaN(rawPrice)) return;

        const price = parseFloat(rawPrice);
        const history = GameState.prices[asset].history || [];

        history.push({
          timestamp: Date.now(),
          price,
        });

        if (history.length > 60) {
          history.shift();
        }

        GameState.prices[asset].history = history;
        GameState.prices[asset].current = price;
        GameState.prices[asset].lastUpdate = Date.now();
      });

      GameState.isOnline = true;
      GameState.lastApiError = null;

      updatePriceDisplay();
      checkActiveBets();
    } catch (error) {
      GameState.isOnline = false;
      GameState.lastApiError = error instanceof Error ? error.message : String(error);
      updatePriceDisplay();
    }
  };

  // Выполняем обновление сразу при запуске
  runPriceUpdate();

  priceUpdateIntervalId = setInterval(runPriceUpdate, PRICE_UPDATE_INTERVAL);
}

function setupEventListeners() {
  // Глобальные функции для onclick
  window.selectGameAsset = selectAsset;
  window.switchGamePanel = switchPanel;
  window.loadPriceDataForInterval = loadPriceDataForInterval;
  window.gameRefreshLeaderboard = loadLeaderboard;

  // Переключатели панелей
  document.querySelectorAll('.panel-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const targetPanel = tab.dataset.panel;
      if (targetPanel) {
        switchPanel(targetPanel);
      }
    });
  });

  // Кнопки интервалов графика
  document.querySelectorAll('.chart-control-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const interval = btn.dataset.interval || btn.textContent.trim().toLowerCase();
      if (interval) {
        changeChartInterval(interval);
      }
    });
  });

  // Тапы
  const tapZone = document.getElementById("tapZone");
  if (tapZone) {
    tapZone.addEventListener("click", handleTap);

    // Touch поддержка
    tapZone.addEventListener("touchstart", (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      handleTap({ clientX: touch.clientX, clientY: touch.clientY });
    });
  }

  // Quick Amount Buttons
  const quickAmountBtns = document.querySelectorAll(".quick-amount-btn");
  quickAmountBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const percent = parseInt(btn.dataset.percent);
      const amount = Math.floor(GameState.balance * (percent / 100));
      const betInput = document.getElementById("betAmount");
      if (betInput) {
        betInput.value = Math.max(GAME_CONFIG.minBet, amount);
        betInput.dispatchEvent(new Event("input"));
      }
    });
  });

  // Кнопки ставок
  const betUp = document.getElementById("betUp");
  const betDown = document.getElementById("betDown");

  if (betUp) {
    betUp.addEventListener("click", () => placeBet("UP"));
  }

  if (betDown) {
    betDown.addEventListener("click", () => placeBet("DOWN"));
  }

  // Input ставки
  const betInput = document.getElementById("betAmount");
  if (betInput) {
    betInput.addEventListener("input", (e) => {
      const value = parseInt(e.target.value) || 0;
      updatePotentialProfit(value);
      updateBetButtons();
    });
  }
}

/**
 * Изменение интервала графика
 * @param {string} interval - '1m', '5m', '15m'
 */
async function changeChartInterval(interval) {
  hapticFeedback('light');

  // Обновляем активную кнопку
  document.querySelectorAll(".chart-control-btn").forEach((btn) => {
    btn.classList.remove("active");
  });

  const activeBtn = document.querySelector(
    `[data-action="change-interval"][data-interval="${interval}"]`
  );
  if (activeBtn) {
    activeBtn.classList.add("active");
  }

  // Обновляем данные для нового интервала
  try {
    await loadPriceDataForInterval(interval);
  } catch (error) {
    console.error("[Game] Interval change failed", error);
  }
}

/**
 * Загрузка данных для конкретного интервала
 * @param {string} interval - '1m', '5m', '15m'
 */
async function loadPriceDataForInterval(interval) {
  try {

    // Get current prices from CoinGecko
    const currentPrices = await fetchCoinGeckoPrices();

    // Use only 1 hour data for all intervals
    const historicalData = await fetchMultipleMarketCharts(
      ["BTC", "ETH", "SOL", "HYPE"],
      0.0417
    );

    // Check if we got any valid data
    const hasValidData = Object.keys(currentPrices).some(
      (asset) =>
        currentPrices[asset] &&
        historicalData[asset] &&
        historicalData[asset].length > 0
    );

    if (!hasValidData) {
      showDataLoadingError();
      return;
    }

    // Update all assets with real data
    Object.keys(GameState.prices).forEach((asset) => {
      if (!GameState.prices[asset]) {
        GameState.prices[asset] = { current: 0, history: [], lastUpdate: null };
      }

      if (
        currentPrices[asset] &&
        historicalData[asset] &&
        historicalData[asset].length > 0
      ) {
        GameState.prices[asset].current = currentPrices[asset];
        GameState.prices[asset].history = historicalData[asset];
        GameState.prices[asset].lastUpdate = Date.now();
      } else {
        // Don't set any data - will show error message
      }
    });

    GameState.isOnline = true;

    // Update UI with loaded prices
    updatePriceDisplay();
  } catch (error) {
    console.error(`[Game] Failed to load ${interval} price data:`, error);
    GameState.isOnline = false;

    // Show error message instead of mock data
    showDataLoadingError();
  }
}

// Переключение панелей
function switchPanel(panelName) {
  hapticFeedback("light");

  // Обновляем tabs
  document.querySelectorAll(".panel-tab").forEach((tab) => {
    tab.classList.remove("active");
  });

  const activeTab = document.querySelector(
    `.panel-tab[data-panel="${panelName}"]`
  );
  if (activeTab) {
    activeTab.classList.add("active");
  }

  // Обновляем content
  document.querySelectorAll(".panel-content").forEach((content) => {
    content.style.display = "none";
  });

  const targetPanel = document.getElementById(`${panelName}Panel`);
  if (targetPanel) {
    targetPanel.style.display = "block";

    // Обновляем контент панели при переключении
    if (panelName === "positions") {
      const activePositions = document.getElementById("activePositions");
      const positionHistory = document.getElementById("positionHistory");
      if (activePositions) activePositions.innerHTML = renderActivePositions();
      if (positionHistory) positionHistory.innerHTML = renderPositionHistory();
    } else if (panelName === "leaderboard") {
      loadLeaderboard();
    }
  }
}

// Обновление потенциальной прибыли
function updatePotentialProfit(amount) {
  const profit = amount * (GAME_CONFIG.betMultiplier - 1);
  const profitElements = document.querySelectorAll(
    ".order-info-row:nth-child(2) strong"
  );
  profitElements.forEach((el) => {
    el.textContent = `+${profit.toFixed(0)} TAPS`;
  });
}

function selectAsset(asset) {
  hapticFeedback("light");
  GameState.selectedAsset = asset;

  // Обновляем market tabs
  document.querySelectorAll(".market-tab").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.asset === asset);
  });

  // Обновляем заголовок графика
  const chartSymbol = document.querySelector(".chart-symbol");
  if (chartSymbol) {
    chartSymbol.textContent = `${asset}/USDT`;
  }

  // Обновляем цену и изменение
  updatePriceDisplay();

  saveGameState();
}

function handleTap(e) {
  hapticFeedback("light");

  // Добавляем TAPS
  GameState.balance += GAME_CONFIG.tapReward;
  GameState.totalTaps++;

  if (GameState.balance > GameState.maxBalance) {
    GameState.maxBalance = GameState.balance;
  }

  // Обновляем UI
  updateBalance();

  // Анимация
  const tapZone = e.currentTarget || document.getElementById("tapZone");
  if (tapZone && e.clientX !== undefined && e.clientY !== undefined) {
    const rect = tapZone.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (tapCtx) {
      drawTapEffect(x, y);
    }
  }

  saveGameState();
}

function drawTapEffect(x, y) {
  if (!tapCtx || !tapCanvas) return;

  const startTime = Date.now();
  const duration = 800;
  const rect = tapCanvas.getBoundingClientRect();

  const animate = () => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);

    if (progress < 1) {
      tapCtx.clearRect(0, 0, rect.width, rect.height);

      const alpha = 1 - progress;
      const offsetY = progress * 50;
      const scale = 1 + progress * 0.5;

      tapCtx.save();
      tapCtx.globalAlpha = alpha;
      tapCtx.fillStyle = "#0ecb81"; // Используем терминал-цвет
      tapCtx.font = `bold ${20 * scale}px Inter, sans-serif`;
      tapCtx.textAlign = "center";
      tapCtx.fillText(`+${GAME_CONFIG.tapReward}`, x, y - offsetY);
      tapCtx.restore();

      requestAnimationFrame(animate);
    } else {
      tapCtx.clearRect(0, 0, rect.width, rect.height);
    }
  };

  animate();
}

function placeBet(direction) {
  const betInput = document.getElementById("betAmount");
  const amount = parseInt(betInput?.value) || GAME_CONFIG.minBet;

  // Валидация
  if (amount < GAME_CONFIG.minBet) {
    showNotification(`Минимальная ставка: ${GAME_CONFIG.minBet} TAPS`);
    return;
  }

  if (amount > GameState.balance) {
    showNotification("Недостаточно TAPS");
    return;
  }

  const asset = GameState.selectedAsset;
  const currentPrice = GameState.prices[asset]?.current;

  if (!currentPrice) {
    showNotification("Цена актива недоступна");
    return;
  }

  // Создаем ставку
  const bet = {
    id: Date.now() + Math.random(),
    asset,
    direction,
    amount,
    startPrice: currentPrice,
    startTime: Date.now(),
    duration: GAME_CONFIG.betDuration * 1000,
  };

  // Списываем баланс
  GameState.balance -= amount;
  GameState.activeBets.push(bet);

  hapticFeedback("medium");
  updateUI();
  saveGameState();
}

/**
 * Check active bets and resolve if time expired
 */
function checkActiveBets() {
  const now = Date.now();
  const betsToResolve = [];

  GameState.activeBets.forEach((bet) => {
    const elapsed = now - bet.startTime;

    if (elapsed >= bet.duration) {
      // Bet time expired, resolve it
      const currentPrice =
        GameState.prices[bet.asset]?.current || bet.startPrice;
      const priceChange = currentPrice - bet.startPrice;

      const won =
        (bet.direction === "UP" && priceChange > 0) ||
        (bet.direction === "DOWN" && priceChange < 0);

      const pnl = won
        ? bet.amount * (GAME_CONFIG.betMultiplier - 1)
        : -bet.amount;

      betsToResolve.push({
        bet,
        result: { won, pnl },
      });
    }
  });

  // Resolve all expired bets
  betsToResolve.forEach(({ bet, result }) => {
    resolveBet({ bet, result });
  });
}

function resolveBet(data) {
  const { bet, result } = data;

  // Удаляем из активных
  GameState.activeBets = GameState.activeBets.filter((b) => b.id !== bet.id);

  // Обновляем баланс
  if (result.won) {
    GameState.balance += bet.amount + result.pnl;
    hapticFeedback("success");
    showNotification(`Выигрыш! +${result.pnl.toFixed(0)} TAPS`, "success");
  } else {
    hapticFeedback("error");
    showNotification(`Проигрыш -${bet.amount} TAPS`, "error");
  }

  // Обновляем макс. баланс
  if (GameState.balance > GameState.maxBalance) {
    GameState.maxBalance = GameState.balance;
  }

  // Добавляем в историю
  GameState.betHistory.unshift({
    asset: bet.asset,
    direction: bet.direction,
    amount: bet.amount,
    pnl: result.pnl,
    won: result.won,
    timestamp: Date.now(),
  });

  // Ограничиваем историю
  if (GameState.betHistory.length > 20) {
    GameState.betHistory = GameState.betHistory.slice(0, 20);
  }

  // Обновляем статистику
  GameState.stats.totalBets++;
  if (result.won) {
    GameState.stats.wonBets++;
    GameState.stats.totalProfit += result.pnl;
  } else {
    GameState.stats.lostBets++;
    GameState.stats.totalProfit += result.pnl;
  }

  GameState.stats.winRate =
    GameState.stats.totalBets > 0
      ? (GameState.stats.wonBets / GameState.stats.totalBets) * 100
      : 0;

  updateUI();
  saveGameState();

  // Обновляем лидерборд если новый рекорд
  if (GameState.balance === GameState.maxBalance && GameState.maxBalance > 0) {
    updateLeaderboard();
  }
}

function updateUI() {
  updateBalance();
  updatePriceDisplay();
  updateActivePositions();
  updateBetButtons();
}

function updateBalance() {
  // Обновляем баланс в header
  const balanceItems = document.querySelectorAll(
    ".balance-item .balance-value"
  );
  if (balanceItems.length >= 1) {
    balanceItems[0].textContent = `${GameState.balance.toLocaleString()} TAPS`;
  }
  if (balanceItems.length >= 2) {
    balanceItems[1].textContent = GameState.maxBalance.toLocaleString();
    balanceItems[1].className = `balance-value ${
      GameState.maxBalance > GameState.balance ? "positive" : ""
    }`;
  }
  if (balanceItems.length >= 3) {
    balanceItems[2].textContent = GameState.totalTaps.toLocaleString();
  }

  // Обновляем статы
  const statValues = document.querySelectorAll(".stat-mini-value");
  if (statValues.length >= 1) {
    statValues[0].textContent = `${GameState.stats.winRate.toFixed(1)}%`;
  }
  if (statValues.length >= 2) {
    statValues[1].textContent = GameState.stats.totalBets;
  }
  if (statValues.length >= 3) {
    const profit = GameState.stats.totalProfit;
    statValues[2].textContent = `${profit >= 0 ? "+" : ""}${profit.toFixed(0)}`;
    statValues[2].className = `stat-mini-value ${
      profit >= 0 ? "positive" : "negative"
    }`;
  }

  // Обновляем Available в order panel
  const availableHint = document.querySelector(".order-label-hint");
  if (availableHint) {
    availableHint.textContent = `Available: ${GameState.balance}`;
  }
}

function updatePriceDisplay() {
  const currentAsset = GameState.selectedAsset;

  // Обновляем все market tabs
  GAME_CONFIG.assets.forEach((asset) => {
    const priceEl = document.getElementById(`price-${asset}`);
    const changeEl = document.getElementById(`change-${asset}`);

    if (GameState.prices[asset]) {
      const price = GameState.prices[asset].current;
      const history = GameState.prices[asset].history || [];
      const change = calculatePriceChange(history);

      if (priceEl) {
        priceEl.textContent = `$${price.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
      }

      if (changeEl) {
        changeEl.textContent = `${change >= 0 ? "▲" : "▼"} ${Math.abs(
          change
        ).toFixed(2)}%`;
        changeEl.className = `market-change ${change >= 0 ? "up" : "down"}`;
      }
    }
  });

  // Обновляем главный дисплей цены
  if (GameState.prices[currentAsset]) {
    const price = GameState.prices[currentAsset].current;
    const history = GameState.prices[currentAsset].history || [];
    const change = calculatePriceChange(history);

    const priceMain = document.getElementById("currentPriceDisplay");
    if (priceMain) {
      priceMain.textContent = `$${price.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }

    const priceChange = document.getElementById("priceChangeDisplay");
    if (priceChange) {
      priceChange.textContent = `${change >= 0 ? "▲" : "▼"} ${Math.abs(
        change
      ).toFixed(2)}%`;
      priceChange.className = `chart-price-change ${
        change >= 0 ? "up" : "down"
      }`;
    }
  }

  // Обновляем online/offline статус
  const statusDot = document.querySelector(".status-dot");
  const statusText = statusDot?.nextElementSibling;
  if (statusDot) {
    statusDot.className = `status-dot ${
      GameState.isOnline ? "online" : "offline"
    }`;
  }
  if (statusText) {
    statusText.textContent = GameState.isOnline ? "Live" : "Demo";
  }
}

function updateActivePositions() {
  const activePositions = document.getElementById("activePositions");
  if (activePositions) {
    activePositions.innerHTML = renderActivePositions();
  }

  const positionHistory = document.getElementById("positionHistory");
  if (positionHistory) {
    positionHistory.innerHTML = renderPositionHistory();
  }

  // Обновляем счетчик позиций
  const positionCount = document.querySelectorAll(".section-count");
  if (positionCount.length >= 1) {
    positionCount[0].textContent = GameState.activeBets.length;
  }
  if (positionCount.length >= 2) {
    positionCount[1].textContent = GameState.betHistory.length;
  }
}

function updateBetButtons() {
  const betInput = document.getElementById("betAmount");
  const amount = parseInt(betInput?.value) || 0;
  const canBet = amount >= GAME_CONFIG.minBet && amount <= GameState.balance;

  const betUp = document.getElementById("betUp");
  const betDown = document.getElementById("betDown");

  if (betUp) betUp.disabled = !canBet || GameState.activeBets.length >= 3;
  if (betDown) betDown.disabled = !canBet || GameState.activeBets.length >= 3;
}

function renderActiveBets() {
  if (GameState.activeBets.length === 0) {
    return '<p class="no-bets">Нет активных ставок</p>';
  }

  return GameState.activeBets
    .map((bet) => {
      const timeLeft =
        Math.max(0, bet.duration - (Date.now() - bet.startTime)) / 1000;
      const currentPrice =
        GameState.prices[bet.asset]?.current || bet.startPrice;
      const priceChange = currentPrice - bet.startPrice;
      const isProfitable =
        (bet.direction === "UP" && priceChange > 0) ||
        (bet.direction === "DOWN" && priceChange < 0);

      return `
      <div class="active-bet ${bet.direction.toLowerCase()}">
        <div class="bet-info">
          <span class="bet-asset">${bet.asset}</span>
          <span class="bet-direction ${bet.direction.toLowerCase()}">${
        bet.direction === "UP" ? "📈" : "📉"
      } ${bet.direction}</span>
          <span class="bet-time">${timeLeft.toFixed(1)}s</span>
        </div>
        <div class="bet-details">
          <span>Ставка: ${bet.amount} TAPS</span>
          <span class="${isProfitable ? "profit" : "loss"}">
            ${priceChange >= 0 ? "+" : ""}${priceChange.toFixed(2)}
          </span>
        </div>
      </div>
    `;
    })
    .join("");
}

function renderBetHistory() {
  if (GameState.betHistory.length === 0) {
    return '<p class="no-history">История пуста</p>';
  }

  return GameState.betHistory
    .slice(0, 10)
    .map(
      (bet) => `
    <div class="history-item ${bet.won ? "won" : "lost"}">
      <div class="history-main">
        <span class="history-asset">${bet.asset}</span>
        <span class="history-direction ${bet.direction.toLowerCase()}">${
        bet.direction === "UP" ? "📈" : "📉"
      }</span>
        <span class="history-result ${bet.won ? "win" : "lose"}">
          ${bet.won ? "+" : ""}${bet.pnl.toFixed(0)} TAPS
        </span>
      </div>
      <div class="history-time">${formatTime(bet.timestamp)}</div>
    </div>
  `
    )
    .join("");
}

// Новые функции для терминал-стиля
function renderActivePositions() {
  if (GameState.activeBets.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">📊</div>
        <div class="empty-state-text">No active positions</div>
      </div>
    `;
  }

  return GameState.activeBets
    .map((bet) => {
      const timeLeft = Math.max(0, bet.duration - (Date.now() - bet.startTime));
      const progress = ((bet.duration - timeLeft) / bet.duration) * 100;
      const currentPrice =
        GameState.prices[bet.asset]?.current || bet.startPrice;
      const priceChange = currentPrice - bet.startPrice;
      const pnl =
        (bet.direction === "UP" && priceChange > 0) ||
        (bet.direction === "DOWN" && priceChange < 0)
          ? bet.amount * (GAME_CONFIG.betMultiplier - 1)
          : -bet.amount;

      return `
      <div class="position-card ${bet.direction === "UP" ? "long" : "short"}">
        <div class="position-header">
          <div class="position-symbol">${bet.asset}/USDT</div>
          <div class="position-direction ${
            bet.direction === "UP" ? "long" : "short"
          }">
            ${bet.direction === "UP" ? "LONG" : "SHORT"}
          </div>
        </div>
        <div class="position-info">
          <div class="position-info-item">
            <div class="position-info-label">Amount</div>
            <div class="position-info-value">${bet.amount} TAPS</div>
          </div>
          <div class="position-info-item">
            <div class="position-info-label">Entry</div>
            <div class="position-info-value">$${bet.startPrice.toFixed(2)}</div>
          </div>
          <div class="position-info-item">
            <div class="position-info-label">Current</div>
            <div class="position-info-value">$${currentPrice.toFixed(2)}</div>
          </div>
          <div class="position-info-item">
            <div class="position-info-label">P&L</div>
            <div class="position-info-value" style="color: ${
              pnl >= 0 ? "#0ecb81" : "#f6465d"
            }">
              ${pnl >= 0 ? "+" : ""}${pnl.toFixed(0)}
            </div>
          </div>
        </div>
        <div class="position-timer">
          <span>${(timeLeft / 1000).toFixed(0)}s</span>
          <div class="position-timer-bar">
            <div class="position-timer-fill" style="width: ${progress}%"></div>
          </div>
        </div>
      </div>
    `;
    })
    .join("");
}

function renderPositionHistory() {
  if (GameState.betHistory.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">📜</div>
        <div class="empty-state-text">No trading history</div>
      </div>
    `;
  }

  return GameState.betHistory
    .slice(0, 10)
    .map(
      (bet) => `
    <div class="position-card ${bet.direction === "UP" ? "long" : "short"}">
      <div class="position-header">
        <div class="position-symbol">${bet.asset}/USDT</div>
        <div class="position-direction ${
          bet.direction === "UP" ? "long" : "short"
        }">
          ${bet.direction === "UP" ? "LONG" : "SHORT"}
        </div>
      </div>
      <div class="position-info">
        <div class="position-info-item">
          <div class="position-info-label">Amount</div>
          <div class="position-info-value">${bet.amount} TAPS</div>
        </div>
        <div class="position-info-item">
          <div class="position-info-label">Result</div>
          <div class="position-info-value" style="color: ${
            bet.won ? "#0ecb81" : "#f6465d"
          }">
            ${bet.won ? "WIN" : "LOSS"}
          </div>
        </div>
        <div class="position-info-item">
          <div class="position-info-label">P&L</div>
          <div class="position-info-value" style="color: ${
            bet.pnl >= 0 ? "#0ecb81" : "#f6465d"
          }">
            ${bet.pnl >= 0 ? "+" : ""}${bet.pnl.toFixed(0)}
          </div>
        </div>
        <div class="position-info-item">
          <div class="position-info-label">Time</div>
          <div class="position-info-value">${formatTime(bet.timestamp)}</div>
        </div>
      </div>
    </div>
  `
    )
    .join("");
}

function startAnimation() {
  const animate = () => {
    if (renderer && GameState.prices[GameState.selectedAsset]) {
      const asset = GameState.selectedAsset;
      const priceData = GameState.prices[asset];

      const chartCanvas = document.getElementById("priceChart");
      if (chartCanvas) {
        const rect = chartCanvas.getBoundingClientRect();
        renderer.clear();
        renderer.drawPriceChart(
          priceData.history,
          priceData.current,
          rect.width,
          rect.height
        );

        // Рисуем индикаторы активных ставок для текущего актива
        const activeBet = GameState.activeBets.find((b) => b.asset === asset);
        if (activeBet) {
          renderer.drawActiveBetIndicator(
            activeBet,
            priceData.current,
            rect.width,
            rect.height
          );
        }
      }
    }

    animationFrameId = requestAnimationFrame(animate);
  };

  animate();
}

function showNotification(message, type = "info") {
  // Telegram уведомление если доступно
  if (tg?.showAlert) {
    tg.showAlert(message);
  } else {
    alert(message);
  }
}

function formatTime(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 60000) return "только что";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}м назад`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}ч назад`;
  return new Date(timestamp).toLocaleDateString("ru");
}

// Сохранение/загрузка состояния
function saveGameState() {
  try {
    const saveData = {
      balance: GameState.balance,
      totalTaps: GameState.totalTaps,
      maxBalance: GameState.maxBalance,
      selectedAsset: GameState.selectedAsset,
      betHistory: GameState.betHistory,
      stats: GameState.stats,
    };

    localStorage.setItem("game_state", JSON.stringify(saveData));
  } catch (e) {
    console.error("Failed to save game state:", e);
  }
}

function loadGameState() {
  try {
    const saved = localStorage.getItem("game_state");
    if (saved) {
      const data = JSON.parse(saved);
      Object.assign(GameState, data);
    }
  } catch (e) {
    console.error("Failed to load game state:", e);
  }
}

// Лидерборд через Telegram Cloud Storage
export async function loadLeaderboard() {
  const container = document.getElementById("leaderboard");
  if (!container) return;

  try {
    // Проверяем доступность CloudStorage (только в Telegram WebApp v6.1+)
    const cloudStorageAvailable =
      tg?.CloudStorage && typeof tg.CloudStorage.getKeys === "function";

    if (cloudStorageAvailable) {
      try {
        const keys = await new Promise((resolve, reject) => {
          tg.CloudStorage.getKeys((error, keys) => {
            if (error) {
              reject(error);
            } else {
              resolve(keys || []);
            }
          });
        });

        // Фильтруем ключи лидерборда
        const leaderboardKeys = keys.filter((k) =>
          k.startsWith("leaderboard_")
        );

        if (leaderboardKeys.length > 0) {
          const entries = await Promise.all(
            leaderboardKeys.map(
              (key) =>
                new Promise((resolve) => {
                  tg.CloudStorage.getItem(key, (error, value) => {
                    if (!error && value) {
                      try {
                        resolve(JSON.parse(value));
                      } catch {
                        resolve(null);
                      }
                    } else {
                      resolve(null);
                    }
                  });
                })
            )
          );

          const validEntries = entries
            .filter((e) => e !== null)
            .sort((a, b) => b.maxBalance - a.maxBalance)
            .slice(0, GAME_CONFIG.leaderboard.topCount);

          container.innerHTML = renderLeaderboard(validEntries);
          return;
        }
      } catch (cloudError) {
        // CloudStorage not available, fallback to localStorage
      }
    }

    // Fallback: localStorage (для браузера и старых версий Telegram)
    const saved = localStorage.getItem("game_leaderboard");
    if (saved) {
      const entries = JSON.parse(saved);
      container.innerHTML = renderLeaderboard(entries);
    } else {
      container.innerHTML =
        '<p class="no-data">Лидерборд пуст. Начните играть!</p>';
    }
  } catch (e) {
    console.error("Failed to load leaderboard:", e);
    container.innerHTML =
      '<p class="no-data">Лидерборд пуст. Начните играть!</p>';
  }
}

async function updateLeaderboard() {
  // Создаем запись игрока (для Telegram или демо-режима)
  let userId, username, firstName;

  if (tg?.initDataUnsafe?.user) {
    // Telegram данные
    userId = tg.initDataUnsafe.user.id;
    username = tg.initDataUnsafe.user.username || "Player";
    firstName = tg.initDataUnsafe.user.first_name || "Player";
  } else {
    // Демо-режим (браузер) - создаем уникальный ID
    userId = localStorage.getItem("demo_user_id") || `demo_${Date.now()}`;
    if (!localStorage.getItem("demo_user_id")) {
      localStorage.setItem("demo_user_id", userId);
    }
    username = "DemoPlayer";
    firstName = "Demo Player";
  }

  const entry = {
    userId,
    username,
    firstName,
    maxBalance: GameState.maxBalance,
    timestamp: Date.now(),
  };

  try {
    const cloudStorageAvailable =
      tg?.CloudStorage && typeof tg.CloudStorage.setItem === "function";

    if (cloudStorageAvailable) {
      try {
        // Сохраняем в Cloud Storage
        const key = `leaderboard_${entry.userId}`;
        await new Promise((resolve, reject) => {
          tg.CloudStorage.setItem(key, JSON.stringify(entry), (error) => {
            if (error) reject(error);
            else resolve();
          });
        });
      } catch (cloudError) {
        // CloudStorage save failed, fallback to localStorage
      }
    }

    // Всегда сохраняем в localStorage как backup
    const saved = localStorage.getItem("game_leaderboard");
    const leaderboard = saved ? JSON.parse(saved) : [];

    const existingIndex = leaderboard.findIndex(
      (e) => e.userId === entry.userId
    );
    if (existingIndex >= 0) {
      leaderboard[existingIndex] = entry;
    } else {
      leaderboard.push(entry);
    }

    leaderboard.sort((a, b) => b.maxBalance - a.maxBalance);
    leaderboard.splice(GAME_CONFIG.leaderboard.maxEntries);

    localStorage.setItem("game_leaderboard", JSON.stringify(leaderboard));

    // Обновляем отображение
    loadLeaderboard();
  } catch (e) {
    console.error("Failed to update leaderboard:", e);
  }
}

function renderLeaderboard(entries) {
  if (!entries || entries.length === 0) {
    return '<p class="no-data">Лидерборд пуст</p>';
  }

  return entries
    .map((entry, index) => {
      const medal =
        index === 0
          ? "🥇"
          : index === 1
          ? "🥈"
          : index === 2
          ? "🥉"
          : `${index + 1}.`;
      const isCurrentUser = tg?.initDataUnsafe?.user?.id === entry.userId;

      return `
      <div class="leaderboard-item ${isCurrentUser ? "current-user" : ""}">
        <span class="rank">${medal}</span>
        <span class="username">${entry.firstName || entry.username}</span>
        <span class="score">${entry.maxBalance} TAPS</span>
      </div>
    `;
    })
    .join("");
}

// Cleanup при выходе
export function cleanup() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }

  if (uiRefreshInterval) {
    clearInterval(uiRefreshInterval);
    uiRefreshInterval = null;
  }

  if (priceUpdateIntervalId) {
    clearInterval(priceUpdateIntervalId);
    priceUpdateIntervalId = null;
  }

  if (GameState.worker) {
    GameState.worker.postMessage({ type: "STOP_PRICE_UPDATES" });
  }
}
