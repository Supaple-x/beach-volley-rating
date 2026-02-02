import express from 'express';
import cors from 'cors';
import db, {
  getSeasons,
  getTournamentsBySeason,
  getTournamentData,
  getAllPlayers,
  getPlayerStats
} from './db/index.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// === API Routes ===

// Получить все сезоны
app.get('/api/seasons', (req, res) => {
  try {
    const seasons = getSeasons();
    res.json(seasons);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка получения сезонов' });
  }
});

// Получить турниры сезона
app.get('/api/seasons/:id/tournaments', (req, res) => {
  try {
    const tournaments = getTournamentsBySeason(req.params.id);
    res.json(tournaments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка получения турниров' });
  }
});

// Получить данные турнира
app.get('/api/tournaments/:id', (req, res) => {
  try {
    const data = getTournamentData(req.params.id);
    if (!data) {
      return res.status(404).json({ error: 'Турнир не найден' });
    }
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка получения данных турнира' });
  }
});

// Получить всех игроков
app.get('/api/players', (req, res) => {
  try {
    const players = getAllPlayers();
    res.json(players);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка получения игроков' });
  }
});

// Получить статистику игрока
app.get('/api/players/:id', (req, res) => {
  try {
    const stats = getPlayerStats(req.params.id);
    if (!stats) {
      return res.status(404).json({ error: 'Игрок не найден' });
    }
    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка получения статистики игрока' });
  }
});

// Healthcheck
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🏐 Beach Volley API запущен на порту ${PORT}`);
});
