/**
 * MC Recovery Fund - Game Prices Module
 * Работа с ценами и API для торговой игры
 */

import { GameState } from '../core/state.js';
import { fetchCoinGeckoPrices, fetchMultipleMarketCharts } from '../modules/api.js';
import { updateUI, checkActiveBets, showNotification, saveGameState } from './game-core.js';

/**
 * Инициализация ценовых данных
 */
export async function initializePriceData() {
  try {
    // Загружаем исторические данные за последний час
    const historicalData = await fetchMultipleMarketCharts(['BTC', 'ETH', 'SOL', 'HYPE'], 0.0417);
    
    if (!historicalData || Object.keys(historicalData).length === 0) {
      showDataLoadingError();
      return;
    }
    
    // Обновляем цены для каждого актива
    Object.keys(historicalData).forEach(asset => {
      if (GameState.prices[asset]) {
        const prices = historicalData[asset];
        if (prices && prices.length > 0) {
          GameState.prices[asset].history = prices;
          GameState.prices[asset].current = prices[prices.length - 1].price;
          GameState.prices[asset].lastUpdate = Date.now();
        }
      }
    });
    
    // Запускаем обновление цен
    startPriceUpdates();
    
  } catch (error) {
    showDataLoadingError();
  }
}

/**
 * Показать ошибку загрузки данных
 */
function showDataLoadingError() {
  const gameContainer = document.querySelector('.game-container');
  if (gameContainer) {
    const errorHtml = `
      <div class="data-error" style="text-align: center; padding: 20px; color: var(--color-error);">
        <div style="font-size: 24px; margin-bottom: 10px;">⚠️</div>
        <h3 style="margin: 0 0 10px 0; color: var(--color-error);">Ошибка загрузки данных</h3>
        <p style="margin: 0 0 15px 0; color: var(--text-muted);">
          Не удалось загрузить данные от CoinGecko API.<br>
          Попробуйте позже или проверьте подключение к интернету.
        </p>
        <button class="btn btn-primary" id="gamePricesReloadBtn">
          🔄 Обновить
        </button>
      </div>
    `;
    
    const priceDisplay = gameContainer.querySelector('.price-display');
    if (priceDisplay) {
      priceDisplay.innerHTML = errorHtml;
    } else {
      gameContainer.insertAdjacentHTML('afterbegin', errorHtml);
    }
    
    // Add event listener for reload button
    setTimeout(() => {
      const reloadBtn = document.getElementById("gamePricesReloadBtn");
      if (reloadBtn) {
        reloadBtn.addEventListener("click", () => location.reload());
      }
    }, 0);
  }
}

/**
 * Запуск обновления цен
 */
export function startPriceUpdates() {
  setInterval(async () => {
    try {
      const prices = await fetchCoinGeckoPrices();
      
      if (!prices) {
        GameState.isOnline = false;
        return;
      }
      
      GameState.isOnline = true;
      GameState.lastApiError = null;
      
      // Обновляем текущие цены
      Object.keys(GameState.prices).forEach(asset => {
        if (GameState.prices[asset]) {
          let newPrice = prices[asset];
          
          if (newPrice && !isNaN(newPrice)) {
            // Добавляем в историю
            GameState.prices[asset].history.push({
              timestamp: Date.now(),
              price: parseFloat(newPrice)
            });
            
            // Храним только последние 60 точек (1 час)
            if (GameState.prices[asset].history.length > 60) {
              GameState.prices[asset].history.shift();
            }
            
            GameState.prices[asset].current = parseFloat(newPrice);
            GameState.prices[asset].lastUpdate = Date.now();
          }
        }
      });
      
      // Обновляем UI
      updatePriceDisplay();
      checkActiveBets();
      
    } catch (error) {
      GameState.isOnline = false;
      GameState.lastApiError = error.message;
    }
  }, 30000); // Каждые 30 секунд
}

/**
 * Загрузка ценовых данных для интервала
 */
export async function loadPriceDataForInterval(interval) {
  try {
    // Используем только данные за последний час для всех интервалов
    const historicalData = await fetchMultipleMarketCharts(['BTC', 'ETH', 'SOL', 'HYPE'], 0.0417);
    
    if (!historicalData || Object.keys(historicalData).length === 0) {
      return;
    }
    
    Object.keys(historicalData).forEach(asset => {
      if (GameState.prices[asset]) {
        const prices = historicalData[asset];
        if (prices && prices.length > 0) {
          GameState.prices[asset].history = prices;
          GameState.prices[asset].current = prices[prices.length - 1].price;
          GameState.prices[asset].lastUpdate = Date.now();
        }
      }
    });
    
    updateUI();
    
  } catch (error) {
    // Ошибка загрузки данных
  }
}

/**
 * Выбор актива
 */
export function selectAsset(asset) {
  if (!GameState.prices[asset]) return;
  
  GameState.selectedAsset = asset;
  updateUI();
  updateChart();
}


/**
 * Обновление графика
 */
function updateChart() {
  const asset = GameState.selectedAsset;
  const priceData = GameState.prices[asset];
  
  if (!priceData || !priceData.history.length) return;
  
  const canvas = document.getElementById('priceChart');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  
  // Очищаем canvas
  ctx.clearRect(0, 0, width, height);
  
  // Получаем цены
  const prices = priceData.history.map(point => point.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;
  
  // Рисуем график
  ctx.strokeStyle = '#1326FD';
  ctx.lineWidth = 2;
  ctx.beginPath();
  
  prices.forEach((price, index) => {
    const x = (index / (prices.length - 1)) * width;
    const y = height - ((price - minPrice) / priceRange) * height;
    
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  
  ctx.stroke();
  
  // Рисуем сетку
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.lineWidth = 1;
  
  // Горизонтальные линии
  for (let i = 0; i <= 4; i++) {
    const y = (height / 4) * i;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  
  // Вертикальные линии  
  for (let i = 0; i <= 4; i++) {
    const x = (width / 4) * i;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
}
