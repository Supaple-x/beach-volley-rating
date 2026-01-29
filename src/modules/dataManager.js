/**
 * Data Manager - handles loading, processing and storing tournament data
 */

import { processAllMatches } from './elo.js';

// Name normalization map (abbreviations to full names)
const NAME_NORMALIZATIONS = {
  'Преображенская Ек.': 'Преображенская Екатерина',
  'Подковырина Вас.': 'Подковырина Василиса',
  'Захарченко Вл.': 'Захарченко Владимир'
};

/**
 * Normalize player name
 * @param {string} name - Raw player name
 * @returns {string} Normalized name
 */
function normalizeName(name) {
  return NAME_NORMALIZATIONS[name] || name;
}

/**
 * Generate unique match ID
 * @param {string} tournament - Tournament name
 * @param {string} league - League name
 * @param {string} group - Group name or stage
 * @param {number} id - Match ID within group
 * @returns {string} Unique match ID
 */
function generateMatchId(tournament, league, group, id) {
  const tournamentSlug = tournament.toLowerCase().replace(/\s+/g, '-');
  const leagueSlug = league.toLowerCase().replace(/\s+/g, '-');
  return `${tournamentSlug}_${leagueSlug}_${group}_${id}`;
}

// Хранилище сырых данных турнира для страницы турнира
let rawTournamentDataStore = null;

/**
 * Parse raw tournament data and extract all matches in processing order
 * @param {Object} rawData - Raw tournament data
 * @returns {Array} Array of match objects
 */
export function parseRawTournamentData(rawData) {
  const matches = [];
  const { tournament, date, leagues } = rawData;

  // Сохраняем сырые данные для страницы турнира
  rawTournamentDataStore = rawData;

  console.log(`Processing tournament: ${tournament} (${date})`);

  // Process leagues in order: Высшая лига first, then Первая лига
  // Within each league, process groups first, then playoff
  leagues.forEach(league => {
    console.log(`  League: ${league.name}`);

    // Обработка групповых матчей (квалификация)
    league.groups.forEach(group => {
      console.log(`    Group ${group.name}: ${group.matches.length} matches`);
      const stage = group.stage || 'qualification';

      group.matches.forEach(match => {
        // Skip draws (like match 16 in Первая лига B with score 15-15)
        if (match.score[0] === match.score[1]) {
          console.log(`      Skipping draw: Match ${match.id} (${match.score[0]}-${match.score[1]})`);
          return;
        }

        // Determine winner (team1 wins if score[0] > score[1])
        const winner = match.score[0] > match.score[1] ? 1 : 2;

        // Normalize player names
        const team1 = match.team1.map(normalizeName);
        const team2 = match.team2.map(normalizeName);

        matches.push({
          id: generateMatchId(tournament, league.name, group.name, match.id),
          date: date,
          tournament: tournament,
          league: league.name,
          group: group.name,
          stage: stage,
          court: match.court,
          team1: team1,
          team2: team2,
          score: match.score,
          winner: winner
        });
      });
    });

    // Обработка плей-офф матчей
    if (league.playoff && league.playoff.matches) {
      console.log(`    Playoff: ${league.playoff.matches.length} matches`);

      league.playoff.matches.forEach(match => {
        // Skip draws
        if (match.score[0] === match.score[1]) {
          console.log(`      Skipping draw: Match ${match.id} (${match.score[0]}-${match.score[1]})`);
          return;
        }

        // Determine winner
        const winner = match.score[0] > match.score[1] ? 1 : 2;

        // Normalize player names
        const team1 = match.team1.map(normalizeName);
        const team2 = match.team2.map(normalizeName);

        matches.push({
          id: generateMatchId(tournament, league.name, 'playoff', match.id),
          date: date,
          tournament: tournament,
          league: league.name,
          group: 'playoff',
          stage: 'playoff',
          round: match.round,
          team1: team1,
          team2: team2,
          score: match.score,
          winner: winner
        });
      });
    }
  });

  console.log(`Total matches to process: ${matches.length}`);
  return matches;
}

/**
 * Получить сырые данные турнира
 * @returns {Object|null} Raw tournament data
 */
export function getRawTournamentData() {
  return rawTournamentDataStore;
}

/**
 * Load and process tournament data
 * @param {Object} rawData - Raw tournament JSON data
 * @returns {Object} Processed data with players and matches
 */
export function loadTournamentData(rawData) {
  // Parse raw data into match array
  const matches = parseRawTournamentData(rawData);

  // Process all matches through Elo system
  const result = processAllMatches(matches);

  console.log(`Processed ${result.players.length} players`);
  console.log(`Top 5 players:`);
  result.players.slice(0, 5).forEach((player, index) => {
    console.log(`  ${index + 1}. ${player.name}: ${player.currentRating} (${player.gamesPlayed} games)`);
  });

  return result;
}

/**
 * Get player by ID
 * @param {Array} players - Array of player objects
 * @param {string} playerId - Player ID to find
 * @returns {Object|null} Player object or null
 */
export function getPlayerById(players, playerId) {
  return players.find(p => p.id === playerId) || null;
}

/**
 * Get matches for a specific player
 * @param {Array} matches - Array of match objects
 * @param {string} playerId - Player ID
 * @returns {Array} Matches involving the player
 */
export function getPlayerMatches(matches, playerId) {
  return matches.filter(match =>
    match.team1.includes(playerId) || match.team2.includes(playerId)
  );
}

/**
 * Get player's partner and opponents for a match
 * @param {Object} match - Match object
 * @param {string} playerId - Player ID
 * @returns {Object} Partner and opponents
 */
export function getMatchDetails(match, playerId) {
  const isTeam1 = match.team1.includes(playerId);
  const playerTeam = isTeam1 ? match.team1 : match.team2;
  const opponentTeam = isTeam1 ? match.team2 : match.team1;
  const partner = playerTeam.find(p => p !== playerId);
  const playerWon = (isTeam1 && match.winner === 1) || (!isTeam1 && match.winner === 2);
  const playerScore = isTeam1 ? match.score[0] : match.score[1];
  const opponentScore = isTeam1 ? match.score[1] : match.score[0];

  return {
    partner,
    opponents: opponentTeam,
    playerWon,
    playerScore,
    opponentScore,
    ratingChange: match.ratingChanges[playerId]
  };
}

/**
 * Calculate statistics
 * @param {Array} players - Array of player objects
 * @param {Array} matches - Array of match objects
 * @returns {Object} Statistics
 */
export function calculateStats(players, matches) {
  const totalGames = matches.length;
  const totalPlayers = players.length;
  const avgRating = Math.round(
    players.reduce((sum, p) => sum + p.currentRating, 0) / players.length
  );
  const calibratedPlayers = players.filter(p => p.isCalibrated).length;

  return {
    totalGames,
    totalPlayers,
    avgRating,
    calibratedPlayers
  };
}
