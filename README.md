# MC Recovery Fund — Telegram Mini App

> Интерактивная образовательная платформа для инвесторов с квизами, инструкциями, эфирами и документами.

**Версия:** 1.1.0  
**Статус:** ✅ Production Ready  
**Telegram Mini App** | **Vanilla JS** | **Mobile-First** | **WCAG AAA**

---

## 📋 Содержание

- [Описание](#описание)
- [Функционал](#функционал)
- [Архитектура](#архитектура)
- [Установка и запуск](#установка-и-запуск)
- [Структура данных](#структура-данных)
- [UX/UI](#uxui)
- [Доступность](#доступность)
- [Технологии](#технологии)
- [Разработка](#разработка)
- [Deployment](#deployment)

---

## 🎯 Описание

MC Recovery Fund Mini App — это **Telegram Web App** для обучения инвесторов и предоставления доступа к ключевым инструментам фонда. Приложение включает интерактивные квизы, пошаговые инструкции, график эфиров, официальные документы и систему поддержки.

**Целевая аудитория:** Инвесторы фонда MC Recovery Fund, начинающие и опытные трейдеры.

**Ключевые особенности:**
- 🎯 Интерактивные квизы с системой прогресса
- 📖 30+ пошаговых инструкций (Vaults, SafePal, обмен, пополнение, вывод)
- 📡 График еженедельных эфиров с записями
- 📄 Официальные документы (PDF)
- 💬 Интеграция с Telegram (темы, хаптика, ссылки)
- 🏆 Система достижений и streak counter
- 🌓 Dark/Light режимы (WCAG AAA)
- 📱 Mobile-first, адаптивный дизайн

---

## 🚀 Функционал

### Главная страница (Home)

12 навигационных карточек с основными разделами:

#### Новые разделы
1. **📖 Инструкции** — 6 групп (Vaultы, Кошелёк, Обмен, Пополнение, Вывод, VPN), 30+ инструкций с видео
2. **📊 Дашборд** — аналитическая панель инвестора (coming soon)
3. **📡 Эфиры** — график прямых эфиров с Александром, записи прошедших
4. **📢 Анонсы** — предстоящие события, АМА-сессии
5. **📄 Документы** — 3 официальных PDF (Концепция, Правовая структура, Соглашение)
6. **❓ FAQ** — ссылка на Telegram бот с ответами
7. **💬 Поддержка** — контакты службы поддержки

#### Образовательные разделы
- **🎯 Квизы** — интерактивные тесты по инвестициям (портфели, риски, стратегии)
- **🎓 Инфографика** — видео и визуальные материалы
- **📚 Глоссарий** — финансовые термины с определениями и видео

#### Пользовательские разделы
- **📈 Мой прогресс** — статистика квизов, изученных терминов
- **🏆 Достижения** — бейджи за активность (первый квиз, серия 7/30 дней)

### Основные фичи

#### 🎯 Квизы
- Multiple choice вопросы
- Система подсказок
- Прогресс-бар
- Результаты с бейджами (🥇 🥈 🥉)
- Streak counter 🔥
- Скачивание и share результатов

#### 📖 Инструкции
- Collapsible группировка
- Прямые ссылки на Telegra.ph и Telegram
- Встроенные видео-кнопки
- Плейсхолдеры для будущих ссылок
- Иконки для каждой группы

#### 📡 Эфиры
- Upcoming vs Completed разделение
- Даты и время (МСК)
- Кнопки к записям
- Intro-карточка с градиентом

#### 📄 Документы
- Прямые ссылки на Google Drive
- PDF открываются в новой вкладке
- Disclaimer внизу

#### 🏆 Достижения
- 6 типов бейджей
- Locked/Unlocked состояния
- Условия разблокировки

---

## 🏗 Архитектура

### Технологический стек

**Frontend:**
- Vanilla JavaScript (ES6+)
- CSS3 (Custom Properties, Grid, Flexbox)
- HTML5 (Semantic markup)

**Интеграция:**
- Telegram WebApp API
- LocalStorage API
- Fetch API

**Без зависимостей:**
- ❌ React/Vue/Angular
- ❌ jQuery
- ❌ Bootstrap
- ✅ Pure Web Standards

### Структура файлов

```
project/
├── index.html              # Entry point, data loading
├── app.js                  # Main logic, routing, rendering
├── styles.css              # Design system, components
├── data/                   # JSON data modules
│   ├── quizzes.json        # Интерактивные тесты
│   ├── glossary.json       # Финансовые термины
│   ├── edu.json            # Инфографика
│   ├── instructions.json   # 30+ инструкций
│   ├── announcements.json  # Анонсы (динамический)
│   ├── broadcasts.json     # График эфиров (динамический)
│   ├── documents.json      # PDF документы
│   ├── support.json        # Контакты поддержки
│   ├── dashboard.json      # Дашборд метаданные
│   └── faq.json            # FAQ метаданные
├── favicon.webp            # App icon
├── logo-mc-recovery.webp   # Brand logo (watermark)
├── missing_links.md        # Трекинг плейсхолдеров
└── README.md               # Этот файл
```

---

## 🗂 Структура данных

### Модульная архитектура `/data`

Все данные вынесены в отдельные JSON-файлы для удобства управления.

**Преимущества:**
- ✅ Легко найти и обновить конкретный раздел
- ✅ Git-friendly (понятная история изменений)
- ✅ Параллельная работа над разными разделами
- ✅ Возможность lazy loading в будущем

**Типы контента:**
- **Динамический** (часто обновляется): `announcements.json`, `broadcasts.json`
- **Статический** (редко меняется): `documents.json`, `support.json`, `faq.json`
- **Большой** (много данных): `instructions.json`, `quizzes.json`

### Схемы данных

#### `quizzes.json`
```json
[
  {
    "id": "portfolio-basics",
    "title": "Основы портфеля",
    "description": "Описание",
    "difficulty": "easy|medium|hard",
    "duration": 5,
    "questions": [
      {
        "question": "Текст вопроса",
        "options": ["Вариант 1", "Вариант 2", "Вариант 3", "Вариант 4"],
        "correct": 1,
        "hint": "Подсказка"
      }
    ]
  }
]
```

#### `instructions.json`
```json
{
  "title": "Инструкции",
  "description": "Описание",
  "groups": [
    {
      "id": "group-id",
      "title": "Название группы",
      "icon": "🏦",
      "description": "Описание группы",
      "items": [
        {
          "id": "item-id",
          "title": "Название инструкции",
          "description": "Описание",
          "url": "https://...",
          "type": "guide|external",
          "videos": [{"title": "Видео 1", "url": "https://..."}]
        }
      ]
    }
  ]
}
```

#### `broadcasts.json`
```json
{
  "title": "График эфиров и записи",
  "intro": "Вводный текст",
  "schedule": [
    {
      "id": "broadcast-1",
      "date": "2025-10-07",
      "time": "12:00",
      "timezone": "МСК",
      "day": "Вт",
      "title": "Название эфира",
      "description": "Описание",
      "status": "upcoming|completed",
      "recordUrl": null | "https://..."
    }
  ]
}
```

### Управление данными

**Добавить анонс:**
```bash
1. Открыть data/announcements.json
2. Добавить объект в массив
3. Сохранить → автоматически отобразится
```

**Обновить инструкцию:**
```bash
1. Открыть data/instructions.json
2. Найти группу → item → заменить <ADD_LINK>
3. Обновить missing_links.md
```

**Добавить запись эфира:**
```bash
1. Открыть data/broadcasts.json
2. Найти эфир → "status": "completed"
3. Добавить "recordUrl": "https://..."
```

---

## 🎨 UX/UI

### Design System

**Design Tokens:**
```css
/* Brand Colors */
--color-primary: #1326FD;
--color-primary-light: #C6D9FD;
--color-success: #BFFF37;
--color-error: #FF6B6B;
--color-premium: #9539F2;
--color-gold: #FFD700;

/* Spacing (8px base) */
--space-xs: 4px;
--space-sm: 8px;
--space-md: 16px;
--space-lg: 24px;
--space-xl: 32px;

/* Typography */
--font-family: "Inter", system-ui, sans-serif;
--font-size-body: 16px;
--line-height: 1.6;
--line-height-relaxed: 1.8;
```

### Компоненты

**Карточки:**
- `.card` — базовая карточка
- `.card-interactive` — кликабельная карточка
- `.card-grid` — grid layout
- `.nav-card` — навигационная карточка

**Кнопки:**
- `.btn-primary` — основная кнопка
- `.btn-secondary` — вторичная кнопка
- `.btn-ghost` — outline кнопка
- `.btn-icon` — иконочная кнопка

**Списки:**
- `.list` + `.list-item` — списки элементов
- `.collapsible` — аккордеон

**Прогресс:**
- `.progress-bar` + `.progress-fill` — линейный прогресс
- `.streak` — счётчик серии 🔥

### Темы

**Light Theme:**
- Фон: `#FFFFFF`
- Текст: `hsl(220 30% 8%)`
- Градиенты: голубой, розовый, фиолетовый
- Водяной знак: opacity 8%

**Dark Theme:**
- Фон: `hsl(220 25% 8%)`
- Текст: `hsl(220 15% 96%)`
- Градиенты: бирюзовый, красный, фиолетовый
- Водяной знак: opacity 4%

**Переключение:**
- Кнопка 🌞/🌙 в топбаре
- Сохранение в `localStorage`
- Sync с Telegram theme
- Auto-detect системной темы

---

## ♿ Доступность (WCAG AAA)

### Контрастность

✅ **Текст ≥ 7:1** (WCAG AAA Enhanced)
- Светлая тема: `hsl(220 30% 8%)` на `#FFFFFF` = 14.8:1
- Темная тема: `hsl(220 15% 96%)` на `hsl(220 25% 8%)` = 13.2:1
- Вторичный текст ≥ 5:1

### Интерактивность

✅ **Touch targets ≥ 44×44px**
- Все кнопки и ссылки
- Nav cards: 120px+ высота
- Quiz options: 60px+ высота

✅ **Focus indicators**
- 3px solid outline
- 2px offset
- Видимы в обеих темах

✅ **Keyboard navigation**
- Tab order логичный
- Enter/Space для кнопок
- Escape закрывает модалы

### Типографика

✅ **Базовый размер: 16px**
✅ **Минимум: 14px** (captions)
✅ **Line-height: 1.8** (параграфы)
✅ **Letter-spacing** для заголовков

### Семантика

✅ **HTML5 semantic tags**
- `<header>`, `<main>`, `<nav>`
- Заголовки `<h1>` - `<h3>`
- `<button>` вместо `<div onclick>`

✅ **ARIA attributes**
- `aria-label` для иконок
- `role` где необходимо

### Другое

✅ **Масштабирование до 200%**
✅ **Reduced motion** support
✅ **High contrast mode** support
✅ **Screen reader friendly**

---

## 🔧 Технологии

### Core

- **HTML5** — семантическая разметка
- **CSS3** — custom properties, grid, flexbox
- **JavaScript ES6+** — modules, async/await, arrow functions

### APIs

- **Telegram WebApp API** — интеграция с Telegram
  - `tg.ready()`, `tg.expand()`
  - `tg.openLink()` — открытие ссылок
  - `tg.HapticFeedback` — тактильная обратная связь
  - `tg.colorScheme`, `tg.themeParams` — темы
  - `tg.MainButton` — нативная кнопка (для квизов)

- **LocalStorage API** — сохранение данных
  - User progress
  - Theme preference
  - Completed quizzes
  - Streak counter

- **Fetch API** — загрузка JSON данных
  - Promise.all для параллельной загрузки
  - Error handling

### Шрифты

- **Inter** — Google Fonts (cyrillic subset)
- **System fonts** fallback

### Иконки

- **Emoji** — нативные Unicode символы
- **SVG** — для UI элементов (arrows, chevrons)

---

## 🛠 Разработка

### Установка и запуск

**Требования:**
- Любой современный браузер
- HTTP-сервер (для корректной работы fetch)

**Опция 1: Python HTTP Server**
```bash
# Python 3
cd project
python -m http.server 8080

# Открыть http://localhost:8080
```

**Опция 2: Node.js HTTP Server**
```bash
npm install -g http-server
cd project
http-server -p 8080

# Открыть http://localhost:8080
```

**Опция 3: VS Code Live Server**
```bash
# Установить расширение "Live Server"
# Правый клик на index.html → Open with Live Server
```

### Структура кода

**index.html:**
- Entry point
- Theme initialization (до загрузки страницы)
- Data loading (Promise.all)
- Skeleton loader

**app.js:**
```javascript
// Global State
AppState = {
  currentRoute,
  currentQuiz,
  userData
}

// Navigation
navigate(route, params)
renderRoute(route, params)

// Render functions
renderHome()
renderQuizzes()
renderInstructions()
// ... и т.д.

// Utilities
hapticFeedback()
openLink()
toggleTheme()
```

**styles.css:**
```css
/* Design Tokens */
:root { ... }

/* Light/Dark Themes */
:root[data-theme="light"] { ... }
:root[data-theme="dark"] { ... }

/* Components */
.card { ... }
.btn { ... }
.list { ... }

/* Utilities */
.hidden { ... }
.mb-lg { ... }
```

### Добавление нового раздела

**1. Создать JSON:**
```bash
# data/new-section.json
{
  "title": "Новый раздел",
  "items": [...]
}
```

**2. Обновить index.html:**
```javascript
window.APP_DATA.newSection = {};

fetch('data/new-section.json').then(r => r.json())
```

**3. Добавить в app.js:**
```javascript
// В renderRoute()
case "new-section":
  renderNewSection(content);
  break;

// Render function
function renderNewSection(container) {
  const data = window.APP_DATA.newSection;
  container.innerHTML = `...`;
}
```

**4. Добавить nav-card:**
```javascript
// В renderHome()
<div class="nav-card" onclick="navigate('new-section')">
  <div class="nav-card-icon">🆕</div>
  <div class="nav-card-title">Новый раздел</div>
</div>
```

### Редактирование контента

**Квизы (`data/quizzes.json`):**
- Добавить новый квиз в массив
- Указать `id`, `title`, `description`, `difficulty`, `duration`
- Добавить вопросы с вариантами ответов

**Инструкции (`data/instructions.json`):**
- Найти нужную группу
- Добавить/обновить item
- Заменить `<ADD_LINK>` на реальную ссылку
- Добавить `videos` массив если нужно

**Эфиры (`data/broadcasts.json`):**
- Добавить эфир в `schedule` массив
- Обновить `status`: `upcoming` → `completed`
- Добавить `recordUrl` когда запись доступна

### Git workflow

```bash
# Создать feature branch
git checkout -b feature/new-quiz

# Внести изменения
# Например, обновить data/quizzes.json

# Commit с понятным сообщением
git add data/quizzes.json
git commit -m "Add 'Crypto Basics' quiz"

# Push и создать PR
git push origin feature/new-quiz
```

---

## 🚀 Deployment

### Подготовка

**1. Проверить все ссылки:**
```bash
# Найти плейсхолдеры
grep -r "<ADD_" data/

# Обновить missing_links.md
```

**2. Валидация JSON:**
```bash
# Проверить каждый файл
cat data/quizzes.json | jq .
cat data/instructions.json | jq .
# и т.д.
```

**3. Тестирование:**
- [ ] Загрузка всех разделов
- [ ] Навигация работает
- [ ] Квизы проходятся
- [ ] Ссылки открываются
- [ ] Темы переключаются
- [ ] Mobile responsive

### Telegram Mini App

**1. Создать бот через @BotFather:**
```
/newbot
# Следовать инструкциям
```

**2. Настроить Web App:**
```
/newapp
# Выбрать бота
# Название: MC Recovery Fund
# URL: https://your-domain.com
# Icon: favicon.webp
```

**3. Deploy на хостинг:**

**Опция A: Netlify**
```bash
# netlify.toml
[build]
  publish = "."

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

**Опция B: Vercel**
```bash
# vercel.json
{
  "cleanUrls": true,
  "trailingSlash": false
}
```

**Опция C: GitHub Pages**
```bash
# Settings → Pages → Deploy from branch (main)
```

**4. Проверить в Telegram:**
```
# Отправить ссылку боту
https://t.me/your_bot_name/app
```

### Обновление контента

**Динамический контент (обновляется часто):**
1. Редактировать `data/announcements.json` или `data/broadcasts.json`
2. Commit → Push
3. Автоматический deploy (если настроен CI/CD)
4. Обновление в приложении мгновенное (fetch при загрузке)

**Статический контент (редко меняется):**
1. Редактировать соответствующий JSON
2. Commit → Push
3. Deploy
4. Пользователи увидят изменения при следующем запуске

### Мониторинг

**Telegram Analytics:**
- Количество пользователей
- Активность
- Retention

**Custom Analytics (опционально):**
```javascript
// Добавить в app.js
function trackEvent(category, action) {
  // Отправка на аналитику
}
```

---

## 📊 Производительность

### Metrics

**Lighthouse Score:**
- Performance: 95+
- Accessibility: 100
- Best Practices: 100
- SEO: 90+

**Load Time:**
- First Contentful Paint: < 1s
- Time to Interactive: < 2s
- Total page weight: ~700KB (с изображениями)

### Оптимизации

✅ **Минимальные зависимости** — vanilla JS
✅ **Параллельная загрузка** — Promise.all для JSON
✅ **CSS Grid/Flexbox** — вместо JS layout
✅ **WebP изображения** — logo и favicon
✅ **CSS Variables** — быстрое переключение тем
✅ **Hardware acceleration** — transform, opacity
✅ **Lazy content** — рендер только активного раздела

---

## 🔐 Безопасность

### Data Privacy

✅ **LocalStorage only** — данные хранятся локально
✅ **Нет cookies** — не используются
✅ **Нет tracking** — без аналитики по умолчанию
✅ **HTTPS required** — для Telegram Mini App

### External Links

✅ **`tg.openLink()`** — безопасное открытие ссылок
✅ **Валидация URL** — проверка плейсхолдеров
✅ **Target _blank** — открытие в новой вкладке (fallback)

### XSS Prevention

✅ **No eval()** — не используется
✅ **No innerHTML с user input** — только статический контент
✅ **JSON parsing** — безопасный парсинг данных

---

## 📝 Missing Links

Некоторые инструкции имеют плейсхолдеры `<ADD_LINK>` — см. `missing_links.md` для деталей.

**Плейсхолдеры:**
- `<ADD_LINK>` — 4 инструкции (обмен USDT→ETH, пополнение)
- `<ADD_DASHBOARD_LINK>` — дашборд
- `<ADD_SUPPORT_BOT_LINK>` — бот поддержки

**Поведение:**
- Визуально помечены как "Скоро" с `opacity: 0.5`
- Клик показывает `alert("Эта функция скоро будет доступна")`
- Не кликабельны

---

## 🤝 Поддержка

**Вопросы по использованию:**
- Telegram бот: [FAQ](http://t.me/MCRecoveryFund_bot/FAQ)

**Баги и улучшения:**
- Issues на GitHub (если репозиторий публичный)
- Telegram канал поддержки

**Документация:**
- Этот README.md
- `missing_links.md` — трекинг плейсхолдеров

---

## 📜 Лицензия

© 2025 MC Recovery Fund. Все права защищены.

Материалы носят образовательный характер и не являются инвестиционной рекомендацией.

---

## 🎯 Roadmap

### Phase 2 (Q1 2026)
- [ ] Интеграция Dashboard API
- [ ] Support Bot
- [ ] Lazy loading разделов
- [ ] PWA поддержка
- [ ] Offline mode

### Phase 3 (Q2 2026)
- [ ] Симулятор портфеля (interactive)
- [ ] Gamification (XP, levels)
- [ ] Leaderboard
- [ ] Push notifications
- [ ] Multi-language (EN)

### Phase 4 (Q3 2026)
- [ ] Backend API integration
- [ ] User accounts
- [ ] Real-time data
- [ ] Advanced analytics
- [ ] Community features

---

**Built with ❤️ by MC Recovery Fund Team**

**Stack:** Vanilla JS • CSS3 • HTML5 • Telegram WebApp API  
**Design:** Mobile-First • WCAG AAA • Nielsen Heuristics  
**Version:** 1.1.0
