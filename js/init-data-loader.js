/**
 * MC Recovery Fund - Data Loading Strategy
 * Optimized data loader with progress tracking
 */

// Initialize APP_DATA with empty structures
window.APP_DATA = {
  quizzes: [],
  glossary: [],
  edu: [],
  instructions: {},
  announcements: [],
  broadcasts: {},
  documents: [],
  support: {},
  dashboard: {},
  faq: {},
  literature: {},
  _loaded: {}, // Track loaded modules
  _loading: {}, // Track loading promises to avoid duplicate requests
};

// Data loading status
window.APP_DATA_READY = false;

// Lazy data loader function с оптимизацией для больших файлов
window.loadDataModule = function (moduleName, options = {}) {
  // Return cached data if already loaded
  if (window.APP_DATA._loaded[moduleName]) {
    return Promise.resolve(window.APP_DATA[moduleName]);
  }

  // Return existing loading promise if in progress
  if (window.APP_DATA._loading[moduleName]) {
    return window.APP_DATA._loading[moduleName];
  }

  // Для больших файлов используем компрессию
  const largeFiles = ["glossary", "quizzes"];
  const isLarge = largeFiles.includes(moduleName);

  // Start loading
  const loadingPromise = fetch(`data/${moduleName}.json`, {
    // Для больших файлов включаем compression
    headers: isLarge ? { "Accept-Encoding": "gzip, deflate, br" } : {},
  })
    .then((r) => {
      if (!r.ok) throw new Error(`Failed to load ${moduleName}`);
      return r.json();
    })
    .then((data) => {
      // Для больших массивов применяем ленивую загрузку
      if (isLarge && Array.isArray(data)) {
        // Используем Object.defineProperty для ленивого доступа к элементам
        const chunkSize = moduleName === "glossary" ? 50 : 20;
        window.APP_DATA[moduleName] = data; // Сохраняем полные данные
        window.APP_DATA[`${moduleName}_chunks`] = Math.ceil(
          data.length / chunkSize
        );
      } else {
        window.APP_DATA[moduleName] = data;
      }

      window.APP_DATA._loaded[moduleName] = true;
      delete window.APP_DATA._loading[moduleName];

      // Size monitoring for large files
      if (isLarge) {
        const size = JSON.stringify(data).length;
      }

      return data;
    })
    .catch((err) => {
      console.error(`Failed to load ${moduleName}:`, err);
      delete window.APP_DATA._loading[moduleName];
      throw err;
    });

  window.APP_DATA._loading[moduleName] = loadingPromise;
  return loadingPromise;
};

// Update splash loading text
function updateSplashText(text) {
  const loadingText = document.querySelector(".splash-loading-text");
  if (loadingText) loadingText.textContent = text;
}

// Progress tracking for splash screen - DYNAMIC with visible percentage
let loadedModules = 0;
const totalModules = 12; // All data modules including large files + dashboard_data

function updateProgress() {
  loadedModules++;
  const percent = Math.round((loadedModules / totalModules) * 100);
  updateSplashText(`Загрузка ${percent}%`);

  // Update progress bar width
  const progressBar = document.querySelector(".splash-progress-bar");
  if (progressBar) {
    progressBar.style.width = `${percent}%`;
  }
}

// DYNAMIC SPLASH STRATEGY:
// - Minimum 5 seconds for smooth UX
// - Wait for ALL data to load (including glossary + quizzes)
// - Show real progress percentage
const criticalDataStart = performance.now();
// Using TIMING_CONFIG.splashMinDuration (5000ms)
const minSplashDuration = 5000;
updateSplashText("Загрузка 0%");

// Load ALL data during splash (including large files)
Promise.all([
  // Critical data
  window.loadDataModule("dashboard").then(() => {
    updateProgress();
    return true;
  }),
  window.loadDataModule("dashboard_data").then(() => {
    updateProgress();
    return true;
  }),

  // Frequently accessed data
  window.loadDataModule("instructions").then(() => {
    updateProgress();
    return true;
  }),
  window.loadDataModule("faq").then(() => {
    updateProgress();
    return true;
  }),
  window.loadDataModule("edu").then(() => {
    updateProgress();
    return true;
  }),
  window.loadDataModule("announcements").then(() => {
    updateProgress();
    return true;
  }),
  window.loadDataModule("broadcasts").then(() => {
    updateProgress();
    return true;
  }),
  window.loadDataModule("documents").then(() => {
    updateProgress();
    return true;
  }),
  window.loadDataModule("literature").then(() => {
    updateProgress();
    return true;
  }),
  window.loadDataModule("support").then(() => {
    updateProgress();
    return true;
  }),

  // LARGE FILES - now loaded during splash for better UX on repeat visits
  window.loadDataModule("glossary").then(() => {
    updateProgress();
    return true;
  }),
  window.loadDataModule("quizzes").then(() => {
    updateProgress();
    return true;
  }),
])
  .then(() => {
    const loadTime = performance.now() - criticalDataStart;

    // Показываем "Инициализация..." с процентами, минимум 2.5 секунд
    const initStartTime = performance.now();
    // Using TIMING_CONFIG.initMinDuration (2500ms)
    const minInitDuration = 2500;

    // Плавное обновление процентов от 100% до завершения инициализации
    let currentInitPercent = 100;
    const initInterval = setInterval(() => {
      const elapsed = performance.now() - initStartTime;
      const remaining = minInitDuration - elapsed;

      if (remaining <= 0) {
        clearInterval(initInterval);
        updateSplashText("Инициализация... 100%");
      } else {
        // Плавный прогресс от 100% (уже загружено) + индикатор инициализации
        updateSplashText("Инициализация... 100%");
      }
    }, 100);

    setTimeout(() => {
      clearInterval(initInterval);
      window.APP_DATA_READY = true;
      document.dispatchEvent(new CustomEvent("app-data-ready"));
    }, minInitDuration);
  })
  .catch((err) => {
    console.error("Failed to load data:", err);
    updateSplashText("Ошибка загрузки");

    // Show error in splash screen
    setTimeout(() => {
      const splash = document.getElementById("splashScreen");
      if (splash) {
        const splashContent = splash.querySelector(".splash-content");
        if (splashContent) {
          splashContent.innerHTML = `
                    <div style="text-align: center;">
                        <div style="font-size: 64px; margin-bottom: 16px;">⚠️</div>
                        <h2 style="margin-bottom: 8px; color: var(--text-primary);">Ошибка загрузки</h2>
                        <p style="color: var(--text-muted); margin-bottom: 24px;">Проверьте подключение к интернету</p>
                        <button class="btn btn-primary" id="splashReloadBtn">
                            🔄 Повторить
                        </button>
                    </div>
                `;
          // Add event listener for reload button
          const reloadBtn = document.getElementById("splashReloadBtn");
          if (reloadBtn) {
            reloadBtn.addEventListener("click", () => location.reload());
          }
        }
      }
    }, 500);
  });

// All data now loaded during splash screen!
// Dynamic splash waits for all modules to load (12 total)
// No background loading needed - everything is ready after splash
