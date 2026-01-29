/**
 * Tournament UI Module - handles rendering of tournament summary page
 * Shows qualification tables, match lists, and playoff brackets
 */

import { formatDate } from '../utils/helpers.js';

let tournamentData = null;

/**
 * Initialize Tournament UI
 * @param {Object} rawData - Raw tournament data
 */
export function initTournamentUI(rawData) {
  tournamentData = rawData;

  // Устанавливаем заголовок
  document.getElementById('tournament-title').textContent = rawData.tournament;
  document.getElementById('tournament-date').textContent = formatDate(rawData.date);

  // Порядок: Первая лига, затем Высшая лига
  const leagues = [...rawData.leagues].reverse();

  const container = document.getElementById('tournament-content');
  container.innerHTML = '';

  leagues.forEach(league => {
    container.appendChild(renderLeagueSection(league));
  });
}

/**
 * Render a complete league section
 * @param {Object} league - League data
 * @returns {HTMLElement}
 */
function renderLeagueSection(league) {
  const section = document.createElement('section');
  section.className = 'mb-16';

  // League header
  const header = document.createElement('div');
  header.className = 'flex items-center gap-4 mb-8';
  header.innerHTML = `
    <div class="size-12 bg-primary/20 rounded-xl flex items-center justify-center">
      <span class="material-symbols-outlined text-primary text-2xl">emoji_events</span>
    </div>
    <div>
      <h2 class="text-2xl font-bold">${league.name}</h2>
      <p class="text-slate-400 text-sm">${league.groups.length} группы • ${league.playoff?.matches?.length || 0} матчей плей-офф</p>
    </div>
  `;
  section.appendChild(header);

  // Qualification section
  const qualSection = document.createElement('div');
  qualSection.className = 'mb-12';
  qualSection.innerHTML = `
    <h3 class="text-xl font-bold mb-6 flex items-center gap-2">
      <span class="material-symbols-outlined text-slate-400">groups</span>
      Квалификация
    </h3>
  `;

  const groupsContainer = document.createElement('div');
  groupsContainer.className = 'grid lg:grid-cols-2 gap-8';

  league.groups.forEach(group => {
    groupsContainer.appendChild(renderGroupSection(group, league.name));
  });

  qualSection.appendChild(groupsContainer);
  section.appendChild(qualSection);

  // Playoff section
  if (league.playoff && league.playoff.matches && league.playoff.matches.length > 0) {
    section.appendChild(renderPlayoffSection(league.playoff, league.name));
  }

  return section;
}

/**
 * Calculate standings for a group
 * @param {Array} matches - Group matches
 * @returns {Array} Sorted standings
 */
function calculateStandings(matches) {
  const players = new Map();

  matches.forEach(match => {
    // Пропускаем ничьи
    if (match.score[0] === match.score[1]) return;

    const team1Won = match.score[0] > match.score[1];

    // Обрабатываем каждого игрока
    [...match.team1, ...match.team2].forEach(playerName => {
      if (!players.has(playerName)) {
        players.set(playerName, {
          name: playerName,
          games: 0,
          wins: 0,
          losses: 0,
          pointsFor: 0,
          pointsAgainst: 0
        });
      }
    });

    // Team 1
    match.team1.forEach(playerName => {
      const p = players.get(playerName);
      p.games++;
      if (team1Won) p.wins++; else p.losses++;
      p.pointsFor += match.score[0];
      p.pointsAgainst += match.score[1];
    });

    // Team 2
    match.team2.forEach(playerName => {
      const p = players.get(playerName);
      p.games++;
      if (!team1Won) p.wins++; else p.losses++;
      p.pointsFor += match.score[1];
      p.pointsAgainst += match.score[0];
    });
  });

  // Конвертируем в массив и сортируем
  return Array.from(players.values())
    .map(p => ({
      ...p,
      pointsDiff: p.pointsFor - p.pointsAgainst,
      winRate: p.games > 0 ? Math.round((p.wins / p.games) * 100) : 0
    }))
    .sort((a, b) => {
      // Сначала по победам, затем по разнице очков
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.pointsDiff - a.pointsDiff;
    });
}

