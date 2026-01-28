/**
 * Rating History Chart - SVG-based line chart
 */

const CHART_CONFIG = {
  padding: { top: 20, right: 20, bottom: 30, left: 50 },
  colors: {
    line: '#38bdf8',       // accent-blue
    point: '#38bdf8',
    pointHover: '#f27f0d', // primary orange
    grid: '#334155',       // slate-700
    text: '#94a3b8',       // slate-400
    baseline: '#22c55e'    // green-500
  },
  pointRadius: 4,
  pointRadiusHover: 6
};

/**
 * Create SVG element with proper namespace
 * @param {string} tag - SVG element tag
 * @param {Object} attrs - Attributes to set
 * @returns {SVGElement}
 */
function createSvgElement(tag, attrs = {}) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.entries(attrs).forEach(([key, value]) => {
    el.setAttribute(key, value);
  });
  return el;
}

/**
 * Calculate chart dimensions
 * @param {HTMLElement} container - Container element
 * @returns {Object} Dimensions
 */
function getChartDimensions(container) {
  const rect = container.getBoundingClientRect();
  const width = rect.width || 600;
  const height = rect.height || 200;

  return {
    width,
    height,
    innerWidth: width - CHART_CONFIG.padding.left - CHART_CONFIG.padding.right,
    innerHeight: height - CHART_CONFIG.padding.top - CHART_CONFIG.padding.bottom
  };
}

/**
 * Calculate scale for data
 * @param {Array} data - Rating history data
 * @param {Object} dimensions - Chart dimensions
 * @returns {Object} Scale functions
 */
function calculateScale(data, dimensions) {
  const ratings = data.map(d => d.rating);
  const minRating = Math.min(...ratings);
  const maxRating = Math.max(...ratings);

  // Add padding to rating range
  const ratingPadding = Math.max(20, (maxRating - minRating) * 0.1);
  const yMin = Math.floor((minRating - ratingPadding) / 10) * 10;
  const yMax = Math.ceil((maxRating + ratingPadding) / 10) * 10;

  return {
    x: (index) => CHART_CONFIG.padding.left + (index / (data.length - 1)) * dimensions.innerWidth,
    y: (rating) => CHART_CONFIG.padding.top + dimensions.innerHeight - ((rating - yMin) / (yMax - yMin)) * dimensions.innerHeight,
    yMin,
    yMax
  };
}

/**
 * Create grid lines
 * @param {SVGElement} svg - SVG element
 * @param {Object} dimensions - Chart dimensions
 * @param {Object} scale - Scale object
 */
function createGrid(svg, dimensions, scale) {
  const gridGroup = createSvgElement('g', { class: 'chart-grid' });

  // Horizontal grid lines (rating values)
  const yStep = Math.ceil((scale.yMax - scale.yMin) / 5 / 10) * 10;
  for (let rating = scale.yMin; rating <= scale.yMax; rating += yStep) {
    const y = scale.y(rating);

    // Grid line
    const line = createSvgElement('line', {
      x1: CHART_CONFIG.padding.left,
      y1: y,
      x2: dimensions.width - CHART_CONFIG.padding.right,
      y2: y,
      stroke: CHART_CONFIG.colors.grid,
      'stroke-width': 1,
      'stroke-dasharray': '4,4'
    });
    gridGroup.appendChild(line);

    // Y-axis label
    const label = createSvgElement('text', {
      x: CHART_CONFIG.padding.left - 10,
      y: y + 4,
      fill: CHART_CONFIG.colors.text,
      'font-size': '12',
      'text-anchor': 'end'
    });
    label.textContent = rating;
    gridGroup.appendChild(label);
  }

  // Baseline at 1500
  const baselineY = scale.y(1500);
  if (baselineY >= CHART_CONFIG.padding.top && baselineY <= dimensions.height - CHART_CONFIG.padding.bottom) {
    const baseline = createSvgElement('line', {
      x1: CHART_CONFIG.padding.left,
      y1: baselineY,
      x2: dimensions.width - CHART_CONFIG.padding.right,
      y2: baselineY,
      stroke: CHART_CONFIG.colors.baseline,
      'stroke-width': 1,
      'stroke-dasharray': '8,4',
      opacity: 0.5
    });
    gridGroup.appendChild(baseline);
  }

  svg.appendChild(gridGroup);
}

