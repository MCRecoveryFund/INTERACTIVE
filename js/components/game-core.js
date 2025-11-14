/**
 * MC Recovery Fund - Game Core Module
 * Основные игровые функции и механики
 */

import { GameState } from '../core/state.js';
import { GAME_CONFIG, TIMING_CONFIG } from '../core/config.js';
import { hapticFeedback } from '../modules/telegram.js';

/**
 * Calculate price change percentage
 */
export function calculatePriceChange(history) {
  if (!history || history.length < 2) return 0;
  const oldPrice = history[0].price;
  const newPrice = history[history.length - 1].price;
  return ((newPrice - oldPrice) / oldPrice) * 100;
}

/**
 * Initialize game state
 */
export function initializeGame() {
  // Load saved game state
  loadGameState();
  
  // Reset UI state
  GameState.isOnline = true;
  GameState.lastApiError = null;
  
  // Initialize worker for price updates
  if (window.Worker) {
    try {
      GameState.worker = new Worker('./js/workers/game-worker.js');
      GameState.worker.onmessage = handleWorkerMessage;
      GameState.worker.postMessage({ type: 'init' });
      GameState.workerReady = true;
    } catch (error) {
      // Worker initialization failed
    }
  }
}

/**
 * Handle messages from game worker
 */
function handleWorkerMessage(e) {
  const { type, data } = e.data;
  
  switch (type) {
    case 'priceUpdate':
      updatePricesFromWorker(data);
      break;
    case 'error':
      GameState.lastApiError = data.message;
      break;
  }
}

/**
 * Update prices from worker
 */
function updatePricesFromWorker(data) {
  Object.keys(data).forEach(asset => {
    if (GameState.prices[asset]) {
      GameState.prices[asset].current = data[asset];
      GameState.prices[asset].lastUpdate = Date.now();
    }
  });
  
  updateUI();
}

/**
 * Handle tap/click for earning TAPS
 */
export function handleTap(e) {
  if (!GameState.isOnline) return;
  
  const rect = e.currentTarget.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  // Update balance
  GameState.balance += 1;
  GameState.totalTaps += 1;
  
  if (GameState.balance > GameState.maxBalance) {
    GameState.maxBalance = GameState.balance;
  }
  
  // Visual feedback
  drawTapEffect(x, y);
  updateBalance();
  
  // Haptic feedback
  hapticFeedback('light');
  
  // Save state
  saveGameState();
}

/**
 * Draw tap effect
 */
function drawTapEffect(x, y) {
  const canvas = document.getElementById('tapCanvas');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  
  // Clear canvas before drawing new effect to prevent layer accumulation
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Create ripple effect
  const ripple = {
    x: x,
    y: y,
    radius: 0,
    maxRadius: GAME_CONFIG.canvas.tapEffectMaxRadius,
    opacity: 1
  };
  
  // Animate ripple
  const animateRipple = () => {
    ripple.radius += GAME_CONFIG.canvas.tapEffectRadiusStep;
    ripple.opacity -= GAME_CONFIG.canvas.tapEffectOpacityStep;
    
    if (ripple.opacity > 0) {
      ctx.save();
      ctx.globalAlpha = ripple.opacity;
      ctx.strokeStyle = GAME_CONFIG.canvas.colors.tapEffect;
      ctx.lineWidth = GAME_CONFIG.canvas.tapEffectLineWidth;
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      
      requestAnimationFrame(animateRipple);
    }
  };
  
  animateRipple();
}

/**
 * Place bet
 */
export async function placeBet(direction, amount) {
  if (!GameState.isOnline || amount > GameState.balance) {
    return;
  }
  
  const asset = GameState.selectedAsset;
  const currentPrice = GameState.prices[asset].current;
  
  if (!currentPrice) return;
  
  // Create bet
  const bet = {
    id: Date.now().toString(),
    asset: asset,
    direction: direction,
    amount: amount,
    openPrice: currentPrice,
    startTime: Date.now(),
    duration: GAME_CONFIG.betDuration * 1000 // Convert seconds to milliseconds
  };
  
  // Update state
  GameState.activeBets.push(bet);
  GameState.balance -= amount;
  
  // Update UI
  updateUI();
  hapticFeedback('medium');
  
  // Save state
  saveGameState();
}

/**
 * Check active bets
 */
