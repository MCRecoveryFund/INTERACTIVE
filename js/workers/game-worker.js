/**
 * Game Worker - Trading Simulator
 * Обрабатывает API запросы, управляет ставками и расчетами PnL
 */

// Конфигурация
const CONFIG = {
  updateInterval: 5000,
  betMultiplier: 1.8,
  maxHistoryPoints: 30,
  
  // Базовые цены для симуляции
  basePrices: {
    BTC: 67000,
    ETH: 3500,
    SOL: 180,
    HYPE: 25
  }
};

// Состояние worker
let state = {
  prices: {},
  priceHistory: {},
  activeBets: [],
  updateTimer: null,
  isOnline: true,
  lastFetchTime: {},
  cachedPrices: {}
};

// Инициализация
self.addEventListener("message", handleMessage);

function handleMessage(e) {
  const { type, payload } = e.data;
  
  switch (type) {
    case "INIT":
      initialize();
      break;
      
    case "START_PRICE_UPDATES":
      startPriceUpdates();
      break;
      
    case "STOP_PRICE_UPDATES":
      stopPriceUpdates();
      break;
      
    case "PLACE_BET":
      placeBet(payload);
      break;
      
    case "GET_PRICES":
      sendPrices();
      break;
      
    default:
      // Unknown message type - silently ignore
      break;
  }
}

function initialize() {
  self.postMessage({ type: "WORKER_READY" });
}

async function startPriceUpdates() {
  if (state.updateTimer) return;
  
  // Первое обновление сразу
  await fetchAllPrices();
  
  // Затем по таймеру
  state.updateTimer = setInterval(async () => {
    await fetchAllPrices();
    checkActiveBets();
  }, CONFIG.updateInterval);
}

function stopPriceUpdates() {
  if (state.updateTimer) {
    clearInterval(state.updateTimer);
    state.updateTimer = null;
  }
}

async function fetchAllPrices() {
  const now = Date.now();
  
  // Симуляция движения цен с небольшой вариацией
  for (const [symbol, basePrice] of Object.entries(CONFIG.basePrices)) {
    // Добавляем +/- 2% случайной вариации для симуляции движения цены
    const variation = (Math.random() - 0.5) * 0.04;
    const price = basePrice * (1 + variation);
    
    state.prices[symbol] = parseFloat(price.toFixed(2));
    state.lastFetchTime[symbol] = now;
    
    if (!state.priceHistory[symbol]) {
      state.priceHistory[symbol] = [];
    }
    
    state.priceHistory[symbol].push({ time: now, price: state.prices[symbol] });
    
    // Ограничиваем размер истории
    if (state.priceHistory[symbol].length > CONFIG.maxHistoryPoints) {
      state.priceHistory[symbol].shift();
    }
  }
  
  state.isOnline = true;
  sendPrices();
}

function sendPrices() {
  self.postMessage({
    type: "PRICE_UPDATE",
    payload: {
      prices: state.prices,
      history: state.priceHistory,
      isOnline: state.isOnline,
      timestamp: Date.now()
    }
  });
}

function placeBet(bet) {
  const { id, asset, direction, amount, startPrice, startTime, duration } = bet;
  
  // Валидация
  if (!state.prices[asset]) {
    self.postMessage({
      type: "BET_ERROR",
      payload: { error: "Цена актива недоступна" }
    });
    return;
  }
  
  // Добавляем ставку
  const activeBet = {
    id,
    asset,
    direction,
    amount,
    startPrice: startPrice || state.prices[asset],
    startTime: startTime || Date.now(),
    duration: duration || 30000 // 30 секунд по умолчанию
  };
  
  state.activeBets.push(activeBet);
  
  self.postMessage({
    type: "BET_PLACED",
    payload: { bet: activeBet }
  });
  
  // Устанавливаем таймер для завершения ставки
  setTimeout(() => {
    resolveBet(activeBet);
  }, activeBet.duration);
}

function checkActiveBets() {
  const now = Date.now();
  
  state.activeBets.forEach(bet => {
    const elapsed = now - bet.startTime;
    
    if (elapsed >= bet.duration) {
      resolveBet(bet);
    }
  });
}

function resolveBet(bet) {
  const currentPrice = state.prices[bet.asset];
  
  if (!currentPrice) {
    console.error("[Worker] Cannot resolve bet: price unavailable");
    return;
  }
  
  const priceChange = currentPrice - bet.startPrice;
  const isPriceUp = priceChange > 0;
  const won = (bet.direction === "UP" && isPriceUp) || (bet.direction === "DOWN" && !isPriceUp);
  
  // Расчет PnL
  const pnl = won ? bet.amount * (CONFIG.betMultiplier - 1) : -bet.amount;
  
  // Удаляем из активных
  state.activeBets = state.activeBets.filter(b => b.id !== bet.id);
  
  // Отправляем результат
  self.postMessage({
    type: "BET_RESOLVED",
    payload: {
      bet,
      result: {
        won,
        pnl,
        startPrice: bet.startPrice,
        endPrice: currentPrice,
        priceChange,
        timestamp: Date.now()
      }
    }
  });
}
