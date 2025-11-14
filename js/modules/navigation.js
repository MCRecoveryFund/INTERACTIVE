/**
 * MC Recovery Fund - Navigation Module
 * Routing and navigation logic
 */

import { AppState } from '../core/state.js';
import { TAB_ROUTES, PAGE_TO_TAB } from '../core/config.js';
import { hapticFeedback, tg } from './telegram.js';

export function switchTab(tabName) {
  // Батчим все операции через requestAnimationFrame для INP <100ms
  requestAnimationFrame(() => {
    hapticFeedback("light");
    
    // Cleanup предыдущей вкладки (особенно для game)
    const prevTab = AppState.activeTab;
    if (prevTab === 'game' && prevTab !== tabName) {
      // Cleanup game компонента
      import('../components/game.js').then(module => {
        if (module.cleanup) module.cleanup();
      }).catch(() => {});
    }
    
    // Асинхронный scroll для неблокирующей работы
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "auto" });
    });

    AppState.activeTab = tabName;
    AppState.currentRoute = tabName;
    AppState.parentTab = null;

    // Асинхронное сохранение в localStorage
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        localStorage.setItem("lastActiveTab", tabName);
      }, { timeout: 100 });
    } else {
      setTimeout(() => {
        localStorage.setItem("lastActiveTab", tabName);
      }, 0);
    }

    updateTabBar();

    const backBtn = document.getElementById("backBtn");
    if (backBtn) backBtn.style.display = "none";
    
    // Скрываем Telegram BackButton на главных вкладках
    if (tg?.BackButton) {
      tg.BackButton.hide();
    }

    // Динамически загружаем нужный render модуль
    import(`../components/${tabName}.js`)
      .then(module => {
        requestAnimationFrame(() => {
          const content = document.getElementById("content");
          module.render(content);
        });
      })
      .catch(err => {
        console.error(`Failed to load ${tabName} module:`, err);
        // Fallback
        import('../components/home.js').then(module => {
          requestAnimationFrame(() => {
            module.render(document.getElementById("content"));
          });
        });
      });
  });
}

export function updateTabBar() {
  // Батчим DOM reads и writes через requestAnimationFrame
  requestAnimationFrame(() => {
    const tabs = document.querySelectorAll(".tab-item");
    const indicator = document.querySelector(".tab-indicator");
    
    let activeTab = null;
    
    // Фаза READ - читаем все размеры сразу
    const tabData = Array.from(tabs).map(tab => ({
      element: tab,
      tabName: tab.dataset.tab,
      isActive: tab.dataset.tab === AppState.activeTab,
      width: tab.offsetWidth,
      left: tab.offsetLeft
    }));
    
    // Фаза WRITE - применяем все изменения
    requestAnimationFrame(() => {
      tabData.forEach(({ element, isActive, width, left }) => {
        if (isActive) {
          element.classList.add("active");
          activeTab = { width, left };
        } else {
          element.classList.remove("active");
        }
      });
      
      // Обновляем indicator одной операцией
      if (indicator && activeTab) {
        indicator.style.cssText = `width: ${activeTab.width}px; left: ${activeTab.left}px;`;
      }
    });
  });
}

export function renderTabBar() {
  const tabBar = document.getElementById("tabBar");
  if (!tabBar) return;

  const tabsHTML = Object.keys(TAB_ROUTES)
    .map((tabKey) => {
      const tab = TAB_ROUTES[tabKey];
      const isActive = AppState.activeTab === tabKey;
      return `
      <div class="tab-item ${isActive ? "active" : ""}" data-tab="${tabKey}" data-action="switchTab">
        <span class="tab-icon">${tab.icon}</span>
        <span class="tab-label">${tab.label}</span>
        ${tab.badge > 0 ? `<span class="tab-badge">${tab.badge}</span>` : ""}
      </div>
    `;
    })
    .join("");

  tabBar.innerHTML = `${tabsHTML}<div class="tab-indicator"></div>`;

  setTimeout(() => updateTabBar(), 50);
}

export function navigate(route, params = {}) {
  hapticFeedback("light");
  window.scrollTo({ top: 0, behavior: "auto" });

  const isTabRoute = ["home", "learn", "game", "data", "more"].includes(route);

  if (isTabRoute) {
    switchTab(route);
    return;
  }

  AppState.currentRoute = route;
  window.location.hash = route;
  if (tg?.MainButton) tg.MainButton.hide();
  
  const backBtn = document.getElementById("backBtn");
  const tabBar = document.getElementById("tabBar");

  if (tabBar) tabBar.style.display = "flex";
  if (backBtn) backBtn.style.display = "flex";
  
  // Показываем Telegram BackButton на вложенных страницах
  if (tg?.BackButton) {
    tg.BackButton.show();
  }
  
  if (!AppState.parentTab) {
    AppState.parentTab = AppState.activeTab;
  }

  // Динамически загружаем нужный компонент
  const componentMap = {
    'quizzes': 'quiz',
    'quiz': 'quiz',
    'quiz-question': 'quiz',
    'quiz-result': 'quiz',
    'glossary': 'glossary',
    'dashboard': 'dashboard',
    'edu': 'edu',
    'faq': 'faq',
    'literature': 'literature',
    'instructions': 'instructions',
    'announcements': 'announcements',
    'broadcasts': 'broadcasts',
    'documents': 'documents',
    'support': 'support',
    'my-progress': 'progress',
    'achievements': 'achievements'
  };

  const componentName = componentMap[route] || 'home';
  
  import(`../components/${componentName}.js`)
    .then(module => {
      const content = document.getElementById("content");
      if (module[`render${capitalize(route)}`]) {
        module[`render${capitalize(route)}`](content, params);
      } else if (module.render) {
        module.render(content, params);
      }
    })
    .catch(err => {
      console.error(`Failed to load component for route ${route}:`, err);
    });
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/-./g, x => x[1].toUpperCase());
}

export function handleBackButton() {
  const currentRoute = AppState.currentRoute;

  if (currentRoute === "quiz-question" || currentRoute === "quiz-result") {
    navigate("quizzes");
    return;
  }

  if (currentRoute === "quiz") {
    navigate("quizzes");
    return;
  }

  if (AppState.parentTab) {
    switchTab(AppState.parentTab);
    return;
  }

  const parentTab = PAGE_TO_TAB[currentRoute];

  if (parentTab) {
    switchTab(parentTab);
  } else {
    switchTab("home");
  }
}