export function checkActiveBets() {
  const now = Date.now();
  const completedBets = [];
  
  GameState.activeBets.forEach(bet => {
    if (now - bet.startTime >= bet.duration) {
      // Bet completed
      const asset = bet.asset;
      const currentPrice = GameState.prices[asset].current;
      const openPrice = bet.openPrice;
      
      let pnl = 0;
      let won = false;
      
      if (bet.direction === 'long') {
        won = currentPrice > openPrice;
        pnl = won ? bet.amount * GAME_CONFIG.betMultiplier : -bet.amount;
      } else {
        won = currentPrice < openPrice;
        pnl = won ? bet.amount * GAME_CONFIG.betMultiplier : -bet.amount;
      }
      
      // Update balance
      GameState.balance += bet.amount + pnl;
      
      // Update stats
      GameState.stats.totalBets += 1;
      if (won) {
        GameState.stats.wonBets += 1;
      } else {
        GameState.stats.lostBets += 1;
      }
      GameState.stats.totalProfit += pnl;
      GameState.stats.winRate = (GameState.stats.wonBets / GameState.stats.totalBets) * 100;
      
      // Add to history
      completedBets.push({
        ...bet,
        closePrice: currentPrice,
        pnl: pnl,
        won: won,
        endTime: now
      });
    }
  });
  
  // Remove completed bets
  GameState.activeBets = GameState.activeBets.filter(bet => 
    now - bet.startTime < bet.duration
  );
  
  // Add to history
  GameState.betHistory.push(...completedBets);
  
  // Update UI
  if (completedBets.length > 0) {
    updateUI();
    completedBets.forEach(bet => {
      showNotification(
        bet.won ? `Выиграли $${bet.pnl.toFixed(2)}!` : `Проиграли $${Math.abs(bet.pnl).toFixed(2)}`,
        bet.won ? 'success' : 'error'
      );
    });
    saveGameState();
  }
}

// Track active notification timeouts for cleanup
const activeNotificationTimeouts = [];

/**
 * Show notification
 */
export function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  
  // Add to DOM
  document.body.appendChild(notification);
  
  // Remove after delay and track timeout for cleanup
  const timeoutId = setTimeout(() => {
    notification.remove();
    // Remove from tracking array
    const index = activeNotificationTimeouts.indexOf(timeoutId);
    if (index > -1) activeNotificationTimeouts.splice(index, 1);
  }, TIMING_CONFIG.notificationDuration);
  
  // Store timeout ID for cleanup
  activeNotificationTimeouts.push(timeoutId);
}

/**
 * Cleanup all active notifications (called on navigation away from game)
 */
export function cleanupNotifications() {
  activeNotificationTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
  activeNotificationTimeouts.length = 0;
  
  // Remove all notification elements
  document.querySelectorAll('.notification').forEach(el => el.remove());
}

/**
 * Update UI
 */
export function updateUI() {
  updateBalance();
  updatePriceDisplay();
  updateActivePositions();
  updateBetButtons();
}

/**
 * Update balance display
 */
function updateBalance() {
  const balanceElement = document.getElementById('balance');
  if (balanceElement) {
    balanceElement.textContent = GameState.balance.toLocaleString();
  }
}

/**
 * Update price display
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
 * Update active positions
 */
function updateActivePositions() {
  const container = document.getElementById('activePositions');
  if (!container) return;
  
  if (GameState.activeBets.length === 0) {
    container.innerHTML = '<p class="text-muted">Нет активных позиций</p>';
    return;
  }
  
  const html = GameState.activeBets.map(bet => {
    const currentPrice = GameState.prices[bet.asset].current;
    const pnl = bet.direction === 'long' 
      ? (currentPrice - bet.openPrice) / bet.openPrice * bet.amount
      : (bet.openPrice - currentPrice) / bet.openPrice * bet.amount;
    
    return `
      <div class="active-bet">
        <div class="bet-header">
          <span class="bet-asset">${bet.asset}</span>
          <span class="bet-direction bet-${bet.direction}">${bet.direction.toUpperCase()}</span>
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
 * Update bet buttons
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
 * Save game state
 */
export function saveGameState() {
  const state = {
    balance: GameState.balance,
    totalTaps: GameState.totalTaps,
    maxBalance: GameState.maxBalance,
    selectedAsset: GameState.selectedAsset,
    activeBets: GameState.activeBets,
    betHistory: GameState.betHistory.slice(-100), // Keep last 100 bets
    stats: GameState.stats
  };
  
  localStorage.setItem('mc_recovery_game_state', JSON.stringify(state));
}

/**
 * Load game state
 */
export function loadGameState() {
  try {
    const saved = localStorage.getItem('mc_recovery_game_state');
    if (saved) {
      const state = JSON.parse(saved);
      
      GameState.balance = state.balance || 0;
      GameState.totalTaps = state.totalTaps || 0;
      GameState.maxBalance = state.maxBalance || 0;
      GameState.selectedAsset = state.selectedAsset || 'BTC';
      GameState.activeBets = state.activeBets || [];
      GameState.betHistory = state.betHistory || [];
      GameState.stats = state.stats || {
        totalBets: 0,
        wonBets: 0,
        lostBets: 0,
        totalProfit: 0,
        winRate: 0
      };
    }
  } catch (error) {
    // Failed to load state, use defaults
  }
}