/**
 * Render group section with table and matches
 * @param {Object} group - Group data
 * @param {string} leagueName - League name
 * @returns {HTMLElement}
 */
function renderGroupSection(group, leagueName) {
  const container = document.createElement('div');
  container.className = 'glass-panel rounded-xl overflow-hidden';

  // Group header
  const header = document.createElement('div');
  header.className = 'bg-slate-900/50 px-6 py-4 border-b border-white/5';
  header.innerHTML = `
    <h4 class="font-bold text-lg">Группа ${group.name}</h4>
    <p class="text-slate-400 text-sm">${group.matches.length} матчей</p>
  `;
  container.appendChild(header);

  // Standings table
  const standings = calculateStandings(group.matches);
  const tableContainer = document.createElement('div');
  tableContainer.className = 'overflow-x-auto';
  tableContainer.innerHTML = `
    <table class="w-full text-sm">
      <thead>
        <tr class="text-slate-400 text-[11px] uppercase tracking-wider border-b border-white/5">
          <th class="px-4 py-3 text-left">#</th>
          <th class="px-4 py-3 text-left">Игрок</th>
          <th class="px-4 py-3 text-center">И</th>
          <th class="px-4 py-3 text-center">В</th>
          <th class="px-4 py-3 text-center">П</th>
          <th class="px-4 py-3 text-center">О+</th>
          <th class="px-4 py-3 text-center">О-</th>
          <th class="px-4 py-3 text-center">±</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-white/5">
        ${standings.map((p, i) => `
          <tr class="hover:bg-white/5">
            <td class="px-4 py-2 text-slate-500 font-bold">${i + 1}</td>
            <td class="px-4 py-2 font-medium">${p.name}</td>
            <td class="px-4 py-2 text-center">${p.games}</td>
            <td class="px-4 py-2 text-center text-green-400 font-bold">${p.wins}</td>
            <td class="px-4 py-2 text-center text-red-400">${p.losses}</td>
            <td class="px-4 py-2 text-center">${p.pointsFor}</td>
            <td class="px-4 py-2 text-center">${p.pointsAgainst}</td>
            <td class="px-4 py-2 text-center font-bold ${p.pointsDiff > 0 ? 'text-green-400' : p.pointsDiff < 0 ? 'text-red-400' : ''}">${p.pointsDiff > 0 ? '+' : ''}${p.pointsDiff}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  container.appendChild(tableContainer);

  // Match list (collapsible)
  const matchesSection = document.createElement('div');
  matchesSection.className = 'border-t border-white/5';

  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'w-full px-6 py-3 flex items-center justify-between text-slate-400 hover:text-white hover:bg-white/5 transition-colors';
  toggleBtn.innerHTML = `
    <span class="text-sm font-medium">Показать матчи</span>
    <span class="material-symbols-outlined text-sm transition-transform" id="toggle-icon">expand_more</span>
  `;

  const matchesList = document.createElement('div');
  matchesList.className = 'hidden px-4 pb-4 max-h-96 overflow-y-auto';
  matchesList.innerHTML = `
    <div class="space-y-2">
      ${group.matches.map(match => {
        const isDraw = match.score[0] === match.score[1];
        const team1Won = match.score[0] > match.score[1];
        return `
          <div class="flex items-center gap-3 py-2 px-3 rounded-lg bg-slate-900/30 text-sm">
            <span class="text-slate-500 w-8">#${match.id}</span>
            <div class="flex-1 flex items-center gap-2 ${team1Won && !isDraw ? 'text-white font-medium' : 'text-slate-400'}">
              <span class="truncate">${match.team1.join(' + ')}</span>
            </div>
            <div class="flex items-center gap-1 font-bold tabular-nums">
              <span class="${team1Won ? 'text-green-400' : isDraw ? 'text-yellow-400' : 'text-slate-400'}">${match.score[0]}</span>
              <span class="text-slate-600">:</span>
              <span class="${!team1Won ? 'text-green-400' : isDraw ? 'text-yellow-400' : 'text-slate-400'}">${match.score[1]}</span>
            </div>
            <div class="flex-1 flex items-center gap-2 justify-end ${!team1Won && !isDraw ? 'text-white font-medium' : 'text-slate-400'}">
              <span class="truncate text-right">${match.team2.join(' + ')}</span>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  toggleBtn.addEventListener('click', () => {
    const isHidden = matchesList.classList.contains('hidden');
    matchesList.classList.toggle('hidden');
    toggleBtn.querySelector('#toggle-icon').style.transform = isHidden ? 'rotate(180deg)' : '';
    toggleBtn.querySelector('span:first-child').textContent = isHidden ? 'Скрыть матчи' : 'Показать матчи';
  });

  matchesSection.appendChild(toggleBtn);
  matchesSection.appendChild(matchesList);
  container.appendChild(matchesSection);

  return container;
}

