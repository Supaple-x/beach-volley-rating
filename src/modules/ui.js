/**
 * UI Module - handles rendering of interface components
 * Updated for Tailwind CSS design system
 */

import { getPlayerMatches, getMatchDetails, calculateStats } from './dataManager.js';
import { renderChart } from './chart.js';
import { formatDate, formatRatingChange } from '../utils/helpers.js';

let currentData = null;
let filteredPlayers = [];
let currentPage = 1;
const ITEMS_PER_PAGE = 15;

/**
 * Initialize UI with data
 * @param {Object} data - Processed data with players and matches
 */
export function initUI(data) {
  currentData = data;
  filteredPlayers = [...data.players];

  renderStats(data.players, data.matches);
  renderRatingTable();
  setupModalHandlers();
  setupSearchAndFilters();
}

/**
 * Render statistics cards
 */
function renderStats(players, matches) {
  const stats = calculateStats(players, matches);

  document.getElementById('stat-players').textContent = stats.totalPlayers.toLocaleString('ru-RU');
  document.getElementById('stat-matches').textContent = stats.totalGames.toLocaleString('ru-RU');
  document.getElementById('stat-avg-elo').textContent = stats.avgRating.toLocaleString('ru-RU');
}

/**
 * Setup search and filter handlers
 */
function setupSearchAndFilters() {
  const searchInput = document.getElementById('search-input');
  const leagueFilter = document.getElementById('league-filter');

  searchInput.addEventListener('input', () => {
    currentPage = 1;
    applyFilters();
  });

  leagueFilter.addEventListener('change', () => {
    currentPage = 1;
    applyFilters();
  });
}

/**
 * Apply search and filter criteria
 */
function applyFilters() {
  const searchTerm = document.getElementById('search-input').value.toLowerCase().trim();
  const leagueFilter = document.getElementById('league-filter').value;

  filteredPlayers = currentData.players.filter(player => {
    // Search filter
    const matchesSearch = !searchTerm || player.name.toLowerCase().includes(searchTerm);

    // League filter - check player's matches for league participation
    let matchesLeague = true;
    if (leagueFilter !== 'all') {
      const playerMatches = getPlayerMatches(currentData.matches, player.id);
      matchesLeague = playerMatches.some(m => m.league === leagueFilter);
    }

    return matchesSearch && matchesLeague;
  });

  renderRatingTable();
}

/**
 * Get medal HTML for top 3
 */
function getMedalHtml(rank) {
  if (rank === 1) {
    return `<div class="flex items-center justify-center size-8 bg-slate-800 rounded-lg shadow-inner">
      <span class="material-symbols-outlined medal-gold text-2xl">workspace_premium</span>
    </div>`;
  }
  if (rank === 2) {
    return `<div class="flex items-center justify-center size-8 bg-slate-800 rounded-lg shadow-inner">
      <span class="material-symbols-outlined medal-silver text-2xl">workspace_premium</span>
    </div>`;
  }
  if (rank === 3) {
    return `<div class="flex items-center justify-center size-8 bg-slate-800 rounded-lg shadow-inner">
      <span class="material-symbols-outlined medal-bronze text-2xl">workspace_premium</span>
    </div>`;
  }
  return `<span class="font-bold text-slate-500">${rank}</span>`;
}

/**
 * Get trend HTML
 */
function getTrendHtml(change) {
  if (change > 0) {
    return `<div class="flex items-center justify-center text-green-400 font-bold gap-1">
      <span class="material-symbols-outlined text-[18px]">trending_up</span>
      <span>+${change}</span>
    </div>`;
  }
  if (change < 0) {
    return `<div class="flex items-center justify-center text-red-400 font-bold gap-1">
      <span class="material-symbols-outlined text-[18px]">trending_down</span>
      <span>${change}</span>
    </div>`;
  }
  return `<div class="flex items-center justify-center text-slate-400 font-bold gap-1">
    <span class="material-symbols-outlined text-[18px]">horizontal_rule</span>
    <span>0</span>
  </div>`;
}

/**
 * Calculate win rate for a player
 */
