/**
 * Canvas Renderer для Trading Game
 * Рендеринг графиков цен и UI элементов
 */

import { GAME_CONFIG } from '../core/config.js';

export class CanvasRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = window.devicePixelRatio || 1;
    
    // Dynamic colors based on theme
    this.updateColors();
    
    // Animation state for smooth scrolling
    this.animationState = {
      scrollOffset: 0,
      targetScrollOffset: 0,
      lastDataLength: 0,
      smoothingFactor: 0.15 // 0.15 = плавное движение, 1.0 = мгновенное
    };
    
    this.resize();
    window.addEventListener('resize', () => this.resize());
    
    // Update colors on theme change
    window.addEventListener('themeChange', () => this.updateColors());
  }
  
  updateColors() {
    const root = getComputedStyle(document.documentElement);
    
    this.colors = {
      up: root.getPropertyValue('--color-buy').trim() || '#10b981',
      down: root.getPropertyValue('--color-sell').trim() || '#ef4444',
      neutral: root.getPropertyValue('--terminal-text-secondary').trim() || '#6b7280',
      grid: root.getPropertyValue('--terminal-border').trim() || '#374151',
      text: root.getPropertyValue('--terminal-text-secondary').trim() || '#9ca3af'
    };
  }
  
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
  }
  
  clear() {
    const rect = this.canvas.getBoundingClientRect();
    this.ctx.clearRect(0, 0, rect.width, rect.height);
  }
  
  /**
   * Рисует график цены - Линейный график с градиентом
   * С плавной анимацией смещения влево
   */
  drawPriceChart(priceHistory, currentPrice, width, height) {
    if (!priceHistory || priceHistory.length < 2) {
      this.drawNoData(width, height);
      return;
    }
    
    const padding = { left: 50, right: 60, top: 20, bottom: 20 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    // Преобразуем данные в точки
    const points = this.convertToPoints(priceHistory);
    
    // Плавная анимация при добавлении новых данных
    this.updateScrollAnimation(points.length, chartWidth);
    
    // Находим min/max с padding для лучшей визуализации
    const allPrices = points.map(p => p.price);
    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    const priceRange = maxPrice - minPrice || 1;
    const paddedMin = minPrice - priceRange * 0.05;
    const paddedMax = maxPrice + priceRange * 0.05;
    const paddedRange = paddedMax - paddedMin;
    
    // Масштабирование
    const pointSpacing = chartWidth / (points.length - 1);
    const scaleY = chartHeight / paddedRange;
    
    // Рисуем профессиональную сетку
    this.drawProfessionalGrid(padding, width, height, paddedMin, paddedMax);
    
    // Создаем градиент для области под графиком
    const gradient = this.ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    const lastPrice = points[points.length - 1].price;
    const firstPrice = points[0].price;
    const isUpward = lastPrice >= firstPrice;
    
    if (isUpward) {
      gradient.addColorStop(0, this.colors.up + '40');
      gradient.addColorStop(1, this.colors.up + '10');
    } else {
      gradient.addColorStop(0, this.colors.down + '40');
      gradient.addColorStop(1, this.colors.down + '10');
    }
    
    // Рисуем градиентную область под графиком
    this.ctx.beginPath();
    points.forEach((point, i) => {
      const x = padding.left + (i * pointSpacing) - this.animationState.scrollOffset;
      const y = padding.top + chartHeight - (point.price - paddedMin) * scaleY;
      
      // Пропускаем точки которые вышли за пределы слева
      if (x < padding.left - pointSpacing) return;
      // Пропускаем точки которые вышли за пределы справа
      if (x > width - padding.right + pointSpacing) return;
      
      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    });
    
    // Завершаем градиентную область
    const lastVisibleIndex = Math.min(points.length - 1, Math.floor((width - padding.right + this.animationState.scrollOffset - padding.left) / pointSpacing));
    if (lastVisibleIndex >= 0) {
      const lastX = padding.left + (lastVisibleIndex * pointSpacing) - this.animationState.scrollOffset;
      this.ctx.lineTo(lastX, height - padding.bottom);
      this.ctx.lineTo(padding.left - this.animationState.scrollOffset, height - padding.bottom);
      this.ctx.closePath();
      this.ctx.fillStyle = gradient;
      this.ctx.fill();
    }
    
    // Рисуем линию графика
    this.ctx.beginPath();
    this.ctx.strokeStyle = isUpward ? this.colors.up : this.colors.down;
    this.ctx.lineWidth = 2;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    
    points.forEach((point, i) => {
      const x = padding.left + (i * pointSpacing) - this.animationState.scrollOffset;
      const y = padding.top + chartHeight - (point.price - paddedMin) * scaleY;
      
      // Пропускаем точки которые вышли за пределы слева
      if (x < padding.left - pointSpacing) return;
      // Пропускаем точки которые вышли за пределы справа
      if (x > width - padding.right + pointSpacing) return;
      
      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    });
    this.ctx.stroke();
    
    // Рисуем точки на графике
    points.forEach((point, i) => {
      const x = padding.left + (i * pointSpacing) - this.animationState.scrollOffset;
      const y = padding.top + chartHeight - (point.price - paddedMin) * scaleY;
      
      // Пропускаем точки которые вышли за пределы слева
      if (x < padding.left - pointSpacing) return;
      // Пропускаем точки которые вышли за пределы справа
      if (x > width - padding.right + pointSpacing) return;
      
      // Рисуем точку
      this.ctx.beginPath();
      this.ctx.fillStyle = '#ffffff';
      this.ctx.strokeStyle = isUpward ? this.colors.up : this.colors.down;
      this.ctx.lineWidth = 2;
      this.ctx.arc(x, y, 3, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();
    });
    
    // Текущая цена справа (горизонтальная линия)
    if (currentPrice && currentPrice >= paddedMin && currentPrice <= paddedMax) {
      const y = padding.top + chartHeight - (currentPrice - paddedMin) * scaleY;
      const priceColor = currentPrice >= points[0].price ? this.colors.up : this.colors.down;
      
      // Пунктирная линия по всей ширине
      this.ctx.save();
      this.ctx.setLineDash([4, 4]);
      this.ctx.beginPath();
      this.ctx.strokeStyle = priceColor;
      this.ctx.lineWidth = 1;
      this.ctx.moveTo(padding.left, y);
      this.ctx.lineTo(width - padding.right, y);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
      this.ctx.restore();
      
      // Ярлык цены справа с фоном
      const priceText = currentPrice.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      this.ctx.font = 'bold 11px monospace';
      this.ctx.textAlign = 'center';
      
      const textMetrics = this.ctx.measureText(priceText);
      const labelWidth = textMetrics.width + 12;
      const labelHeight = 18;
      const labelX = width - padding.right + (padding.right - labelWidth) / 2;
      const labelY = y - labelHeight / 2;
      
      // Фон ярлыка
      this.ctx.fillStyle = priceColor;
      this.ctx.fillRect(labelX, labelY, labelWidth, labelHeight);
      
      // Текст цены
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillText(priceText, labelX + labelWidth / 2, y + 4);
    }
  }
  
  /**
   * Преобразует данные цен в точки для линейного графика
   * Оптимизирует количество точек для плавного отображения
   */
  convertToPoints(priceHistory) {
    const points = [];
    const targetPoints = 30; // Оптимальное количество точек
    const step = Math.max(1, Math.floor(priceHistory.length / targetPoints));
    
    for (let i = 0; i < priceHistory.length; i += step) {
      const point = priceHistory[i];
      const price = typeof point === 'object' ? point.price : point;
      
      // Валидация данных
      if (price && !isNaN(price)) {
        points.push({
          price: parseFloat(price),
          timestamp: typeof point === 'object' ? point.timestamp : Date.now() - (priceHistory.length - i) * 60000
        });
      }
    }
    
    // Всегда добавляем последнюю точку для актуальности
    if (priceHistory.length > 0) {
      const lastPoint = priceHistory[priceHistory.length - 1];
      const lastPrice = typeof lastPoint === 'object' ? lastPoint.price : lastPoint;
      if (lastPrice && !isNaN(lastPrice) && (points.length === 0 || points[points.length - 1].price !== lastPrice)) {
        points.push({
          price: parseFloat(lastPrice),
          timestamp: typeof lastPoint === 'object' ? lastPoint.timestamp : Date.now()
        });
      }
    }
    
    return points.length > 0 ? points : this.generateMockPoints(30);
  }
  
  /**
   * Генерирует mock точки если нет данных
   */
  generateMockPoints(count) {
    const points = [];
    let price = 50000; // Базовая цена для BTC
    
    for (let i = 0; i < count; i++) {
      const change = (Math.random() - 0.5) * price * 0.02; // ±2% изменение
      price = Math.max(price + change, price * 0.8); // Не даем упасть ниже 80%
      
      points.push({
        price: parseFloat(price.toFixed(2)),
        timestamp: Date.now() - (count - i) * 60000
      });
    }
    
    return points;
  }
  
  /**
   * Обновляет анимацию плавного скроллинга графика
   * При добавлении новой свечи график плавно смещается влево
   */
  updateScrollAnimation(currentDataLength, chartWidth) {
    // Проверяем добавились ли новые данные
    if (currentDataLength > this.animationState.lastDataLength) {
      // Новые данные добавлены - увеличиваем целевое смещение
      const candlesAdded = currentDataLength - this.animationState.lastDataLength;
      const pointWidth = chartWidth / 30; // ~30 точек видимо
      this.animationState.targetScrollOffset += candlesAdded * pointWidth;
      
      this.animationState.lastDataLength = currentDataLength;
    }
    
    // Плавная интерполяция к целевому смещению (easing)
    const diff = this.animationState.targetScrollOffset - this.animationState.scrollOffset;
    this.animationState.scrollOffset += diff * this.animationState.smoothingFactor;
    
    // Когда достигли цели - сбрасываем для следующей анимации
    if (Math.abs(diff) < 0.5) {
      this.animationState.scrollOffset = this.animationState.targetScrollOffset;
      // Сбрасываем смещения чтобы график не уходил бесконечно влево
      this.animationState.scrollOffset = 0;
      this.animationState.targetScrollOffset = 0;
    }
  }
  
  /**
   * Профессиональная сетка как в TradingView
   */
  drawProfessionalGrid(padding, width, height, minPrice, maxPrice) {
    const ctx = this.ctx;
    const gridLines = 6;
    const chartHeight = height - padding.top - padding.bottom;
    
    ctx.save();
    ctx.strokeStyle = this.colors.grid;
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.3;
    
    // Горизонтальные линии сетки
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (chartHeight * i / gridLines);
      const price = maxPrice - (maxPrice - minPrice) * (i / gridLines);
      
      // Сетка
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      
      // Метки цен слева
      ctx.globalAlpha = 1;
      ctx.fillStyle = this.colors.text;
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(
        price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        padding.left - 5,
        y + 3
      );
      ctx.globalAlpha = 0.3;
    }
    
    ctx.restore();
  }
  
  drawNoData(width, height) {
    this.ctx.fillStyle = this.colors.text;
    this.ctx.font = '16px Inter, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Ожидание данных...', width / 2, height / 2);
  }
  
  /**
   * Анимация тапа
   */
  drawTapAnimation(x, y, value) {
    const startTime = Date.now();
    const duration = 800;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      if (progress < 1) {
        const alpha = 1 - progress;
        const offsetY = progress * 50;
        
        this.ctx.save();
        this.ctx.globalAlpha = alpha;
        this.ctx.fillStyle = this.colors.up;
        this.ctx.font = 'bold 20px Inter, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`+${value}`, x, y - offsetY);
        this.ctx.restore();
        
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }
  
  /**
   * Рисует индикатор активной ставки
   */
  drawActiveBetIndicator(bet, currentPrice, width, height) {
    const timeLeft = Math.max(0, bet.duration - (Date.now() - bet.startTime)) / 1000;
    const progress = 1 - (timeLeft * 1000 / bet.duration);
    
    // Прогресс бар
    const barHeight = 4;
    const barY = height - 40;
    
    this.ctx.fillStyle = 'rgba(107, 114, 128, 0.3)';
    this.ctx.fillRect(20, barY, width - 40, barHeight);
    
    this.ctx.fillStyle = bet.direction === 'UP' ? this.colors.up : this.colors.down;
    this.ctx.fillRect(20, barY, (width - 40) * progress, barHeight);
    
    // Информация о ставке
    const priceChange = currentPrice - bet.startPrice;
    const isProfitable = (bet.direction === 'UP' && priceChange > 0) || 
                        (bet.direction === 'DOWN' && priceChange < 0);
    
    this.ctx.font = '12px Inter, sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.fillStyle = this.colors.text;
    this.ctx.fillText(`${bet.asset} ${bet.direction} | ${timeLeft.toFixed(1)}s`, 20, barY - 10);
    
    this.ctx.textAlign = 'right';
    this.ctx.fillStyle = isProfitable ? this.colors.up : this.colors.down;
    this.ctx.fillText(
      `${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)} (${bet.amount} TAPS)`,
      width - 20,
      barY - 10
    );
  }
}
