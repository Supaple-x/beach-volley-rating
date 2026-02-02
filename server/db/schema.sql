-- Схема базы данных Beach Volleyball Elo Rating

-- Сезоны (например: VIII NAGORNAYA GRAND PRIX 2026)
CREATE TABLE IF NOT EXISTS seasons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  year INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Турниры (этапы сезона)
CREATE TABLE IF NOT EXISTS tournaments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  season_id INTEGER NOT NULL,
  stage_number INTEGER, -- 1-10, NULL для финала
  name TEXT NOT NULL, -- "1 этап", "Финал" и т.д.
  date DATE NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('mixed', 'same_sex')), -- Микст или ММ|ЖЖ
  pairing TEXT NOT NULL CHECK (pairing IN ('random', 'fixed')), -- Рандомный или Фиксированный
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (season_id) REFERENCES seasons(id)
);

-- Лиги (Высшая, Первая и т.д.)
CREATE TABLE IF NOT EXISTS leagues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tournament_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id)
);

-- Группы (A, B и т.д.)
CREATE TABLE IF NOT EXISTS groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  league_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  stage TEXT NOT NULL CHECK (stage IN ('qualification', 'playoff')),
  FOREIGN KEY (league_id) REFERENCES leagues(id)
);

-- Игроки
CREATE TABLE IF NOT EXISTS players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  gender TEXT CHECK (gender IN ('male', 'female')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Матчи
CREATE TABLE IF NOT EXISTS matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL,
  match_number INTEGER, -- порядковый номер в группе
  court INTEGER,
  round TEXT, -- NULL для квалификации, '1/8', '1/4', 'semifinal', 'final', '3rd_place' для плейофф
  team1_player1_id INTEGER NOT NULL,
  team1_player2_id INTEGER NOT NULL,
  score1 INTEGER NOT NULL,
  score2 INTEGER NOT NULL,
  team2_player1_id INTEGER NOT NULL,
  team2_player2_id INTEGER NOT NULL,
  referee_id INTEGER,
  FOREIGN KEY (group_id) REFERENCES groups(id),
  FOREIGN KEY (team1_player1_id) REFERENCES players(id),
  FOREIGN KEY (team1_player2_id) REFERENCES players(id),
  FOREIGN KEY (team2_player1_id) REFERENCES players(id),
  FOREIGN KEY (team2_player2_id) REFERENCES players(id),
  FOREIGN KEY (referee_id) REFERENCES players(id)
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_tournaments_season ON tournaments(season_id);
CREATE INDEX IF NOT EXISTS idx_leagues_tournament ON leagues(tournament_id);
CREATE INDEX IF NOT EXISTS idx_groups_league ON groups(league_id);
CREATE INDEX IF NOT EXISTS idx_matches_group ON matches(group_id);
CREATE INDEX IF NOT EXISTS idx_players_name ON players(name);
