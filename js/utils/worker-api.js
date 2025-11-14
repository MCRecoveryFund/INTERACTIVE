/**
 * MC Recovery Fund - Web Worker API
 * Обертка для работы с data-worker
 */

class DataWorkerAPI {
  constructor() {
    this.worker = null;
    this.messageId = 0;
    this.pendingMessages = new Map();
    this.isSupported = typeof Worker !== 'undefined';
  }

  /**
   * Инициализация worker
   */
  init() {
    if (!this.isSupported) {
      console.warn('[WorkerAPI] Web Workers not supported, using fallback');
      return false;
    }

    try {
      // Use proper URL resolution for worker path
      // This works in both dev and production
      const workerPath = new URL('../workers/data-worker.js', import.meta.url);
      this.worker = new Worker(workerPath);
      console.log('[WorkerAPI] Worker initialized successfully at:', workerPath.href);
      
      this.worker.addEventListener('message', (event) => {
        const { id, success, result, error } = event.data;
        
        const pending = this.pendingMessages.get(id);
        if (pending) {
          if (success) {
            pending.resolve(result);
          } else {
            pending.reject(new Error(error));
          }
          this.pendingMessages.delete(id);
        }
      });
      
      this.worker.addEventListener('error', (error) => {
        console.error('[WorkerAPI] Worker error:', {
          message: error.message,
          filename: error.filename,
          lineno: error.lineno,
          colno: error.colno,
          error: error
        });
        // Worker failed, mark as unavailable
        this.worker = null;
      });
      
      return true;
      
    } catch (error) {
      console.error('[WorkerAPI] Failed to create worker:', error);
      this.worker = null;
      return false;
    }
  }

  /**
   * Отправка сообщения worker
   */
  sendMessage(action, data, params = {}) {
    if (!this.worker) {
      return Promise.reject(new Error('Worker not initialized'));
    }

    return new Promise((resolve, reject) => {
      const id = ++this.messageId;
      
      this.pendingMessages.set(id, { resolve, reject });
      
      // Timeout для long-running операций
      const timeout = setTimeout(() => {
        if (this.pendingMessages.has(id)) {
          this.pendingMessages.delete(id);
          reject(new Error('Worker operation timeout'));
        }
      }, 30000); // 30 секунд
      
      // Очищаем timeout при resolve/reject
      const originalResolve = resolve;
      const originalReject = reject;
      
      this.pendingMessages.set(id, {
        resolve: (result) => {
          clearTimeout(timeout);
          originalResolve(result);
        },
        reject: (error) => {
          clearTimeout(timeout);
          originalReject(error);
        }
      });
      
      this.worker.postMessage({ id, action, data, params });
    });
  }

  /**
   * Обработка glossary данных
   */
  async processGlossary(glossaryData) {
    try {
      const result = await this.sendMessage('processGlossary', glossaryData);
      return result.data;
    } catch (error) {
      console.error('[WorkerAPI] Glossary processing failed:', error);
      // Fallback: обрабатываем в главном потоке
      return glossaryData;
    }
  }

  /**
   * Обработка quizzes данных
   */
  async processQuizzes(quizzesData) {
    try {
      const result = await this.sendMessage('processQuizzes', quizzesData);
      return result.data;
    } catch (error) {
      console.error('[WorkerAPI] Quizzes processing failed:', error);
      return quizzesData;
    }
  }

  /**
   * Поиск по glossary в worker
   */
  async searchGlossary(terms, query) {
    if (!this.worker) {
      console.log('[WorkerAPI] Worker not available, using main thread search');
      // Use main thread immediately if worker not available
      throw new Error('Worker not initialized');
    }
    
    try {
      const result = await this.sendMessage('searchGlossary', terms, { query });
      return result.results;
    } catch (error) {
      console.warn('[WorkerAPI] Search failed, falling back to main thread:', error);
      // This error will be caught by glossary.js fallback
      throw error;
    }
  }

  /**
   * Фильтрация по категории
   */
  async filterGlossary(terms, category) {
    if (!this.worker) {
      console.log('[WorkerAPI] Worker not available, using main thread filter');
      // Use main thread immediately if worker not available
      throw new Error('Worker not initialized');
    }
    
    try {
      const result = await this.sendMessage('filterGlossary', terms, { category });
      return result.data;
    } catch (error) {
      console.warn('[WorkerAPI] Filter failed, falling back to main thread:', error);
      // This error will be caught by glossary.js fallback
      throw error;
    }
  }

  /**
   * Остановка worker
   */
  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.pendingMessages.clear();
    }
  }
}

// Singleton instance
export const workerAPI = new DataWorkerAPI();

// NOTE: Worker должен быть инициализирован явно через workerAPI.init() в app-main.js
// Автоматическая инициализация убрана для более предсказуемого поведения
