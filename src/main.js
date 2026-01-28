/**
 * Beach Volleyball Elo Rating System
 * Main entry point
 */

import { loadTournamentData } from './modules/dataManager.js';
import { initUI } from './modules/ui.js';

// Raw tournament data
import tournamentData from '../data/raw/nagornaya_2025-01-25.json';

/**
 * Initialize the application
 */
async function init() {
  console.log('🏐 NAGORNAYA Beach Volleyball Rating System');

  try {
    const data = loadTournamentData(tournamentData);
    console.log(`✅ Loaded ${data.players.length} players, ${data.matches.length} matches`);
    initUI(data);
  } catch (error) {
    console.error('❌ Error:', error);
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
