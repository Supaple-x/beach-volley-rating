/**
 * Beach Volleyball Elo Rating System
 * Tournament page entry point
 */

import { initTournamentUI } from './modules/tournamentUI.js';

// Raw tournament data
import tournamentData from '../data/raw/nagornaya_2025-01-25.json';

/**
 * Initialize the tournament page
 */
async function init() {
  console.log('Tournament page initializing...');

  try {
    initTournamentUI(tournamentData);
    console.log('Tournament page loaded successfully');
  } catch (error) {
    console.error('Error:', error);
    document.body.innerHTML = `
      <div class="min-h-screen bg-background-dark flex items-center justify-center p-8">
        <div class="text-center">
          <h2 class="text-2xl font-bold text-red-400 mb-4">Ошибка загрузки данных</h2>
          <p class="text-slate-400">${error.message}</p>
        </div>
      </div>
    `;
  }
}

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', init);
