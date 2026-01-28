# NAGORNAYA Design System

## Референс
Файл `design-reference.html` содержит полный HTML-макет из Stitch. Используй его как визуальный референс.

## Технологии
- **CSS Framework**: Tailwind CSS (через CDN или установить как зависимость)
- **Шрифт**: Lexend (Google Fonts)
- **Иконки**: Material Symbols Outlined (Google Fonts)

## Подключение ресурсов

```html
<!-- Tailwind CSS -->
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>

<!-- Шрифты -->
<link href="https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
```

## Цветовая палитра

```javascript
// Tailwind config
tailwind.config = {
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                "primary": "#f27f0d",           // Оранжевый (акцент)
                "background-light": "#f8f7f5",  // Светлый фон
                "background-dark": "#0f172a",   // Тёмный фон (основной)
                "accent-blue": "#38bdf8",       // Голубой (рейтинг)
            },
            fontFamily: {
                "display": ["Lexend", "sans-serif"]
            },
            borderRadius: {
                "DEFAULT": "0.25rem",
                "lg": "0.5rem", 
                "xl": "0.75rem",
                "full": "9999px"
            },
        },
    },
}
```

## CSS переменные (альтернатива без Tailwind)

```css
:root {
    /* Цвета */
    --color-primary: #f27f0d;
    --color-primary-hover: rgba(242, 127, 13, 0.9);
    --color-primary-glow: rgba(242, 127, 13, 0.25);
    
    --color-background: #0f172a;
    --color-surface: rgba(30, 41, 59, 0.7);
    --color-surface-hover: rgba(30, 41, 59, 0.9);
    
    --color-accent-blue: #38bdf8;
    --color-success: #22c55e;
    --color-danger: #ef4444;
    
    --color-text-primary: #f1f5f9;
    --color-text-secondary: #94a3b8;
    --color-text-muted: #64748b;
    
    --color-border: rgba(255, 255, 255, 0.1);
    --color-border-hover: rgba(255, 255, 255, 0.2);
    
    /* Медали */
    --color-medal-gold: #fbbf24;
    --color-medal-silver: #94a3b8;
    --color-medal-bronze: #b45309;
    
    /* Шрифты */
    --font-family: 'Lexend', sans-serif;
    
    /* Радиусы */
    --radius-sm: 0.25rem;
    --radius-md: 0.5rem;
    --radius-lg: 0.75rem;
    --radius-xl: 1rem;
    --radius-full: 9999px;
    
    /* Тени */
    --shadow-glow: 0 0 20px rgba(242, 127, 13, 0.2);
    --shadow-card: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}
```

## Ключевые компоненты

### Glass Panel (карточки с размытием)
```css
.glass-panel {
    background: rgba(30, 41, 59, 0.7);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 0.75rem;
}
```

### Кнопка Primary
```css
.btn-primary {
    background: var(--color-primary);
    color: var(--color-background);
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    font-weight: 700;
    font-size: 0.875rem;
    box-shadow: 0 10px 15px -3px rgba(242, 127, 13, 0.2);
    transition: all 0.2s;
}
.btn-primary:hover {
    background: var(--color-primary-hover);
    transform: scale(1.02);
}
```

### Медали для топ-3
```css
.medal-gold { color: #fbbf24; }
.medal-silver { color: #94a3b8; }
.medal-bronze { color: #b45309; }
```

### Тренд индикаторы
```css
.trend-up {
    color: #22c55e;
    display: flex;
    align-items: center;
    gap: 0.25rem;
}
.trend-down {
    color: #ef4444;
    display: flex;
    align-items: center;
    gap: 0.25rem;
}
.trend-neutral {
    color: #94a3b8;
}
```

### Прогресс-бар (винрейт)
```css
.progress-bar {
    width: 6rem;
    height: 0.375rem;
    background: #1e293b;
    border-radius: 9999px;
    overflow: hidden;
}
.progress-bar-fill {
    height: 100%;
    background: #22c55e;
    border-radius: 9999px;
}
```

## Иконки Material Symbols

Использование:
```html
<span class="material-symbols-outlined">trending_up</span>
<span class="material-symbols-outlined">trending_down</span>
<span class="material-symbols-outlined">horizontal_rule</span>
<span class="material-symbols-outlined">search</span>
<span class="material-symbols-outlined">download</span>
<span class="material-symbols-outlined">filter_list</span>
<span class="material-symbols-outlined">chevron_left</span>
<span class="material-symbols-outlined">chevron_right</span>
<span class="material-symbols-outlined">more_vert</span>
<span class="material-symbols-outlined">emoji_events</span>
```

Настройка веса:
```css
.material-symbols-outlined {
    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}
```

## Логотип NAGORNAYA

SVG логотип (волейбольный мяч):
```html
<svg class="size-6" fill="currentColor" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
    <path d="M8.57829 8.57829C5.52816 11.6284 3.451 15.5145 2.60947 19.7452C1.76794 23.9758 2.19984 28.361 3.85056 32.3462C5.50128 36.3314 8.29667 39.7376 11.8832 42.134C15.4698 44.5305 19.6865 45.8096 24 45.8096C28.3135 45.8096 32.5302 44.5305 36.1168 42.134C39.7033 39.7375 42.4987 36.3314 44.1494 32.3462C45.8002 28.361 46.2321 23.9758 45.3905 19.7452C44.549 15.5145 42.4718 11.6284 39.4217 8.57829L24 24L8.57829 8.57829Z"/>
</svg>
```

## Структура страницы

1. **Header** — sticky, glass-panel, лого + навигация + профиль
2. **Hero секция** — заголовок + кнопка экспорта
3. **Stats карточки** — 3 колонки с ключевыми метриками
4. **Фильтры** — поиск + выпадающие списки
5. **Таблица рейтинга** — glass-panel, hover эффекты
6. **Пагинация** — внутри таблицы внизу
7. **CTA секция** — градиентный баннер
8. **Footer** — логотип, ссылки, копирайт

## Адаптивность

- Mobile: 1 колонка, компактная таблица
- Tablet (md): 2 колонки для stats
- Desktop (lg): полная версия, max-width 1280px
