/**
 * Elo Rating Calculator for Beach Volleyball (2x2)
 * Based on Lichess model
 */

// Constants
const INITIAL_RATING = 1500;
const K_FACTOR_DEFAULT = 32;
const K_FACTOR_CALIBRATION = 40;
const CALIBRATION_GAMES = 15;

/**
 * Calculate expected score using Elo formula
 * E = 1 / (1 + 10^((R_opponent - R_player) / 400))
 * @param {number} playerRating - Player's current rating
 * @param {number} opponentRating - Opponent team's average rating
 * @returns {number} Expected score (0 to 1)
 */
export function calculateExpectedScore(playerRating, opponentRating) {
  return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
}

/**
 * Get K-factor based on number of games played
 * @param {number} gamesPlayed - Number of games the player has played
 * @returns {number} K-factor to use
 */
export function getKFactor(gamesPlayed) {
  return gamesPlayed < CALIBRATION_GAMES ? K_FACTOR_CALIBRATION : K_FACTOR_DEFAULT;
}

/**
 * Calculate rating change for a player
 * ΔR = K * (S - E)
 * @param {number} playerRating - Player's current rating
 * @param {number} opponentTeamRating - Average rating of opponent team
 * @param {boolean} isWinner - Whether the player won
 * @param {number} gamesPlayed - Number of games the player has played
 * @returns {number} Rating change (can be positive or negative)
 */
export function calculateRatingChange(playerRating, opponentTeamRating, isWinner, gamesPlayed) {
  const expectedScore = calculateExpectedScore(playerRating, opponentTeamRating);
  const actualScore = isWinner ? 1 : 0;
  const kFactor = getKFactor(gamesPlayed);

  return Math.round(kFactor * (actualScore - expectedScore));
}

/**
 * Calculate team's average rating
 * @param {number} rating1 - First player's rating
 * @param {number} rating2 - Second player's rating
 * @returns {number} Average team rating
 */
export function calculateTeamRating(rating1, rating2) {
  return (rating1 + rating2) / 2;
}

/**
 * Process a single match and calculate rating changes for all players
 * @param {Object} match - Match data
 * @param {Map} playerRatings - Map of player ID to current rating
 * @param {Map} playerGames - Map of player ID to games played
 * @returns {Object} Rating changes for each player
 */
export function processMatch(match, playerRatings, playerGames) {
  const { team1, team2, winner } = match;

  // Get current ratings
  const team1Player1Rating = playerRatings.get(team1[0]) || INITIAL_RATING;
  const team1Player2Rating = playerRatings.get(team1[1]) || INITIAL_RATING;
  const team2Player1Rating = playerRatings.get(team2[0]) || INITIAL_RATING;
  const team2Player2Rating = playerRatings.get(team2[1]) || INITIAL_RATING;

  // Calculate team average ratings
  const team1AvgRating = calculateTeamRating(team1Player1Rating, team1Player2Rating);
  const team2AvgRating = calculateTeamRating(team2Player1Rating, team2Player2Rating);

  // Determine winners
  const team1Won = winner === 1;

  // Calculate rating changes for each player
  const ratingChanges = {};

  // Team 1 players
  ratingChanges[team1[0]] = calculateRatingChange(
    team1Player1Rating,
    team2AvgRating,
    team1Won,
    playerGames.get(team1[0]) || 0
  );

  ratingChanges[team1[1]] = calculateRatingChange(
    team1Player2Rating,
    team2AvgRating,
    team1Won,
    playerGames.get(team1[1]) || 0
  );

  // Team 2 players
  ratingChanges[team2[0]] = calculateRatingChange(
    team2Player1Rating,
    team1AvgRating,
    !team1Won,
    playerGames.get(team2[0]) || 0
  );

  ratingChanges[team2[1]] = calculateRatingChange(
    team2Player2Rating,
    team1AvgRating,
    !team1Won,
    playerGames.get(team2[1]) || 0
  );

  return ratingChanges;
}

/**
 * Process all matches and calculate final ratings for all players
 * @param {Array} matches - Array of match objects
 * @returns {Object} Object containing players data and processed matches
 */
export function processAllMatches(matches) {
  const playerRatings = new Map();
  const playerGames = new Map();
  const playerHistory = new Map();
  const processedMatches = [];

  // Initialize all players from matches
  matches.forEach(match => {
    [...match.team1, ...match.team2].forEach(playerId => {
      if (!playerRatings.has(playerId)) {
        playerRatings.set(playerId, INITIAL_RATING);
        playerGames.set(playerId, 0);
        playerHistory.set(playerId, [{
          date: match.date,
          rating: INITIAL_RATING,
          matchId: null,
          change: 0
        }]);
      }
    });
  });

  // Process matches in order
  matches.forEach(match => {
    const ratingChanges = processMatch(match, playerRatings, playerGames);

    // Update ratings and games count
    Object.entries(ratingChanges).forEach(([playerId, change]) => {
      const newRating = playerRatings.get(playerId) + change;
      playerRatings.set(playerId, newRating);
      playerGames.set(playerId, (playerGames.get(playerId) || 0) + 1);

      // Add to history
      const history = playerHistory.get(playerId);
      history.push({
        date: match.date,
        rating: newRating,
        matchId: match.id,
        change: change
      });
    });

    // Store processed match with rating changes
    processedMatches.push({
      ...match,
      ratingChanges
    });
  });

  // Build players array
  const players = [];
  playerRatings.forEach((rating, playerId) => {
    const gamesPlayed = playerGames.get(playerId);
    const history = playerHistory.get(playerId);
    const lastChange = history.length > 1 ? history[history.length - 1].change : 0;

    players.push({
      id: playerId,
      name: playerId, // Name is same as ID in our case
      currentRating: rating,
      gamesPlayed: gamesPlayed,
      isCalibrated: gamesPlayed >= CALIBRATION_GAMES,
      ratingHistory: history,
      lastChange: lastChange
    });
  });

  // Sort players by rating (descending)
  players.sort((a, b) => b.currentRating - a.currentRating);

  return {
    players,
    matches: processedMatches
  };
}

export { INITIAL_RATING, K_FACTOR_DEFAULT, K_FACTOR_CALIBRATION, CALIBRATION_GAMES };
