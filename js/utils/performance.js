/**
 * MC Recovery Fund - Performance Utilities
 * Optimization utilities for app performance
 */

import { CACHE_CONFIG, PERFORMANCE_CONFIG } from '../core/config.js';
import { workerAPI } from './worker-api.js';

// Enhanced Render Cache with LRU eviction
export const RenderCache = {
  _cache: new Map(),
  _maxSize: 100,
  _accessOrder: new Map(),
  
  get(key) {
    const value = this._cache.get(key);
    if (value !== undefined) {
      this._accessOrder.set(key, Date.now());
    }
    return value;
  },
  
  set(key, value) {
    if (this._cache.size >= this._maxSize) {
      let oldestKey = null;
      let oldestTime = Infinity;
      
      for (const [k, time] of this._accessOrder.entries()) {
        if (time < oldestTime) {
          oldestTime = time;
          oldestKey = k;
        }
      }
      
      if (oldestKey) {
        this._cache.delete(oldestKey);
        this._accessOrder.delete(oldestKey);
      }
    }
    
    this._cache.set(key, value);
    this._accessOrder.set(key, Date.now());
  },
  
  clear(pattern) {
    if (pattern) {
      for (const key of this._cache.keys()) {
        if (key.includes(pattern)) {
          this._cache.delete(key);
          this._accessOrder.delete(key);
        }
      }
    } else {
      this._cache.clear();
      this._accessOrder.clear();
    }
  },
  
  getStats() {
    return {
      size: this._cache.size,
      maxSize: this._maxSize,
    };
  }
};

// Batch DOM Updates
export const BatchDOMUpdater = {
  _pending: [],
  _rafId: null,
  
  schedule(fn) {
    this._pending.push(fn);
    if (!this._rafId) {
      this._rafId = requestAnimationFrame(() => {
        const updates = this._pending.splice(0);
        this._rafId = null;
        updates.forEach(fn => fn());
      });
    }
  }
};

// Debounce function
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Throttle function
export function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Ensure data module is loaded
export async function ensureDataLoaded(moduleName) {
  if (window.APP_DATA._loaded[moduleName]) {
    return true;
  }
  
  try {
    await window.loadDataModule(moduleName);
    
    // Обрабатываем большие файлы в Web Worker
    if (moduleName === 'glossary' && window.APP_DATA.glossary) {
      const processedData = await workerAPI.processGlossary(window.APP_DATA.glossary);
      window.APP_DATA.glossary = processedData;
    } else if (moduleName === 'quizzes' && window.APP_DATA.quizzes) {
      const processedData = await workerAPI.processQuizzes(window.APP_DATA.quizzes);
      window.APP_DATA.quizzes = processedData;
    }
    
    return true;
  } catch (err) {
    console.error(`Failed to load ${moduleName}:`, err);
    return false;
  }
}

// Lazy Load Images with Intersection Observer
export function initLazyLoading() {
  const lazyImages = document.querySelectorAll('img[data-src], img[loading="lazy"]');

  if ("IntersectionObserver" in window) {
    const imageObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.removeAttribute("data-src");
            }
            img.classList.add("loaded");
            imageObserver.unobserve(img);
          }
        });
      },
      {
        rootMargin: "50px 0px",
        threshold: 0.01,
      }
    );

    lazyImages.forEach((img) => imageObserver.observe(img));
  } else {
    lazyImages.forEach((img) => {
      if (img.dataset.src) {
        img.src = img.dataset.src;
        img.removeAttribute("data-src");
      }
    });
  }
}
