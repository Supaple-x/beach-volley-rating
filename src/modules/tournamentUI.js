/**
 * Tournament UI Module - handles rendering of tournament summary page
 * Shows qualification tables, match lists, and playoff brackets
 */

import { formatDate } from '../utils/helpers.js';

let tournamentData = null;
let currentGenderFilter = 'all'; // 'all', 'male', 'female'

// Женские имена (русские)
const FEMALE_NAMES = new Set([
  'Мария', 'Анастасия', 'Юлия', 'Светлана', 'Ольга', 'Анна', 'Наталья', 'Екатерина',
  'Елена', 'Ирина', 'Татьяна', 'Дарья', 'Ксения', 'Евгения', 'Инна', 'Василиса',
  'Жанна', 'Нина', 'Преображенская Ек.', 'Неизвестная Ксения'
]);

/**
 * Определяет пол игрока по имени
 * @param {string} fullName - Полное имя игрока
 * @returns {'male'|'female'} Пол игрока
 */
function getGender(fullName) {
  // Проверяем полное имя
  if (FEMALE_NAMES.has(fullName)) return 'female';

  // Проверяем имя (второе слово обычно)
  const parts = fullName.split(' ');
  const firstName = parts.length > 1 ? parts[1] : parts[0];

  if (FEMALE_NAMES.has(firstName)) return 'female';

  // Эвристика по окончанию имени
  if (firstName.endsWith('а') || firstName.endsWith('я') || firstName.endsWith('ья')) {
    // Исключения для мужских имён на -а/-я
    const maleExceptions = ['Никита', 'Илья', 'Кирилл'];
    if (!maleExceptions.includes(firstName)) return 'female';
  }

  return 'male';
}

/**
 * Рассчитывает очки по итальянской системе
 * @param {number} myScore - Мои очки
 * @param {number} opponentScore - Очки соперника
 * @returns {number} Очки (3/2/1/0)
 */
function getItalianPoints(myScore, opponentScore) {
  const diff = Math.abs(myScore - opponentScore);
  const isBalanced = diff === 2;

  if (myScore > opponentScore) {
    return isBalanced ? 2 : 3; // Победа на балансе или чистая
  } else {
    return isBalanced ? 1 : 0; // Поражение на балансе или чистое
  }
}

/**
 * Рендерит заголовок таблицы с тултипом
 * @param {string} label - Краткое название
 * @param {string} title - Заголовок тултипа
 * @param {string} description - Описание
 * @returns {string} HTML
 */
function renderHeaderWithTooltip(label, title, description) {
  const descriptionHtml = description.replace(/\\n/g, '<br>');
  return `
    <span class="tooltip-trigger inline-flex items-center gap-1 cursor-help">
      ${label}
      <span class="material-symbols-outlined text-[12px] text-slate-500">help</span>
      <span class="tooltip-content normal-case tracking-normal font-normal text-left">
        <span class="tooltip-title">${title}</span>
        <span class="tooltip-text block">${descriptionHtml}</span>
      </span>
    </span>
  `;
}

/**
 * Initialize Tournament UI
 * @param {Object} rawData - Raw tournament data
 */
export function initTournamentUI(rawData) {
  tournamentData = rawData;

  // Устанавливаем заголовок
  document.getElementById('tournament-title').textContent = rawData.tournament;
  document.getElementById('tournament-date').textContent = formatDate(rawData.date);

  // Добавляем фильтр по полу
  renderGenderFilter();

  // Рендерим контент
  renderTournamentContent();
}

// === Сводная таблица рейтинга сезона ===

let seasonRatingData = null;

/**
 * Initialize Season Rating Table
 * @param {Object} data - Season rating data from API
 */
export function initSeasonRating(data) {
  seasonRatingData = data;
  renderSeasonRating();
}

/**
 * Рендерит тултип с детализацией матчей этапа
 * @param {Object} stageData - Данные этапа игрока
 * @returns {string} HTML
 */