function calculateWinRate(playerId) {
  if (!currentData) return { wins: 0, total: 0, rate: 0 };

  const playerMatches = getPlayerMatches(currentData.matches, playerId);
  const wins = playerMatches.filter(m => {
    const details = getMatchDetails(m, playerId);
    return details.playerWon;
  }).length;

  const rate = playerMatches.length > 0 ? Math.round((wins / playerMatches.length) * 100) : 0;
  return { wins, total: playerMatches.length, rate };
}

/**
 * Render rating table
 */
function renderRatingTable() {
  const tbody = document.getElementById('rating-tbody');
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const pageData = filteredPlayers.slice(startIndex, endIndex);

  tbody.innerHTML = '';

  if (pageData.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="px-6 py-12 text-center text-slate-400">
          Игроки не найдены
        </td>
      </tr>
    `;
    renderPagination();
    return;
  }

  pageData.forEach((player, index) => {
    const globalRank = startIndex + index + 1;
    const winStats = calculateWinRate(player.id);

    const row = document.createElement('tr');
    row.className = 'hover:bg-primary/5 transition-colors cursor-pointer group';
    row.dataset.playerId = player.id;

    row.innerHTML = `
      <td class="px-6 py-5 text-center">
        ${getMedalHtml(globalRank)}
      </td>
      <td class="px-6 py-5">
        <div class="flex items-center gap-4">
          <div class="size-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 border border-white/10 flex items-center justify-center text-lg font-bold text-primary">
            ${player.name.charAt(0)}
          </div>
          <div>
            <div class="font-bold text-lg leading-tight">${player.name}</div>
            <div class="text-xs text-slate-400">
              ${player.gamesPlayed} игр
              ${!player.isCalibrated ? '<span class="ml-2 px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-[10px] font-bold">NEW</span>' : ''}
            </div>
          </div>
        </div>
      </td>
      <td class="px-6 py-5 text-center">
        <span class="text-accent-blue font-bold text-2xl tracking-tighter">${player.currentRating.toLocaleString('ru-RU')}</span>
      </td>
      <td class="px-6 py-5 text-center font-medium">${player.gamesPlayed}</td>
      <td class="px-6 py-5 text-center">
        <div class="w-24 bg-slate-800 rounded-full h-1.5 mx-auto mb-1 overflow-hidden">
          <div class="bg-green-500 h-full rounded-full" style="width: ${winStats.rate}%"></div>
        </div>
        <span class="text-sm font-bold ${winStats.rate >= 50 ? 'text-green-400' : 'text-slate-400'}">${winStats.rate}%</span>
      </td>
      <td class="px-6 py-5 text-center">
        ${getTrendHtml(player.lastChange)}
      </td>
    `;

    row.addEventListener('click', () => openPlayerModal(player.id));
    tbody.appendChild(row);
  });

  renderPagination();
}

/**
 * Render pagination controls
 */
function renderPagination() {
  const totalPages = Math.ceil(filteredPlayers.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endIndex = Math.min(currentPage * ITEMS_PER_PAGE, filteredPlayers.length);

  document.getElementById('pagination-info').textContent =
    filteredPlayers.length > 0
      ? `Показано ${startIndex}-${endIndex} из ${filteredPlayers.length} игроков`
      : 'Нет результатов';

  const controls = document.getElementById('pagination-controls');
  controls.innerHTML = '';

  if (totalPages <= 1) return;

  // Previous button
  const prevBtn = document.createElement('button');
  prevBtn.className = `p-2 rounded-lg ${currentPage === 1 ? 'bg-slate-800/50 text-slate-600 cursor-not-allowed' : 'bg-slate-800 text-slate-400 hover:text-white'}`;
  prevBtn.innerHTML = '<span class="material-symbols-outlined">chevron_left</span>';
  prevBtn.disabled = currentPage === 1;
  prevBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderRatingTable();
    }
  });
  controls.appendChild(prevBtn);

  // Page numbers
  const pagesToShow = [];
  if (totalPages <= 5) {
    for (let i = 1; i <= totalPages; i++) pagesToShow.push(i);
  } else {
    pagesToShow.push(1);
    if (currentPage > 3) pagesToShow.push('...');
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pagesToShow.push(i);
    }
    if (currentPage < totalPages - 2) pagesToShow.push('...');
    pagesToShow.push(totalPages);
  }

  pagesToShow.forEach(page => {
    if (page === '...') {
      const ellipsis = document.createElement('span');
      ellipsis.className = 'flex items-center px-2 text-slate-400';
      ellipsis.textContent = '...';
      controls.appendChild(ellipsis);
    } else {
      const pageBtn = document.createElement('button');
      pageBtn.className = `size-10 rounded-lg font-bold ${page === currentPage ? 'bg-primary text-background-dark' : 'bg-slate-800 text-slate-400 hover:text-white'}`;
      pageBtn.textContent = page;
      pageBtn.addEventListener('click', () => {
        currentPage = page;
        renderRatingTable();
      });
      controls.appendChild(pageBtn);
    }
  });

  // Next button
  const nextBtn = document.createElement('button');
  nextBtn.className = `p-2 rounded-lg ${currentPage === totalPages ? 'bg-slate-800/50 text-slate-600 cursor-not-allowed' : 'bg-slate-800 text-slate-400 hover:text-white'}`;
  nextBtn.innerHTML = '<span class="material-symbols-outlined">chevron_right</span>';
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderRatingTable();
    }
  });
  controls.appendChild(nextBtn);
}

/**
 * Setup modal event handlers
 */
function setupModalHandlers() {
  const overlay = document.getElementById('modal-overlay');
  const closeBtn = document.getElementById('modal-close');

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  closeBtn.addEventListener('click', closeModal);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('active')) {
      closeModal();
    }
  });
}

/**
 * Open player profile modal
 */
function openPlayerModal(playerId) {
  if (!currentData) return;

  const player = currentData.players.find(p => p.id === playerId);
  if (!player) return;

  const playerMatches = getPlayerMatches(currentData.matches, playerId);
  const winStats = calculateWinRate(playerId);

  const content = document.getElementById('modal-content');

  content.innerHTML = `
    <div class="text-center mb-8">
      <div class="size-20 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 border-2 border-primary/30 mx-auto mb-4 flex items-center justify-center text-3xl font-bold text-primary">
        ${player.name.charAt(0)}
      </div>
      <h2 class="text-2xl font-bold mb-1">${player.name}</h2>
      ${!player.isCalibrated ? '<span class="inline-block px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs font-bold mb-4">КАЛИБРОВКА</span>' : ''}

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
        <div class="bg-slate-800/50 rounded-xl p-4 relative group">
          <div class="text-2xl font-bold text-accent-blue">${player.currentRating}</div>
          <div class="text-xs text-slate-400 uppercase flex items-center justify-center gap-1">
            Рейтинг
            <span class="tooltip-trigger">
              <span class="material-symbols-outlined text-[12px] text-slate-500">help</span>
              <div class="tooltip-content normal-case tracking-normal font-normal" style="width: 260px; left: 0; transform: none;">
                <div class="tooltip-title">Elo Рейтинг</div>
                <p class="tooltip-text">Начальный: 1500. Растёт при победах над сильными соперниками, падает при поражениях.</p>
                <p class="tooltip-note">${!player.isCalibrated ? 'Игрок на калибровке (K=40)' : 'Калибровка завершена (K=32)'}</p>
              </div>
            </span>
          </div>
        </div>
        <div class="bg-slate-800/50 rounded-xl p-4">
          <div class="text-2xl font-bold">${player.gamesPlayed}</div>
          <div class="text-xs text-slate-400 uppercase">Игр</div>
        </div>
        <div class="bg-slate-800/50 rounded-xl p-4">
          <div class="text-2xl font-bold text-green-400">${winStats.wins}</div>
          <div class="text-xs text-slate-400 uppercase">Побед</div>
        </div>
        <div class="bg-slate-800/50 rounded-xl p-4 relative">
          <div class="text-2xl font-bold ${winStats.rate >= 50 ? 'text-green-400' : 'text-red-400'}">${winStats.rate}%</div>
          <div class="text-xs text-slate-400 uppercase flex items-center justify-center gap-1">
            Винрейт
            <span class="tooltip-trigger">
              <span class="material-symbols-outlined text-[12px] text-slate-500">help</span>
              <div class="tooltip-content normal-case tracking-normal font-normal" style="width: 220px; right: 0; left: auto; transform: none;">
                <div class="tooltip-title">Процент побед</div>
                <p class="tooltip-text">${winStats.wins} из ${winStats.total} матчей выиграно</p>
                <div class="tooltip-formula text-center">${winStats.wins} ÷ ${winStats.total} = ${winStats.rate}%</div>
              </div>
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="mb-8">
      <h3 class="text-lg font-bold mb-4 flex items-center gap-2">
        <span class="material-symbols-outlined text-primary">show_chart</span>
        История рейтинга
      </h3>
      <div class="bg-slate-800/50 rounded-xl p-4 h-[200px]" id="rating-chart"></div>
    </div>

    <div>
      <h3 class="text-lg font-bold mb-4 flex items-center gap-2">
        <span class="material-symbols-outlined text-primary">history</span>
        Последние матчи
      </h3>
      <div class="space-y-3" id="match-list"></div>
    </div>
  `;

  // Render matches
  const matchList = document.getElementById('match-list');
  const recentMatches = playerMatches.slice(-10).reverse();

  // Build a map of matchId to rating history entry for this player
  const ratingByMatch = new Map();
  player.ratingHistory.forEach((entry, index) => {
    if (entry.matchId) {
      const prevRating = index > 0 ? player.ratingHistory[index - 1].rating : 1500;
      ratingByMatch.set(entry.matchId, {
        before: prevRating,
        after: entry.rating,
        change: entry.change
      });
    }
  });

  if (recentMatches.length === 0) {
    matchList.innerHTML = '<p class="text-slate-400 text-center py-4">Нет матчей</p>';
  } else {
    recentMatches.forEach(match => {
      const details = getMatchDetails(match, playerId);
      const ratingInfo = ratingByMatch.get(match.id) || { before: '?', after: '?', change: details.ratingChange };
      const matchItem = document.createElement('div');
      matchItem.className = 'bg-slate-800/50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3';

      matchItem.innerHTML = `
        <div class="text-xs text-slate-500 sm:w-24 shrink-0">
          ${formatDate(match.date)}<br>
          <span class="text-slate-600">${match.league}</span>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 ${details.playerWon ? 'text-white' : 'text-slate-400'}">
            <span class="font-bold">${details.playerScore}</span>
            <span class="truncate">${player.name} + ${details.partner}</span>
            ${details.playerWon ? '<span class="material-symbols-outlined text-green-400 text-sm">check_circle</span>' : ''}
          </div>
          <div class="flex items-center gap-2 ${!details.playerWon ? 'text-white' : 'text-slate-400'}">
            <span class="font-bold">${details.opponentScore}</span>
            <span class="truncate">${details.opponents.join(' + ')}</span>
            ${!details.playerWon ? '<span class="material-symbols-outlined text-green-400 text-sm">check_circle</span>' : ''}
          </div>
        </div>
        <div class="text-right">
          <div class="font-bold text-lg ${details.ratingChange >= 0 ? 'text-green-400' : 'text-red-400'}">
            ${formatRatingChange(details.ratingChange)}
          </div>
          <div class="text-[11px] text-slate-500">
            ${ratingInfo.before} → ${ratingInfo.after}
          </div>
        </div>
      `;

      matchList.appendChild(matchItem);
    });
  }

  // Render chart
  const chartContainer = document.getElementById('rating-chart');
  renderChart(chartContainer, player.ratingHistory);

  // Show modal
  document.getElementById('modal-overlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

/**
 * Close modal
 */
function closeModal() {
  document.getElementById('modal-overlay').classList.remove('active');
  document.body.style.overflow = '';
}

export { openPlayerModal, closeModal };
