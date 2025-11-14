/**
 * MC Recovery Fund - Global State Management
 * Centralized state for the application
 */

export const AppState = {
  currentRoute: "home",
  activeTab: "home",
  parentTab: null,
  currentQuiz: null,
  currentQuestion: 0,
  quizAnswers: [],
  selectedAnswer: undefined,
  currentQuestionCorrectIndex: null,
  userData: {
    streak: 0,
    lastActiveDate: null,
    completedQuizzes: [],
    unlockedBadges: [],
    progress: { quizzes: 0, eduTopics: 0, glossaryViewed: 0 },
    settings: { theme: "auto", language: "ru" },
    viewedTerms: [],
    perfectQuizzes: 0,
    visitedSections: [],
  },
  vaultData: {
    positions: null,
    metrics: null,
    loading: false,
    error: null,
    lastUpdated: null,
  },
};

export const DashboardState = {
  data: null,
  filteredData: null,
  filters: {
    year: null,
    month: null,
    coin: null,
    direction: null,
    leverage: null,
  },
  sortBy: "date-desc",
  isUpdatingFilters: false,
};

export const GlossaryState = {
  allTerms: [],
  filteredTerms: [],
  currentCategory: 'all',
  searchQuery: '',
  viewportHeight: 0,
  itemHeight: 200,
  visibleStart: 0,
  visibleEnd: 30,
  scrollTop: 0
};

export const GameState = {
  // Игрок
  balance: 0, // Текущий баланс TAPS
  totalTaps: 0, // Всего кликов
  maxBalance: 0, // Максимальный баланс за все время
  
  // Активы
  selectedAsset: "BTC",
  prices: {
    BTC: { current: 0, history: [], lastUpdate: null },
    ETH: { current: 0, history: [], lastUpdate: null },
    SOL: { current: 0, history: [], lastUpdate: null },
    HYPE: { current: 0, history: [], lastUpdate: null }
  },
  
  // Ставки
  activeBets: [], // { id, asset, direction, amount, startPrice, startTime, duration }
  betHistory: [], // { asset, direction, amount, pnl, timestamp }
  
  // UI
  isOnline: true,
  lastApiError: null,
  
  // Worker
  worker: null,
  workerReady: false,
  
  // Stats
  stats: {
    totalBets: 0,
    wonBets: 0,
    lostBets: 0,
    totalProfit: 0,
    winRate: 0
  }
};
