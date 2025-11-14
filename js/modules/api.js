/**
 * MC Recovery Fund - API Module
 * External API calls (Hyperliquid)
 */

import { HYPERLIQUID_API } from '../core/config.js';
import { AppState } from '../core/state.js';

async function fetchHyperliquidData(requestBody) {
  try {
    const response = await fetch(HYPERLIQUID_API.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Hyperliquid API error:", error);
    throw error;
  }
}

async function fetchVaultPositions() {
  return fetchHyperliquidData({
    type: "clearinghouseState",
    user: HYPERLIQUID_API.vaultAddress,
  });
}

async function fetchVaultDetails() {
  return fetchHyperliquidData({
    type: "vaultDetails",
    vaultAddress: HYPERLIQUID_API.vaultAddress,
  });
}

export async function loadVaultData() {
  if (AppState.vaultData.loading) return;

  AppState.vaultData.loading = true;
  AppState.vaultData.error = null;

  try {
    const [positions, details] = await Promise.all([
      fetchVaultPositions(),
      fetchVaultDetails(),
    ]);

    AppState.vaultData.positions = positions;
    AppState.vaultData.metrics = details;
    AppState.vaultData.lastUpdated = Date.now();
    AppState.vaultData.loading = false;

    return { positions, details };
  } catch (error) {
    AppState.vaultData.error = error.message;
    AppState.vaultData.loading = false;
    throw error;
  }
}

/**
 * Fetch user portfolio data (account value history, PnL history)
 * @param {string} userAddress - User wallet address
 * @returns {Promise<Array>} Portfolio data with periods (day, week, month, allTime)
 */
export async function fetchUserPortfolio(userAddress) {
  return fetchHyperliquidData({
    type: "portfolio",
    user: userAddress
  });
}

/**
 * Fetch user referral information
 * @param {string} userAddress - User wallet address
 * @returns {Promise<Object>} Referral data
 */
export async function fetchUserReferral(userAddress) {
  return fetchHyperliquidData({
    type: "referral",
    user: userAddress
  });
}

/**
 * Fetch user fees information
 * @param {string} userAddress - User wallet address
 * @returns {Promise<Object>} Fees data
 */
export async function fetchUserFees(userAddress) {
  return fetchHyperliquidData({
    type: "userFees",
    user: userAddress
  });
}

/**
 * Fetch user fills (trade history)
 * @param {string} userAddress - User wallet address
 * @param {boolean} aggregateByTime - Aggregate partial fills (default: true)
 * @returns {Promise<Array>} Array of fills (max 2000)
 */
export async function fetchUserFills(userAddress, aggregateByTime = true) {
  return fetchHyperliquidData({
    type: "userFills",
    user: userAddress,
    aggregateByTime
  });
}

/**
 * Fetch user funding history
 * @param {string} userAddress - User wallet address
 * @param {number} startTime - Start timestamp (optional)
 * @param {number} endTime - End timestamp (optional)
 * @returns {Promise<Array>} Funding history
 */
export async function fetchUserFunding(userAddress, startTime = null, endTime = null) {
  const request = {
    type: "userFunding",
    user: userAddress
  };
  
  if (startTime) request.startTime = startTime;
  if (endTime) request.endTime = endTime;
  
  return fetchHyperliquidData(request);
}

/**
 * Load MC Recovery Vault data (only for vault display)
 * @param {string} userAddress - User wallet address (defaults to vault address)
 * @returns {Promise<Object>} Vault data (positions, portfolio, details)
 */
export async function loadDashboardData(userAddress = HYPERLIQUID_API.vaultAddress) {
  try {
    const [positions, portfolio, details, referral, fees] = await Promise.all([
      fetchHyperliquidData({ type: "clearinghouseState", user: userAddress }),
      fetchUserPortfolio(userAddress),
      fetchHyperliquidData({ type: "vaultDetails", vaultAddress: userAddress }),
      fetchUserReferral(userAddress).catch(() => null), // Optional
      fetchUserFees(userAddress).catch(() => null) // Optional
    ]);

    return {
      positions,
      portfolio,
      vaultDetails: details,
      referral,
      fees,
      lastUpdated: Date.now()
    };
  } catch (error) {
    console.error('[API] Failed to load dashboard data:', error);
    throw error;
  }
}

/**
 * Fetch all available coins/markets from Hyperliquid
 * @returns {Promise<Array>} Array of coin metadata
 */
export async function fetchAllCoins() {
  return fetchHyperliquidData({
    type: "meta"
  });
}

/**
 * Fetch current prices from CoinGecko API
 * @param {Array} coinIds - Array of coin IDs (bitcoin, ethereum, solana, hyperliquid)
 * @returns {Promise<Object>} Object with coin: price mapping
 */
export async function fetchCoinGeckoPrices(coinIds = ['bitcoin', 'ethereum', 'solana', 'hyperliquid']) {
  try {
    const endpoint = `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds.join(',')}&vs_currencies=usd`;
    const response = await fetch(endpoint);
    
    if (!response.ok) {
      throw new Error(`CoinGecko API Error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Map coin IDs to our asset names
    const assetMap = {
      'bitcoin': 'BTC',
      'ethereum': 'ETH', 
      'solana': 'SOL',
      'hyperliquid': 'HYPE'
    };
    
    const priceMap = {};
    Object.entries(data).forEach(([coinId, priceData]) => {
      const asset = assetMap[coinId];
      if (asset && priceData.usd) {
        priceMap[asset] = parseFloat(priceData.usd);
      }
    });
    
    return priceMap;
    
  } catch (error) {
    console.error('Failed to fetch CoinGecko prices:', error);
    throw error;
  }
}

/**
 * Fetch historical market chart data from CoinGecko API
 * @param {string} coinId - Coin ID (bitcoin, ethereum, solana, hyperliquid)
 * @param {number} days - Number of days (0.0417 for 1 hour, 1 for 24 hours)
 * @returns {Promise<Array>} Array of price points with timestamp and price
 */
export async function fetchCoinGeckoMarketChart(coinId, days = 1) {
  try {
    const endpoint = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`;
    const response = await fetch(endpoint);
    
    if (!response.ok) {
      throw new Error(`CoinGecko Market Chart API Error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Transform price data to our format
    if (data.prices && Array.isArray(data.prices)) {
      return data.prices.map(([timestamp, price]) => ({
        timestamp,
        price: parseFloat(price)
      }));
    }
    
    return [];
    
  } catch (error) {
    console.error(`Failed to fetch ${coinId} market chart:`, error);
    throw error;
  }
}

/**
 * Fetch historical data for multiple assets from CoinGecko
 * @param {Array} assets - Array of asset names ['BTC', 'ETH', 'SOL', 'HYPE']
 * @param {number} days - Number of days for historical data
 * @returns {Promise<Object>} Object with asset: history mapping
 */
export async function fetchMultipleMarketCharts(assets = ['BTC', 'ETH', 'SOL', 'HYPE'], days = 1) {
  try {
    // Map asset names to CoinGecko IDs
    const assetToCoinId = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'SOL': 'solana',
      'HYPE': 'hyperliquid'
    };
    
    const promises = assets.map(async asset => {
      const coinId = assetToCoinId[asset];
      if (!coinId) {
        return { asset, history: [] };
      }
      
      try {
        const history = await fetchCoinGeckoMarketChart(coinId, days);
        return { asset, history };
      } catch (error) {
        return { asset, history: [] };
      }
    });
    
    const results = await Promise.all(promises);
    
    // Convert to object format
    const historyMap = {};
    results.forEach(({ asset, history }) => {
      historyMap[asset] = history;
    });
    
    return historyMap;
    
  } catch (error) {
    console.error('Failed to fetch multiple market charts:', error);
    throw error;
  }
}

/**
 * Fetch mid prices for all coins
 * @returns {Promise<Object>} Object with coin: price mapping
 */
export async function fetchAllMids() {
  return fetchHyperliquidData({
    type: "allMids"
  });
}