/**
 * Render playoff bracket
 * @param {Object} playoff - Playoff data
 * @param {string} leagueName - League name
 * @returns {HTMLElement}
 */
function renderPlayoffSection(playoff, leagueName) {
  const section = document.createElement('div');
  section.className = 'mt-8';
  section.innerHTML = `
    <h3 class="text-xl font-bold mb-6 flex items-center gap-2">
      <span class="material-symbols-outlined text-primary">trophy</span>
      Плей-офф
    </h3>
  `;

  // Группируем матчи по раундам
  const rounds = new Map();
  const roundOrder = ['1/8', '1/4', '1/2', 'semifinal', '3rd_place', 'final'];
  const roundNames = {
    '1/8': '1/8 финала',
    '1/4': 'Четвертьфинал',
    '1/2': 'Полуфинал',
    'semifinal': 'Полуфинал',
    '3rd_place': 'За 3-е место',
    'final': 'Финал'
  };

  playoff.matches.forEach(match => {
    const round = match.round;
    if (!rounds.has(round)) {
      rounds.set(round, []);
    }
    rounds.get(round).push(match);
  });

  // Создаем сетку плей-офф
  const bracketContainer = document.createElement('div');
  bracketContainer.className = 'overflow-x-auto pb-4';

  const bracket = document.createElement('div');
  bracket.className = 'flex gap-4 min-w-max';

  // Сортируем раунды
  const sortedRounds = Array.from(rounds.entries()).sort((a, b) => {
    return roundOrder.indexOf(a[0]) - roundOrder.indexOf(b[0]);
  });

  // Отделяем финальные матчи
  const mainRounds = sortedRounds.filter(([round]) => !['3rd_place', 'final'].includes(round));
  const finalRounds = sortedRounds.filter(([round]) => ['3rd_place', 'final'].includes(round));

  // Основная сетка
  mainRounds.forEach(([round, matches], roundIndex) => {
    const roundEl = document.createElement('div');
    roundEl.className = 'flex flex-col';

    // Заголовок раунда
    const roundHeader = document.createElement('div');
    roundHeader.className = 'text-center mb-4';
    roundHeader.innerHTML = `
      <div class="text-xs text-slate-500 uppercase tracking-wider">${roundNames[round] || round}</div>
    `;
    roundEl.appendChild(roundHeader);

    // Матчи раунда
    const matchesContainer = document.createElement('div');
    matchesContainer.className = 'flex flex-col justify-around flex-1 gap-4';

    matches.forEach(match => {
      matchesContainer.appendChild(renderBracketMatch(match));
    });

    roundEl.appendChild(matchesContainer);
    bracket.appendChild(roundEl);

    // Линии соединения (кроме последнего раунда основной сетки)
    if (roundIndex < mainRounds.length - 1) {
      const connector = document.createElement('div');
      connector.className = 'flex items-center w-8';
      connector.innerHTML = `<div class="w-full border-t border-slate-700"></div>`;
      bracket.appendChild(connector);
    }
  });

  bracketContainer.appendChild(bracket);
  section.appendChild(bracketContainer);

  // Финальные матчи
  if (finalRounds.length > 0) {
    const finalsContainer = document.createElement('div');
    finalsContainer.className = 'mt-8 grid md:grid-cols-2 gap-6';

    // Сначала финал, потом за 3-е место
    const finalMatch = finalRounds.find(([r]) => r === 'final');
    const thirdPlaceMatch = finalRounds.find(([r]) => r === '3rd_place');

    if (finalMatch) {
      finalsContainer.appendChild(renderFinalMatch(finalMatch[1][0], 'Финал', true));
    }

    if (thirdPlaceMatch) {
      finalsContainer.appendChild(renderFinalMatch(thirdPlaceMatch[1][0], 'За 3-е место', false));
    }

    section.appendChild(finalsContainer);
  }

  return section;
}

