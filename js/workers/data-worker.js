/**
 * MC Recovery Fund - Data Processing Web Worker
 * Обработка больших JSON файлов в отдельном потоке
 */

// Обработка glossary данных
function processGlossary(data) {
  const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
  
  // Добавляем категории и индексы для поиска
  const processed = data.map(term => {
    const text = `${term.term} ${term.definition}`.toLowerCase();
    
    // Определение категории
    let category = term.category || 'general';
    if (!term.category) {
      if (text.includes('nft') || text.includes('токен') || text.includes('коллекци')) {
        category = 'nft';
      } else if (text.includes('defi') || text.includes('децентрализованн') || text.includes('ликвидност')) {
        category = 'defi';
      } else if (text.includes('блокчейн') || text.includes('майнинг') || text.includes('консенсус')) {
        category = 'blockchain';
      } else if (text.includes('биржа') || text.includes('трейдинг') || text.includes('ордер')) {
        category = 'trading';
      }
    }
    
    // Создаем поисковый индекс
    const searchIndex = [
      term.term?.toLowerCase() || '',
      term.definition?.toLowerCase() || '',
      category
    ].join(' ');
    
    return {
      ...term,
      category,
      searchIndex,
      firstLetter: (term.term || '').charAt(0).toUpperCase()
    };
  });
  
  const processingTime = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime;
  
  return {
    data: processed,
    stats: {
      count: processed.length,
      categories: [...new Set(processed.map(t => t.category))],
      processingTime: Math.round(processingTime)
    }
  };
}

// Обработка quizzes данных
function processQuizzes(data) {
  const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
  
  const processed = data.map(quiz => {
    // Предвычисляем метаданные
    const questionCount = quiz.questions?.length || 0;
    const duration = Math.ceil(questionCount * 1.5); // ~1.5 мин на вопрос
    
    // Создаем индекс для быстрого поиска
    const searchIndex = [
      quiz.title?.toLowerCase() || '',
      quiz.description?.toLowerCase() || '',
      quiz.difficulty || ''
    ].join(' ');
    
    return {
      ...quiz,
      questionCount,
      duration,
      searchIndex
    };
  });
  
  const processingTime = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime;
  
  return {
    data: processed,
    stats: {
      count: processed.length,
      byDifficulty: {
        easy: processed.filter(q => q.difficulty === 'easy').length,
        medium: processed.filter(q => q.difficulty === 'medium').length,
        hard: processed.filter(q => q.difficulty === 'hard').length
      },
      processingTime: Math.round(processingTime)
    }
  };
}

// Поиск по glossary
function searchGlossary(terms, query) {
  const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const normalizedQuery = query.toLowerCase().trim();
  
  if (!normalizedQuery) {
    return { results: terms, searchTime: 0 };
  }
  
  const queryWords = normalizedQuery.split(/\s+/);
  
  const results = terms
    .map(term => {
      let score = 0;
      const normalizedTerm = term.term?.toLowerCase() || '';
      const normalizedDef = term.definition?.toLowerCase() || '';
      
      // Точное совпадение термина
      if (normalizedTerm === normalizedQuery) {
        score += 1000;
      }
      
      // Начинается с запроса
      if (normalizedTerm.startsWith(normalizedQuery)) {
        score += 500;
      }
      
      // Содержит все слова запроса
      const allWordsInTerm = queryWords.every(w => normalizedTerm.includes(w));
      const allWordsInDef = queryWords.every(w => normalizedDef.includes(w));
      
      if (allWordsInTerm) score += 200;
      else if (allWordsInDef) score += 20;
      
      // Отдельные слова
      queryWords.forEach(word => {
        if (normalizedTerm.includes(word)) score += 50;
        if (normalizedDef.includes(word)) score += 5;
      });
      
      return { term, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(item => item.term);
  
  const searchTime = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime;
  
  return {
    results,
    searchTime: Math.round(searchTime),
    count: results.length
  };
}

// Фильтрация по категории
function filterByCategory(terms, category) {
  if (category === 'all') return terms;
  return terms.filter(t => t.category === category);
}

// Worker initialization
try {
  self.postMessage({ type: 'ready' });
} catch (e) {
  // Initial message failed
}

// Global error handler
self.addEventListener('error', (error) => {
  console.error('[Worker] Global error:', error.message);
});

// Обработчик сообщений от главного потока
self.addEventListener('message', (event) => {
  const { action, data, params, id } = event.data;
  
  try {
    let result;
    
    switch (action) {
      case 'processGlossary':
        result = processGlossary(data);
        break;
        
      case 'processQuizzes':
        result = processQuizzes(data);
        break;
        
      case 'searchGlossary':
        result = searchGlossary(data, params.query);
        break;
        
      case 'filterGlossary':
        const filtered = filterByCategory(data, params.category);
        result = { data: filtered, count: filtered.length };
        break;
        
      default:
        throw new Error(`Unknown action: ${action}`);
    }
    
    // Отправляем результат обратно
    self.postMessage({
      id,
      action,
      success: true,
      result
    });
    
  } catch (error) {
    // Отправляем ошибку
    self.postMessage({
      id,
      action,
      success: false,
      error: error.message
    });
  }
});