function renderStageTooltip(stageData) {
  if (!stageData || stageData.matches.length === 0) return '';

  const rows = stageData.matches.map(m => {
    const resultClass = m.won ? 'text-green-400' : 'text-red-400';
    const stageLabel = m.stage === 'playoff' ? '<span class="text-primary text-[9px]">ПО</span>' : '';
    return `
      <tr class="border-b border-white/10">
        <td class="px-1 py-0.5 text-slate-400 text-[9px]">${stageLabel}</td>
        <td class="px-1 py-0.5 text-[10px]">${m.vs}</td>
        <td class="px-1 py-0.5 text-center ${resultClass}">${m.score}</td>
        <td class="px-1 py-0.5 text-center font-bold text-primary">${m.points}</td>
      </tr>
    `;
  }).join('');

  return `
    <div class="stage-tooltip-content">
      <table class="w-full text-[10px]">
        <thead>
          <tr class="text-slate-500 border-b border-white/20">
            <th class="px-1 py-0.5"></th>
            <th class="px-1 py-0.5 text-left">Соперники</th>
            <th class="px-1 py-0.5 text-center">Счёт</th>
            <th class="px-1 py-0.5 text-center">Очки</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
        <tfoot>
          <tr class="font-bold text-white border-t border-white/30">
            <td colspan="3" class="px-1 py-1">Итого: ${stageData.matches.length} матчей</td>
            <td class="px-1 py-1 text-center text-primary">${stageData.points}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  `;
}

/**
 * Рендерит сводную таблицу рейтинга
 */