/**
 * Render a single bracket match
 * @param {Object} match - Match data
 * @returns {HTMLElement}
 */
function renderBracketMatch(match) {
  const el = document.createElement('div');
  el.className = 'w-64 glass-panel rounded-lg overflow-hidden';

  const team1Won = match.score[0] > match.score[1];

  el.innerHTML = `
    <div class="flex items-center justify-between px-3 py-2 ${team1Won ? 'bg-green-500/10' : 'bg-slate-900/50'} border-b border-white/5">
      <span class="text-sm truncate ${team1Won ? 'font-bold text-white' : 'text-slate-400'}">${match.team1.join(' + ')}</span>
      <span class="font-bold ${team1Won ? 'text-green-400' : 'text-slate-500'}">${match.score[0]}</span>
    </div>
    <div class="flex items-center justify-between px-3 py-2 ${!team1Won ? 'bg-green-500/10' : 'bg-slate-900/50'}">
      <span class="text-sm truncate ${!team1Won ? 'font-bold text-white' : 'text-slate-400'}">${match.team2.join(' + ')}</span>
      <span class="font-bold ${!team1Won ? 'text-green-400' : 'text-slate-500'}">${match.score[1]}</span>
    </div>
  `;

  return el;
}

/**
 * Render final match with special styling
 * @param {Object} match - Match data
 * @param {string} title - Match title
 * @param {boolean} isGold - Is final (gold) match
 * @returns {HTMLElement}
 */
function renderFinalMatch(match, title, isGold) {
  const el = document.createElement('div');
  el.className = `glass-panel rounded-xl overflow-hidden ${isGold ? 'ring-2 ring-primary/50' : ''}`;

  const team1Won = match.score[0] > match.score[1];
  const medalIcon = isGold ? 'workspace_premium' : 'military_tech';
  const medalClass = isGold ? 'medal-gold' : 'medal-bronze';

  el.innerHTML = `
    <div class="bg-slate-900/50 px-4 py-3 border-b border-white/5 flex items-center gap-2">
      <span class="material-symbols-outlined ${medalClass}">${medalIcon}</span>
      <span class="font-bold">${title}</span>
    </div>
    <div class="p-4">
      <div class="flex items-center justify-between mb-3 pb-3 border-b border-white/5">
        <div class="flex items-center gap-3">
          ${team1Won ? `<span class="material-symbols-outlined ${medalClass} text-xl">${medalIcon}</span>` : ''}
          <span class="${team1Won ? 'font-bold text-lg' : 'text-slate-400'}">${match.team1.join(' + ')}</span>
        </div>
        <span class="text-2xl font-bold ${team1Won ? 'text-green-400' : 'text-slate-500'}">${match.score[0]}</span>
      </div>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          ${!team1Won ? `<span class="material-symbols-outlined ${medalClass} text-xl">${medalIcon}</span>` : ''}
          <span class="${!team1Won ? 'font-bold text-lg' : 'text-slate-400'}">${match.team2.join(' + ')}</span>
        </div>
        <span class="text-2xl font-bold ${!team1Won ? 'text-green-400' : 'text-slate-500'}">${match.score[1]}</span>
      </div>
    </div>
  `;

  return el;
}