/**
 * Create line path
 * @param {Array} data - Rating history data
 * @param {Object} scale - Scale object
 * @returns {string} SVG path d attribute
 */
function createLinePath(data, scale) {
  return data.map((d, i) => {
    const x = scale.x(i);
    const y = scale.y(d.rating);
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');
}

/**
 * Render rating history chart
 * @param {HTMLElement} container - Container element
 * @param {Array} ratingHistory - Array of rating history entries
 */
export function renderChart(container, ratingHistory) {
  // Clear existing content
  container.innerHTML = '';

  // Need at least 2 points to draw a line
  if (!ratingHistory || ratingHistory.length < 2) {
    container.innerHTML = '<p style="color: #64748b; text-align: center; padding: 20px;">Недостаточно данных для графика</p>';
    return;
  }

  // Wait for container to be visible and have dimensions
  requestAnimationFrame(() => {
    renderChartContent(container, ratingHistory);
  });
}

/**
 * Actually render the chart content
 */
function renderChartContent(container, ratingHistory) {
  // Use fixed viewBox dimensions for consistent rendering
  const viewWidth = 500;
  const viewHeight = 180;
  const dimensions = {
    width: viewWidth,
    height: viewHeight,
    innerWidth: viewWidth - CHART_CONFIG.padding.left - CHART_CONFIG.padding.right,
    innerHeight: viewHeight - CHART_CONFIG.padding.top - CHART_CONFIG.padding.bottom
  };

  const scale = calculateScale(ratingHistory, dimensions);

  // Create SVG with responsive sizing
  const svg = createSvgElement('svg', {
    viewBox: `0 0 ${viewWidth} ${viewHeight}`,
    preserveAspectRatio: 'xMidYMid meet',
    style: 'width: 100%; height: 100%;'
  });

  // Create grid
  createGrid(svg, dimensions, scale);

  // Create line
  const linePath = createLinePath(ratingHistory, scale);
  const line = createSvgElement('path', {
    d: linePath,
    fill: 'none',
    stroke: CHART_CONFIG.colors.line,
    'stroke-width': 2,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round'
  });
  svg.appendChild(line);

  // Create points
  const pointsGroup = createSvgElement('g', { class: 'chart-points' });
  ratingHistory.forEach((d, i) => {
    const x = scale.x(i);
    const y = scale.y(d.rating);

    const point = createSvgElement('circle', {
      cx: x,
      cy: y,
      r: CHART_CONFIG.pointRadius,
      fill: CHART_CONFIG.colors.point,
      cursor: 'pointer'
    });

    // Hover effects
    point.addEventListener('mouseenter', () => {
      point.setAttribute('r', CHART_CONFIG.pointRadiusHover);
      point.setAttribute('fill', CHART_CONFIG.colors.pointHover);
    });

    point.addEventListener('mouseleave', () => {
      point.setAttribute('r', CHART_CONFIG.pointRadius);
      point.setAttribute('fill', CHART_CONFIG.colors.point);
    });

    // Tooltip data
    point.dataset.rating = d.rating;
    point.dataset.change = d.change;
    point.dataset.matchId = d.matchId || '';

    pointsGroup.appendChild(point);
  });
  svg.appendChild(pointsGroup);

  // X-axis labels (game numbers)
  const xLabelsGroup = createSvgElement('g', { class: 'chart-x-labels' });
  const labelStep = Math.ceil(ratingHistory.length / 8);
  ratingHistory.forEach((d, i) => {
    if (i % labelStep === 0 || i === ratingHistory.length - 1) {
      const x = scale.x(i);
      const label = createSvgElement('text', {
        x: x,
        y: dimensions.height - 8,
        fill: CHART_CONFIG.colors.text,
        'font-size': '11',
        'text-anchor': 'middle'
      });
      label.textContent = i === 0 ? 'Старт' : `#${i}`;
      xLabelsGroup.appendChild(label);
    }
  });
  svg.appendChild(xLabelsGroup);

  container.appendChild(svg);
}

export default { renderChart };
