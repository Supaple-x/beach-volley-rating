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

// Рассчитать очки по итальянской системе
function getItalianPoints(myScore, oppScore) {
  if (myScore === oppScore) return 0;
  const diff = Math.abs(myScore - oppScore);
  const isBalanced = diff === 2;
  if (myScore > oppScore) {
    return isBalanced ? 2 : 3;
  } else {
    return isBalanced ? 1 : 0;
  }
}

// Получить сводный рейтинг сезона
export function getSeasonRating(seasonId) {
  const season = db.prepare('SELECT * FROM seasons WHERE id = ?').get(seasonId);
  if (!season) return null;

  // Получаем все турниры сезона
  const tournaments = db.prepare(`
    SELECT * FROM tournaments WHERE season_id = ? ORDER BY stage_number, date
  `).all(seasonId);

  // Структура этапов (10 этапов + финал)
  const stages = [];
  for (let i = 1; i <= 10; i++) {
    const tournament = tournaments.find(t => t.stage_number === i);
    stages.push({
      stageNumber: i,
      name: `${i} этап`,
      tournamentId: tournament?.id || null,
      date: tournament?.date || null
    });
  }
  // Добавляем финал
  const finalTournament = tournaments.find(t => t.stage_number === null);
  stages.push({
    stageNumber: null,
    name: 'Финал',
    tournamentId: finalTournament?.id || null,
    date: finalTournament?.date || null
  });

  // Получаем все матчи сезона с детализацией
  const allMatches = db.prepare(`
    SELECT
      m.*,
      t.id as tournament_id,
      t.stage_number,
      g.stage as group_stage,
      p1.id as p1_id, p1.name as p1_name, p1.gender as p1_gender,
      p2.id as p2_id, p2.name as p2_name, p2.gender as p2_gender,
      p3.id as p3_id, p3.name as p3_name, p3.gender as p3_gender,
      p4.id as p4_id, p4.name as p4_name, p4.gender as p4_gender
    FROM matches m
    JOIN groups g ON m.group_id = g.id
    JOIN leagues l ON g.league_id = l.id
    JOIN tournaments t ON l.tournament_id = t.id
    JOIN players p1 ON m.team1_player1_id = p1.id
    JOIN players p2 ON m.team1_player2_id = p2.id
    JOIN players p3 ON m.team2_player1_id = p3.id
    JOIN players p4 ON m.team2_player2_id = p4.id
    WHERE t.season_id = ?
    ORDER BY t.stage_number, m.match_number
  `).all(seasonId);

  // Собираем статистику по игрокам
  const playersMap = new Map();

  for (const match of allMatches) {
    const stageKey = match.stage_number || 'final';
    const team1Won = match.score1 > match.score2;

    // Обрабатываем team1
    [
      { id: match.p1_id, name: match.p1_name, gender: match.p1_gender },
      { id: match.p2_id, name: match.p2_name, gender: match.p2_gender }
    ].forEach(player => {
      if (!playersMap.has(player.id)) {
        playersMap.set(player.id, {
          id: player.id,
          name: player.name,
          gender: player.gender,
          stages: {},
          total: 0
        });
      }
      const p = playersMap.get(player.id);
      if (!p.stages[stageKey]) {
        p.stages[stageKey] = { points: 0, matches: [] };
      }
      const pts = getItalianPoints(match.score1, match.score2);
      p.stages[stageKey].points += pts;
      p.stages[stageKey].matches.push({
        partner: player.id === match.p1_id ? match.p2_name : match.p1_name,
        vs: `${match.p3_name} + ${match.p4_name}`,
        score: `${match.score1}:${match.score2}`,
        won: team1Won,
        diff: Math.abs(match.score1 - match.score2),
        points: pts,
        stage: match.group_stage
      });
      p.total += pts;
    });

    // Обрабатываем team2
    [
      { id: match.p3_id, name: match.p3_name, gender: match.p3_gender },
      { id: match.p4_id, name: match.p4_name, gender: match.p4_gender }
    ].forEach(player => {
      if (!playersMap.has(player.id)) {
        playersMap.set(player.id, {
          id: player.id,
          name: player.name,
          gender: player.gender,
          stages: {},
          total: 0
        });
      }
      const p = playersMap.get(player.id);
      if (!p.stages[stageKey]) {
        p.stages[stageKey] = { points: 0, matches: [] };
      }
      const pts = getItalianPoints(match.score2, match.score1);
      p.stages[stageKey].points += pts;
      p.stages[stageKey].matches.push({
        partner: player.id === match.p3_id ? match.p4_name : match.p3_name,
        vs: `${match.p1_name} + ${match.p2_name}`,
        score: `${match.score2}:${match.score1}`,
        won: !team1Won,
        diff: Math.abs(match.score1 - match.score2),
        points: pts,
        stage: match.group_stage
      });
      p.total += pts;
    });
  }

  // Конвертируем в массив и сортируем по total
  const players = Array.from(playersMap.values())
    .sort((a, b) => b.total - a.total);

  return {
    season,
    stages,
    players
  };
}
