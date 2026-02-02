import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, 'volleyball.db');

// Инициализация БД
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Создание таблиц при первом запуске
const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
db.exec(schema);

export default db;

// Вспомогательные функции

// Получить или создать игрока
export function getOrCreatePlayer(name, gender = null) {
  const existing = db.prepare('SELECT id FROM players WHERE name = ?').get(name);
  if (existing) return existing.id;

  const result = db.prepare('INSERT INTO players (name, gender) VALUES (?, ?)').run(name, gender);
  return result.lastInsertRowid;
}

// Получить все сезоны
export function getSeasons() {
  return db.prepare(`
    SELECT s.*, COUNT(t.id) as tournament_count
    FROM seasons s
    LEFT JOIN tournaments t ON t.season_id = s.id
    GROUP BY s.id
    ORDER BY s.year DESC
  `).all();
}

// Получить турниры сезона
export function getTournamentsBySeason(seasonId) {
  return db.prepare(`
    SELECT * FROM tournaments
    WHERE season_id = ?
    ORDER BY date
  `).all(seasonId);
}

// Получить полные данные турнира (в формате, совместимом с фронтендом)
export function getTournamentData(tournamentId) {
  const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(tournamentId);
  if (!tournament) return null;

  // Получаем сезон для названия турнира
  const season = db.prepare('SELECT * FROM seasons WHERE id = ?').get(tournament.season_id);

  const leagues = db.prepare('SELECT * FROM leagues WHERE tournament_id = ? ORDER BY sort_order').all(tournamentId);

  for (const league of leagues) {
    league.groups = db.prepare('SELECT * FROM groups WHERE league_id = ?').all(league.id);

    for (const group of league.groups) {
      const rawMatches = db.prepare(`
        SELECT
          m.*,
          p1.name as team1_player1_name,
          p2.name as team1_player2_name,
          p3.name as team2_player1_name,
          p4.name as team2_player2_name,
          ref.name as referee_name
        FROM matches m
        JOIN players p1 ON m.team1_player1_id = p1.id
        JOIN players p2 ON m.team1_player2_id = p2.id
        JOIN players p3 ON m.team2_player1_id = p3.id
        JOIN players p4 ON m.team2_player2_id = p4.id
        LEFT JOIN players ref ON m.referee_id = ref.id
        WHERE m.group_id = ?
        ORDER BY m.match_number
      `).all(group.id);

      // Преобразуем в формат, совместимый с фронтендом
      group.matches = rawMatches.map(m => ({
        id: m.match_number,
        court: m.court,
        round: m.round,
        team1: [m.team1_player1_name, m.team1_player2_name],
        team2: [m.team2_player1_name, m.team2_player2_name],
        score: [m.score1, m.score2],
        referee: m.referee_name
      }));
    }

    // Плейофф отдельно
    const playoffGroup = league.groups.find(g => g.stage === 'playoff');
    if (playoffGroup) {
      league.playoff = {
        stage: 'playoff',
        matches: playoffGroup.matches
      };
      league.groups = league.groups.filter(g => g.stage !== 'playoff');
    }
  }

  // Возвращаем в формате, совместимом с фронтендом
  return {
    tournament: season ? `${season.name}` : tournament.name,
    date: tournament.date,
    format: tournament.format,
    pairing: tournament.pairing,
    leagues
  };
}

// Получить всех игроков
export function getAllPlayers() {
  return db.prepare('SELECT * FROM players ORDER BY name').all();
}

// Получить статистику игрока
export function getPlayerStats(playerId) {
  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(playerId);
  if (!player) return null;

  const matches = db.prepare(`
    SELECT
      m.*,
      t.name as tournament_name,
      t.date as tournament_date,
      l.name as league_name
    FROM matches m
    JOIN groups g ON m.group_id = g.id
    JOIN leagues l ON g.league_id = l.id
    JOIN tournaments t ON l.tournament_id = t.id
    WHERE m.team1_player1_id = ? OR m.team1_player2_id = ?
       OR m.team2_player1_id = ? OR m.team2_player2_id = ?
    ORDER BY t.date DESC, m.match_number
  `).all(playerId, playerId, playerId, playerId);

  return { ...player, matches };
}
