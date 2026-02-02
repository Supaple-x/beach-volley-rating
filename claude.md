# Инструкции для проекта Beach Volleyball Elo

## Context7 Integration

Всегда используй Context7 MCP перед планированием или написанием кода, связанного с внешними библиотеками и фреймворками:

1. Сначала вызови `resolve-library-id` чтобы получить правильный идентификатор библиотеки
2. Затем вызови `get-library-docs` с полученным ID для загрузки актуальной документации
3. Основывай все решения и код на полученной документации, а не на данных из обучения

Это применимо к:
- Настройке и конфигурации Vite
- Работе с Canvas API или SVG для графиков
- Любым npm-пакетам, которые будут добавлены в проект
- Современным возможностям JavaScript (ES6+)

### Примеры использования

При работе с Vite:
```
resolve-library-id: "vite"
get-library-docs: topic="configuration" или "dev server" или нужная тема
```

При добавлении библиотеки для графиков:
```
resolve-library-id: "chart.js" (или другая библиотека)
get-library-docs: topic="line chart" или нужная тема
```

## Основная задача

Прочитай файл `beach-volleyball-elo-prompt.md` в корне проекта и выполни задачу по нему.

## Стиль кода

- ES6+ синтаксис (import/export, async/await, стрелочные функции)
- Модульная архитектура
- Комментарии на русском языке
- Понятные имена переменных и функций

## Порядок работы

1. Перед использованием любой библиотеки — запроси документацию через Context7
2. Работай поэтапно, как указано в промте
3. После каждого этапа проверяй работоспособность

## Деплой на сервер

- **Хост:** 176.108.251.49 (nagornaya.duckdns.org)
- **Пользователь:** artemfcsm
- **SSH ключ:** ~/.ssh/temik_cloudru_key

### Директории на сервере

- **Фронтенд:** /var/www/beach-volley
- **Бэкенд (API):** /var/www/beach-volley-api
- **База данных:** /var/www/beach-volley-api/db/volleyball.db

### Команды деплоя фронтенда

```bash
# Сборка
npm run build

# Деплой
scp -i ~/.ssh/temik_cloudru_key -r dist/* artemfcsm@176.108.251.49:/var/www/beach-volley/
```

### Команды деплоя бэкенда

```bash
# Копирование файлов бэкенда
scp -i ~/.ssh/temik_cloudru_key -r server/* artemfcsm@176.108.251.49:/var/www/beach-volley-api/

# Установка зависимостей (на сервере)
ssh -i ~/.ssh/temik_cloudru_key artemfcsm@176.108.251.49 "cd /var/www/beach-volley-api && npm install"

# Перезапуск API
ssh -i ~/.ssh/temik_cloudru_key artemfcsm@176.108.251.49 "pm2 restart beach-volley-api"
```

### Импорт турнира в БД

```bash
# На сервере
cd /var/www/beach-volley-api
node scripts/import-json.js <путь-к-json> <название-сезона> <год> <номер-этапа> <формат> <жеребьевка>

# Пример:
node scripts/import-json.js data/raw/tournament.json "VIII NAGORNAYA GRAND PRIX" 2026 1 mixed random
```

### API Endpoints

- `GET /api/health` - проверка работоспособности
- `GET /api/seasons` - список сезонов
- `GET /api/seasons/:id/tournaments` - турниры сезона
- `GET /api/tournaments/:id` - данные турнира
- `GET /api/players` - список игроков
- `GET /api/players/:id` - статистика игрока