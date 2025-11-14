/**
 * MC Recovery Fund - Utility Helpers
 * Common utility functions
 */

export function getDaysWord(num) {
  if (num % 10 === 1 && num % 100 !== 11) return "день";
  if ([2, 3, 4].includes(num % 10) && ![12, 13, 14].includes(num % 100))
    return "дня";
  return "дней";
}

export function getDifficultyLabel(level) {
  const labels = { easy: "Легкий", medium: "Средний", hard: "Сложный" };
  return labels[level] || level;
}

export function getDifficultyColor(level) {
  const colors = {
    easy: "var(--color-success)",
    medium: "var(--color-primary)",
    hard: "var(--color-error)",
  };
  return colors[level] || "var(--color-text)";
}

export function getAPRClass(apr) {
  const value = parseFloat(apr);
  if (isNaN(value) || value === 0) return "apr-neutral";
  return value > 0 ? "apr-positive" : "apr-negative";
}

export function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function formatNumber(num, decimals = 2) {
  if (!num) return "0";
  const n = parseFloat(num);
  if (isNaN(n)) return "0";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatCurrency(num) {
  return "$" + formatNumber(num, 2);
}

export function formatPercent(num) {
  return formatNumber(num * 100, 2) + "%";
}

export function normalizeSearchText(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/ё/g, "е")
    .replace(/[^а-яa-z0-9\s]/gi, " ")
    .replace(/\s+/g, " ");
}

export function getDeclension(number, titles) {
  const cases = [2, 0, 1, 1, 1, 2];
  return titles[(number % 100 > 4 && number % 100 < 20) ? 2 : cases[(number % 10 < 5) ? number % 10 : 5]];
}

export function getCoinColor(coin) {
  const coinColors = {
    BTC: "#F7931A",
    ETH: "#627EEA",
    SOL: "#14F195",
    HYPE: "#00D4FF",
    BNB: "#F3BA2F",
    XRP: "#23292F",
    ADA: "#0033AD",
    DOGE: "#C2A633",
    MATIC: "#8247E5",
    AVAX: "#E84142",
  };
  return coinColors[coin] || "var(--color-primary)";
}

export function animateNumber(element, start, end, duration = 1000, isCurrency = true) {
  if (!element) return;

  const range = end - start;
  const increment = range / (duration / 16);
  let current = start;

  const timer = setInterval(() => {
    current += increment;

    if (
      (increment > 0 && current >= end) ||
      (increment < 0 && current <= end)
    ) {
      current = end;
      clearInterval(timer);
    }

    const roundedValue = Math.round(current);
    element.textContent = isCurrency
      ? formatCurrency(roundedValue)
      : roundedValue.toLocaleString("ru-RU");
  }, 16);
}