function renderSeasonRating() {
  const container = document.getElementById('season-rating');
  if (!container || !seasonRatingData) return;

  // Фильтруем игроков по полу
  const filteredPlayers = seasonRatingData.players.filter(p =>
    currentGenderFilter === 'all' || p.gender === currentGenderFilter
  );

  // Заголовки столбцов (этапы)
  const stageHeaders = seasonRatingData.stages.map(s => {
    const hasData = s.tournamentId !== null;
    return `<th class="px-1 py-2 text-center min-w-[40px] ${hasData ? '' : 'text-slate-600'}">${s.stageNumber || 'Ф'}</th>`;
  }).join('');

  // Строки игроков
  const playerRows = filteredPlayers.map((player, index) => {
    const genderIcon = player.gender === 'female'
      ? '<span class="size-4 rounded-full text-[9px] font-bold flex items-center justify-center bg-pink-500/20 text-pink-400">Ж</span>'
      : '<span class="size-4 rounded-full text-[9px] font-bold flex items-center justify-center bg-blue-500/20 text-blue-400">М</span>';

    // Ячейки с очками по этапам
    const stageCells = seasonRatingData.stages.map(s => {
      const stageKey = s.stageNumber || 'final';
      const stageData = player.stages[stageKey];

      if (!stageData) {
        return '<td class="px-1 py-1.5 text-center text-slate-700">—</td>';
      }

      return `
        <td class="px-1 py-1.5 text-center">
          <span class="stage-tooltip-trigger cursor-help relative inline-block">
            <span class="font-medium text-slate-200 hover:text-primary transition-colors">${stageData.points}</span>
            <span class="stage-tooltip">${renderStageTooltip(stageData)}</span>
          </span>
        </td>
      `;
    }).join('');

    return `
      <tr class="hover:bg-white/5 border-b border-white/5">
        <td class="px-2 py-1.5 text-slate-500 font-bold">${index + 1}</td>
        <td class="px-2 py-1.5 font-medium whitespace-nowrap">
          <span class="inline-flex items-center gap-1">
            ${genderIcon}
            <span class="truncate max-w-[140px]">${player.name}</span>
          </span>
        </td>
        ${stageCells}
        <td class="px-2 py-1.5 text-center font-bold text-primary text-sm">${player.total}</td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <div class="glass-panel rounded-xl overflow-hidden">
      <div class="bg-slate-900/50 px-4 py-3 border-b border-white/5 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-primary">leaderboard</span>
          <h3 class="font-bold text-sm">Рейтинг сезона: <span class="text-xs text-slate-300">${seasonRatingData.season.name}</span></h3>
        </div>
        <span class="text-slate-400 text-sm">${filteredPlayers.length} игроков</span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead>
            <tr class="text-slate-400 text-[10px] uppercase tracking-wider border-b border-white/5 bg-slate-900/30">
              <th class="px-2 py-2 text-left w-8">#</th>
              <th class="px-2 py-2 text-left min-w-[160px]">Игрок</th>
              ${stageHeaders}
              <th class="px-2 py-2 text-center min-w-[50px] text-primary">Σ</th>
            </tr>
          </thead>
          <tbody>
            ${playerRows}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/**
 * Рендерит фильтр по полу
 */
function renderGenderFilter() {
  const filterContainer = document.getElementById('gender-filter');
  if (!filterContainer) return;

  filterContainer.innerHTML = `
    <div class="flex items-center gap-2">
      <span class="text-slate-400 text-sm">Фильтр:</span>
      <button data-gender="all" class="gender-btn px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${currentGenderFilter === 'all' ? 'bg-primary text-background-dark' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}">Все</button>
      <button data-gender="male" class="gender-btn px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${currentGenderFilter === 'male' ? 'bg-primary text-background-dark' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}">
        <span class="hidden sm:inline">Мужчины</span>
        <span class="sm:hidden">М</span>
      </button>
      <button data-gender="female" class="gender-btn px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${currentGenderFilter === 'female' ? 'bg-primary text-background-dark' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}">
        <span class="hidden sm:inline">Женщины</span>
        <span class="sm:hidden">Ж</span>
      </button>
    </div>
  `;

  // Обработчики кликов
  filterContainer.querySelectorAll('.gender-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentGenderFilter = btn.dataset.gender;
      renderGenderFilter();
      renderSeasonRating(); // Обновляем таблицу рейтинга
      renderTournamentContent();
    });
  });
}

/**
 * Рендерит контент турнира
 */
function renderTournamentContent() {
  // Порядок: Первая лига, затем Высшая лига
  const leagues = [...tournamentData.leagues].reverse();

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
  groupsContainer.className = 'grid lg:grid-cols-2 gap-4';

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
 * Calculate standings for a group (Italian scoring system)
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
          gender: getGender(playerName),
          games: 0,
          wins: 0,
          losses: 0,
          italianPoints: 0,
          ballsFor: 0,
          ballsAgainst: 0,
          matchDetails: [] // Детали каждого матча
        });
      }
    });

    // Team 1
    match.team1.forEach(playerName => {
      const p = players.get(playerName);
      const myScore = match.score[0];
      const oppScore = match.score[1];
      const pts = getItalianPoints(myScore, oppScore);
      p.games++;
      if (team1Won) p.wins++; else p.losses++;
      p.italianPoints += pts;
      p.ballsFor += myScore;
      p.ballsAgainst += oppScore;
      p.matchDetails.push({
        id: match.id,
        myScore,
        oppScore,
        won: team1Won,
        diff: Math.abs(myScore - oppScore),
        points: pts
      });
    });

    // Team 2
    match.team2.forEach(playerName => {
      const p = players.get(playerName);
      const myScore = match.score[1];
      const oppScore = match.score[0];
      const pts = getItalianPoints(myScore, oppScore);
      p.games++;
      if (!team1Won) p.wins++; else p.losses++;
      p.italianPoints += pts;
      p.ballsFor += myScore;
      p.ballsAgainst += oppScore;
      p.matchDetails.push({
        id: match.id,
        myScore,
        oppScore,
        won: !team1Won,
        diff: Math.abs(myScore - oppScore),
        points: pts
      });
    });
  });

  // Конвертируем в массив, фильтруем по полу и сортируем
  return Array.from(players.values())
    .filter(p => currentGenderFilter === 'all' || p.gender === currentGenderFilter)
    .map(p => ({
      ...p,
      ballsDiff: p.ballsFor - p.ballsAgainst
    }))
    .sort((a, b) => {
      // Сначала по итальянским очкам, затем по разнице мячей
      if (b.italianPoints !== a.italianPoints) return b.italianPoints - a.italianPoints;
      return b.ballsDiff - a.ballsDiff;
    });
}

/**
 * Рендерит тултип с детальной статистикой игрока
 * @param {Object} player - Данные игрока
 * @returns {string} HTML тултипа
 */
function renderPlayerTooltip(player) {
  const rows = player.matchDetails.map(m => {
    const resultText = m.won ? 'Победа' : 'Поражение';
    const resultClass = m.won ? 'text-green-400' : 'text-red-400';
    const pointsText = m.diff === 2 ? (m.won ? '(на балансе)' : '(на балансе)') : (m.won ? '(чистая)' : '(чистое)');
    return `
      <tr class="border-b border-white/10">
        <td class="px-1 py-0.5 text-slate-500">${m.id}</td>
        <td class="px-1 py-0.5 text-center">${m.myScore}:${m.oppScore}</td>
        <td class="px-1 py-0.5 ${resultClass}">${resultText}</td>
        <td class="px-1 py-0.5 text-center">${m.diff}</td>
        <td class="px-1 py-0.5 text-center font-bold text-primary">${m.points}</td>
      </tr>
    `;
  }).join('');

  return `
    <div class="player-tooltip-content">
      <div class="tooltip-title mb-2">${player.name}</div>
      <table class="w-full text-[10px]">
        <thead>
          <tr class="text-slate-500 border-b border-white/20">
            <th class="px-1 py-0.5 text-left">#</th>
            <th class="px-1 py-0.5 text-center">Счёт</th>
            <th class="px-1 py-0.5 text-left">Результат</th>
            <th class="px-1 py-0.5 text-center">Разн.</th>
            <th class="px-1 py-0.5 text-center">Очки</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
        <tfoot>
          <tr class="font-bold text-white border-t border-white/30">
            <td class="px-1 py-1" colspan="2">Итого: ${player.games} игр</td>
            <td class="px-1 py-1">${player.wins}В/${player.losses}П</td>
            <td class="px-1 py-1 text-center">${player.ballsDiff > 0 ? '+' : ''}${player.ballsDiff}</td>
            <td class="px-1 py-1 text-center text-primary">${player.italianPoints}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  `;
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
  header.className = 'bg-slate-900/50 px-4 py-3 border-b border-white/5';
  header.innerHTML = `
    <h4 class="font-bold">Группа ${group.name}</h4>
    <p class="text-slate-400 text-xs">${group.matches.length} матчей</p>
  `;
  container.appendChild(header);

  // Standings table
  const standings = calculateStandings(group.matches);
  const tableContainer = document.createElement('div');
  tableContainer.innerHTML = `
    <table class="w-full text-xs">
      <thead>
        <tr class="text-slate-400 text-[10px] uppercase tracking-wider border-b border-white/5">
          <th class="px-2 py-2 text-left w-6">#</th>
          <th class="px-2 py-2 text-left">Игрок</th>
          <th class="px-1 py-2 text-center">${renderHeaderWithTooltip('И', 'Игры', 'Количество сыгранных матчей')}</th>
          <th class="px-1 py-2 text-center">${renderHeaderWithTooltip('В', 'Победы', 'Количество выигранных матчей')}</th>
          <th class="px-1 py-2 text-center">${renderHeaderWithTooltip('П', 'Поражения', 'Количество проигранных матчей')}</th>
          <th class="px-1 py-2 text-center font-bold text-primary">${renderHeaderWithTooltip('Очки', 'Итальянская система', '3 — чистая победа (разница > 2)\\n2 — победа на балансе (разница = 2)\\n1 — поражение на балансе\\n0 — чистое поражение')}</th>
          <th class="px-1 py-2 text-center">${renderHeaderWithTooltip('М+', 'Мячи забитые', 'Сумма набранных очков')}</th>
          <th class="px-1 py-2 text-center">${renderHeaderWithTooltip('М-', 'Мячи пропущенные', 'Сумма пропущенных очков')}</th>
          <th class="px-1 py-2 text-center">${renderHeaderWithTooltip('±', 'Разница', 'М+ минус М-')}</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-white/5">
        ${standings.map((p, i) => `
          <tr class="hover:bg-white/5">
            <td class="px-2 py-1.5 text-slate-500 font-bold">${i + 1}</td>
            <td class="px-2 py-1.5 font-medium">
              <span class="player-tooltip-trigger inline-flex items-center gap-1 cursor-help relative">
                <span class="size-4 rounded-full text-[9px] font-bold flex items-center justify-center ${p.gender === 'female' ? 'bg-pink-500/20 text-pink-400' : 'bg-blue-500/20 text-blue-400'}">${p.gender === 'female' ? 'Ж' : 'М'}</span>
                <span class="truncate hover:text-primary transition-colors">${p.name}</span>
                <span class="player-tooltip">${renderPlayerTooltip(p)}</span>
              </span>
            </td>
            <td class="px-1 py-1.5 text-center">${p.games}</td>
            <td class="px-1 py-1.5 text-center text-green-400">${p.wins}</td>
            <td class="px-1 py-1.5 text-center text-red-400">${p.losses}</td>
            <td class="px-1 py-1.5 text-center font-bold text-primary text-sm">${p.italianPoints}</td>
            <td class="px-1 py-1.5 text-center text-slate-300">${p.ballsFor}</td>
            <td class="px-1 py-1.5 text-center text-slate-500">${p.ballsAgainst}</td>
            <td class="px-1 py-1.5 text-center font-bold ${p.ballsDiff > 0 ? 'text-green-400' : p.ballsDiff < 0 ? 'text-red-400' : ''}">${p.ballsDiff > 0 ? '+' : ''}${p.ballsDiff}</td>
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
