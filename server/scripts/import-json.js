import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Database from 'better-sqlite3';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, '..', 'db', 'volleyball.db');
const schemaPath = join(__dirname, '..', 'db', 'schema.sql');

// Инициализация БД
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Создание таблиц
const schema = readFileSync(schemaPath, 'utf-8');
db.exec(schema);

// Определение пола по имени
const FEMALE_NAMES = new Set([
  'Мария', 'Анна', 'Ольга', 'Светлана', 'Юлия', 'Наталья', 'Екатерина',
  'Анастасия', 'Елена', 'Татьяна', 'Ирина', 'Дарья', 'Ксения', 'Евгения',
  'Василиса', 'Инна', 'Жанна', 'Нина'
]);

const MALE_EXCEPTIONS = ['Никита', 'Илья', 'Кирилл'];

function getGender(fullName) {
  const parts = fullName.split(' ');
  const firstName = parts.length > 1 ? parts[1] : parts[0];

  if (FEMALE_NAMES.has(firstName)) return 'female';
  if (MALE_EXCEPTIONS.includes(firstName)) return 'male';

  const lastChar = firstName.slice(-1).toLowerCase();
  const lastTwoChars = firstName.slice(-2).toLowerCase();
  if (lastTwoChars === 'ья') return 'male';
  if (lastChar === 'а' || lastChar === 'я') return 'female';

  return 'male';
}

// Получить или создать игрока
const playerCache = new Map();
const insertPlayer = db.prepare('INSERT OR IGNORE INTO players (name, gender) VALUES (?, ?)');
const getPlayer = db.prepare('SELECT id FROM players WHERE name = ?');

function getOrCreatePlayer(name) {
  if (playerCache.has(name)) return playerCache.get(name);

  insertPlayer.run(name, getGender(name));
  const player = getPlayer.get(name);
  playerCache.set(name, player.id);
  return player.id;
}

// Основная функция импорта
function importTournament(jsonPath, seasonName, seasonYear, stageNumber, format, pairing) {
  const data = JSON.parse(readFileSync(jsonPath, 'utf-8'));

  console.log(`📥 Импорт: ${data.tournament} (${data.date})`);

  // Транзакция для атомарности
  const importAll = db.transaction(() => {
    // Создать или найти сезон
    let season = db.prepare('SELECT id FROM seasons WHERE name = ? AND year = ?').get(seasonName, seasonYear);
    if (!season) {
      const result = db.prepare('INSERT INTO seasons (name, year) VALUES (?, ?)').run(seasonName, seasonYear);
      season = { id: result.lastInsertRowid };
      console.log(`  ✅ Создан сезон: ${seasonName} ${seasonYear}`);
    }

    // Создать турнир
    const tournamentName = stageNumber ? `${stageNumber} этап` : 'Финал';
    const tournamentResult = db.prepare(`
      INSERT INTO tournaments (season_id, stage_number, name, date, format, pairing)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(season.id, stageNumber, tournamentName, data.date, format, pairing);
    const tournamentId = tournamentResult.lastInsertRowid;
    console.log(`  ✅ Создан турнир: ${tournamentName}`);

    // Импорт лиг
    for (let i = 0; i < data.leagues.length; i++) {
      const leagueData = data.leagues[i];

      const leagueResult = db.prepare(`
        INSERT INTO leagues (tournament_id, name, sort_order)
        VALUES (?, ?, ?)
      `).run(tournamentId, leagueData.name, i);
      const leagueId = leagueResult.lastInsertRowid;
      console.log(`    📋 Лига: ${leagueData.name}`);

      // Импорт групп
      for (const groupData of leagueData.groups) {
        const groupResult = db.prepare(`
          INSERT INTO groups (league_id, name, stage)
          VALUES (?, ?, ?)
        `).run(leagueId, groupData.name, groupData.stage);
        const groupId = groupResult.lastInsertRowid;

        // Импорт матчей группы
        for (const match of groupData.matches) {
          const p1 = getOrCreatePlayer(match.team1[0]);
          const p2 = getOrCreatePlayer(match.team1[1]);
          const p3 = getOrCreatePlayer(match.team2[0]);
          const p4 = getOrCreatePlayer(match.team2[1]);
          const ref = match.referee ? getOrCreatePlayer(match.referee) : null;

          db.prepare(`
            INSERT INTO matches (group_id, match_number, court, round, team1_player1_id, team1_player2_id, score1, score2, team2_player1_id, team2_player2_id, referee_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(groupId, match.id, match.court || null, null, p1, p2, match.score[0], match.score[1], p3, p4, ref);
        }
        console.log(`      📦 Группа ${groupData.name}: ${groupData.matches.length} матчей`);
      }

      // Импорт плейофф
      if (leagueData.playoff) {
        const playoffResult = db.prepare(`
          INSERT INTO groups (league_id, name, stage)
          VALUES (?, ?, ?)
        `).run(leagueId, 'Плейофф', 'playoff');
        const playoffId = playoffResult.lastInsertRowid;

        for (const match of leagueData.playoff.matches) {
          const p1 = getOrCreatePlayer(match.team1[0]);
          const p2 = getOrCreatePlayer(match.team1[1]);
          const p3 = getOrCreatePlayer(match.team2[0]);
          const p4 = getOrCreatePlayer(match.team2[1]);

          db.prepare(`
            INSERT INTO matches (group_id, match_number, court, round, team1_player1_id, team1_player2_id, score1, score2, team2_player1_id, team2_player2_id, referee_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(playoffId, match.id, null, match.round, p1, p2, match.score[0], match.score[1], p3, p4, null);
        }
        console.log(`      🏆 Плейофф: ${leagueData.playoff.matches.length} матчей`);
      }
    }
  });

  importAll();
  console.log(`✅ Импорт завершён!\n`);
}

// Запуск импорта
const args = process.argv.slice(2);

if (args.length === 0) {
  // Импорт по умолчанию - текущий турнир
  const jsonPath = join(__dirname, '..', '..', 'data', 'raw', 'nagornaya_2025-01-25.json');
  importTournament(
    jsonPath,
    'VII NAGORNAYA GRAND PRIX', // Это был 7-й сезон
    2025,
    1, // 1 этап (на самом деле это, похоже, финал 7-го сезона)
    'mixed', // Микст
    'random' // Рандомный
  );
} else {
  // Ручной импорт с параметрами
  const [jsonPath, seasonName, seasonYear, stageNumber, format, pairing] = args;
  importTournament(jsonPath, seasonName, parseInt(seasonYear), stageNumber ? parseInt(stageNumber) : null, format, pairing);
}

// Вывод статистики
const stats = {
  seasons: db.prepare('SELECT COUNT(*) as count FROM seasons').get().count,
  tournaments: db.prepare('SELECT COUNT(*) as count FROM tournaments').get().count,
  leagues: db.prepare('SELECT COUNT(*) as count FROM leagues').get().count,
  groups: db.prepare('SELECT COUNT(*) as count FROM groups').get().count,
  players: db.prepare('SELECT COUNT(*) as count FROM players').get().count,
  matches: db.prepare('SELECT COUNT(*) as count FROM matches').get().count,
};

console.log('📊 Статистика БД:');
console.log(`  Сезонов: ${stats.seasons}`);
console.log(`  Турниров: ${stats.tournaments}`);
console.log(`  Лиг: ${stats.leagues}`);
console.log(`  Групп: ${stats.groups}`);
console.log(`  Игроков: ${stats.players}`);
console.log(`  Матчей: ${stats.matches}`);

db.close();
