/**
 * Beach Volleyball Elo Rating System
 * Tournament page entry point
 */

import { initTournamentUI } from './modules/tournamentUI.js';

// API base URL (относительный путь для production)
const API_BASE = '/api';

/**
 * Получить ID турнира из URL параметров
 * @returns {number|null}
 */
function getTournamentIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  return id ? parseInt(id, 10) : null;
}

/**
 * Загрузить данные турнира с API
 * @param {number} tournamentId
 * @returns {Promise<Object>}
 */
async function fetchTournamentData(tournamentId) {
  const response = await fetch(`${API_BASE}/tournaments/${tournamentId}`);
  if (!response.ok) {
    throw new Error(`Турнир не найден (ID: ${tournamentId})`);
  }
  return response.json();
}

/**
 * Загрузить список сезонов и последний турнир
 * @returns {Promise<Object>}
 */
async function fetchLatestTournament() {
  // Получаем список сезонов
  const seasonsResponse = await fetch(`${API_BASE}/seasons`);
  if (!seasonsResponse.ok) {
    throw new Error('Не удалось загрузить список сезонов');
  }
  const seasons = await seasonsResponse.json();

  if (seasons.length === 0) {
    throw new Error('Нет доступных турниров');
  }

  // Берём последний сезон и его турниры
  const latestSeason = seasons[0];
  const tournamentsResponse = await fetch(`${API_BASE}/seasons/${latestSeason.id}/tournaments`);
  if (!tournamentsResponse.ok) {
    throw new Error('Не удалось загрузить турниры сезона');
  }
  const tournaments = await tournamentsResponse.json();

  if (tournaments.length === 0) {
    throw new Error('Нет турниров в сезоне');
  }

  // Возвращаем последний турнир
  const latestTournament = tournaments[tournaments.length - 1];
  return fetchTournamentData(latestTournament.id);
}

/**
 * Initialize the tournament page
 */
async function init() {
  console.log('Tournament page initializing...');

  try {
    // Проверяем, есть ли ID турнира в URL
    const tournamentId = getTournamentIdFromUrl();

    let tournamentData;
    if (tournamentId) {
      tournamentData = await fetchTournamentData(tournamentId);
    } else {
      // Если ID не указан, загружаем последний турнир
      tournamentData = await fetchLatestTournament();
    }

    initTournamentUI(tournamentData);
    console.log('Tournament page loaded successfully');
  } catch (error) {
    console.error('Error:', error);
    document.getElementById('tournament-content').innerHTML = `
      <div class="flex flex-col items-center justify-center py-20 text-center">
        <span class="material-symbols-outlined text-4xl text-red-400 mb-4">error</span>
        <h2 class="text-xl font-bold text-red-400 mb-2">Ошибка загрузки данных</h2>
        <p class="text-slate-400">${error.message}</p>
      </div>
    `;
  }
}

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', init);
