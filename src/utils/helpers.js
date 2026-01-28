/**
 * Helper utility functions
 */

/**
 * Format date to locale string
 * @param {string} dateStr - Date string (YYYY-MM-DD)
 * @returns {string} Formatted date
 */
export function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

/**
 * Format rating change with sign
 * @param {number} change - Rating change
 * @returns {string} Formatted change string
 */
export function formatRatingChange(change) {
  if (change > 0) return `+${change}`;
  if (change < 0) return `${change}`;
  return '0';
}

/**
 * Get trend class based on change
 * @param {number} change - Rating change
 * @returns {string} CSS class
 */
export function getTrendClass(change) {
  if (change > 0) return 'trend--up';
  if (change < 0) return 'trend--down';
  return 'trend--neutral';
}

/**
 * Get rank badge class based on position
 * @param {number} rank - Player's rank (1-based)
 * @returns {string} CSS class
 */
export function getRankBadgeClass(rank) {
  switch (rank) {
    case 1: return 'rank-badge--gold';
    case 2: return 'rank-badge--silver';
    case 3: return 'rank-badge--bronze';
    default: return 'rank-badge--default';
  }
}

/**
 * Get trend arrow
 * @param {number} change - Rating change
 * @returns {string} Arrow character
 */
export function getTrendArrow(change) {
  if (change > 0) return '↑';
  if (change < 0) return '↓';
  return '—';
}

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Create element with classes and attributes
 * @param {string} tag - HTML tag name
 * @param {Object} options - Options object
 * @returns {HTMLElement} Created element
 */
export function createElement(tag, options = {}) {
  const element = document.createElement(tag);

  if (options.className) {
    element.className = options.className;
  }

  if (options.textContent) {
    element.textContent = options.textContent;
  }

  if (options.innerHTML) {
    element.innerHTML = options.innerHTML;
  }

  if (options.attributes) {
    Object.entries(options.attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
  }

  if (options.children) {
    options.children.forEach(child => {
      element.appendChild(child);
    });
  }

  return element;
}
