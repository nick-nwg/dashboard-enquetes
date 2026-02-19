// --- RENDERING ---
const barColors = ['#C4504A','#D47C3A','#D4A035','#74A68D','#2D6A4F'];
const statusClass = (v, t=4) => v >= t ? 'good' : v >= 3.5 ? 'warning' : 'danger';
const pctStatus = (p, t=80) => p >= t ? 'good' : p >= 60 ? 'warning' : 'danger';

Chart.defaults.font.family = "'IBM Plex Sans', sans-serif";
Chart.defaults.font.size = 12;
Chart.defaults.color = '#7A706A';

function renderDashboard(sheetName, columns, dataRows, headers) {
  currentRenderState = { sheetName, columns, dataRows, headers };

  // Title
  const titlePrefix = currentWeek ? 'Week ' + currentWeek + ' — ' : '';
  document.getElementById('dashTitle').textContent = titlePrefix + sheetName;
  document.getElementById('dashSubtitle').textContent = (currentFileName ? currentFileName + ' · ' : '') + dataRows.length + ' respondenten';
  document.getElementById('respondentCount').textContent = dataRows.length;

  const ratingCols = columns.filter(c => c.type === 'rating');
  const ynCols = columns.filter(c => c.type === 'yesno');
  const nameCol = columns.find(c => c.type === 'name');
  const nameIdx = nameCol ? nameCol.index : null;

  // KPIs
  buildKPIs(ratingCols, ynCols);

  // Sort columns if needed
  let sortedRating = [...ratingCols];
  let sortedYn = [...ynCols];
  if (cardSortMode === 'worst') {
    sortedRating.sort((a, b) => {
      const avgA = a.values.map(Number).filter(v => !isNaN(v) && v >= 1 && v <= 5);
      const avgB = b.values.map(Number).filter(v => !isNaN(v) && v >= 1 && v <= 5);
      const mA = avgA.length ? avgA.reduce((s,v) => s+v, 0) / avgA.length : 5;
      const mB = avgB.length ? avgB.reduce((s,v) => s+v, 0) / avgB.length : 5;
      return mA - mB;
    });
    sortedYn.sort((a, b) => {
      const pctA = (() => { const y = a.values.filter(v => /^yes$/i.test(String(v).trim())).length; const t = a.values.filter(v => /^(yes|no)$/i.test(String(v).trim())).length; return t ? y/t*100 : 100; })();
      const pctB = (() => { const y = b.values.filter(v => /^yes$/i.test(String(v).trim())).length; const t = b.values.filter(v => /^(yes|no)$/i.test(String(v).trim())).length; return t ? y/t*100 : 100; })();
      return pctA - pctB;
    });
  }

  // Rating cards
  const ratingGrid = document.getElementById('ratingGrid');
  const ratingSection = document.getElementById('ratingSection');
  ratingGrid.innerHTML = '';
  if (sortedRating.length > 0) {
    ratingSection.style.display = 'block';
    // Pre-calculate global max for consistent x-axes across all rating charts
    let ratingMax = 0;
    sortedRating.forEach(col => {
      const nums = col.values.map(Number).filter(v => !isNaN(v) && v >= 1 && v <= 5);
      const dist = [0,0,0,0,0];
      nums.forEach(v => dist[v-1]++);
      ratingMax = Math.max(ratingMax, ...dist);
    });
    sortedRating.forEach((col, i) => buildRatingCard(col, i, ratingGrid, dataRows, nameIdx, ratingMax, sheetName));
  } else {
    ratingSection.style.display = 'none';
  }

  // Yes/No cards
  const ynGrid = document.getElementById('ynGrid');
  const ynSection = document.getElementById('ynSection');
  ynGrid.innerHTML = '';
  if (sortedYn.length > 0) {
    ynSection.style.display = 'block';
    sortedYn.forEach((col, i) => buildYnCard(col, i, ynGrid, dataRows, nameIdx, sheetName));
  } else {
    ynSection.style.display = 'none';
  }

  // Update sort toggle state
  updateSortToggles();

  // Table
  buildTable(columns, dataRows, headers);

  // Render Lucide icons in dynamically created elements
  lucide.createIcons();
}

function buildKPIs(ratingCols, ynCols) {
  const strip = document.getElementById('kpiStrip');
  strip.innerHTML = '';

  const allRatings = ratingCols.flatMap(c => c.values.map(Number).filter(v => !isNaN(v) && v >= 1 && v <= 5));
  const overallAvg = allRatings.length ? (allRatings.reduce((a,b) => a+b, 0) / allRatings.length).toFixed(1) : '—';

  const allYesCount = ynCols.reduce((s,c) => s + c.values.filter(v => /^yes$/i.test(String(v).trim())).length, 0);
  const allYnTotal = ynCols.reduce((s,c) => s + c.values.filter(v => /^(yes|no)$/i.test(String(v).trim())).length, 0);
  const ynPct = allYnTotal ? (allYesCount / allYnTotal * 100).toFixed(0) : '—';

  const problems = ratingCols.filter(c => {
    const nums = c.values.map(Number).filter(v => !isNaN(v));
    return nums.length && (nums.reduce((a,b)=>a+b,0)/nums.length) < 4;
  }).length + ynCols.filter(c => {
    const yes = c.values.filter(v => /^yes$/i.test(String(v).trim())).length;
    const total = c.values.filter(v => /^(yes|no)$/i.test(String(v).trim())).length;
    return total && (yes/total*100) < 80;
  }).length;

  let best = '—', worst = '—';
  if (ratingCols.length) {
    const avgs = ratingCols.map(c => {
      const nums = c.values.map(Number).filter(v => !isNaN(v));
      return nums.length ? nums.reduce((a,b)=>a+b,0)/nums.length : 0;
    });
    best = Math.max(...avgs).toFixed(1);
    worst = Math.min(...avgs).toFixed(1);
  }

  const kpis = [
    { value: overallAvg, label: 'Overall Average', cls: overallAvg !== '—' ? statusClass(overallAvg) : '' },
    { value: ynPct !== '—' ? ynPct + '%' : '—', label: 'Process Clarity', cls: ynPct !== '—' ? pctStatus(ynPct) : '' },
    { value: problems > 0 ? problems : '&#10003;', label: problems > 0 ? 'Attention Areas' : 'All Clear', cls: problems > 0 ? 'warning' : 'good', clickable: problems > 0 },
    { value: best, label: 'Best Score', cls: best !== '—' ? 'good' : '' },
    { value: worst, label: 'Lowest Score', cls: worst !== '—' ? statusClass(worst) : '' }
  ];

  kpis.forEach((k, i) => {
    const el = document.createElement('div');
    el.className = `kpi-item ${k.cls}`;
    el.style.animation = `fadeUp 0.5s ease ${i * 0.08}s both`;
    el.innerHTML = `<div class="kpi-value">${k.value}</div><div class="kpi-label">${k.label}</div>`;
    if (k.clickable) {
      el.style.cursor = 'pointer';
      el.title = 'Click to see attention areas';
      el.onclick = scrollToFlagged;
    }
    strip.appendChild(el);
  });
}

function buildTrendHtml(trend) {
  if (!trend) return '';
  const iconName = trend.direction === 'up' ? 'trending-up' : trend.direction === 'down' ? 'trending-down' : 'minus';
  return `<div class="card-trend trend-${trend.direction}">
    <i data-lucide="${iconName}"></i>
    <span>${trend.diff} from ${esc(trend.prevSheet)}</span>
  </div>`;
}

function buildCommentSection(comments, cardId) {
  if (comments.length === 0) return '';
  const count = comments.length;
  const s = count !== 1 ? 's' : '';
  return `
    <button class="card-comments-toggle" onclick="toggleComments('${cardId}', this)">
      <i data-lucide="chevron-right" class="arrow"></i>
      <span class="toggle-label">${count} comment${s} / reason${s}</span>
    </button>
    <div class="card-comments" id="${cardId}">
      <div class="card-comments-list">${comments.map(c => `
        <div class="comment-item">
          <span class="comment-name">${esc(c.name)}</span>
          ${c.badge ? `<span class="comment-badge ${c.badgeCls}">${esc(c.badge)}</span>` : ''}
          <div class="comment-texts">
            ${c.reason ? `<div class="comment-reason">${esc(c.reason)}</div>` : ''}
            ${c.action ? `<div class="comment-action">${esc(c.action)}</div>` : ''}
          </div>
        </div>`).join('')}
      </div>
    </div>`;
}

function buildRatingCard(col, index, grid, dataRows, nameIdx, ratingMax, sheetName) {
  const nums = col.values.map(Number).filter(v => !isNaN(v) && v >= 1 && v <= 5);
  if (!nums.length) return;

  const mean = (nums.reduce((a,b) => a+b, 0) / nums.length).toFixed(1);
  const dist = [0,0,0,0,0];
  nums.forEach(v => dist[v-1]++);
  const cls = statusClass(mean);
  const warn = mean < 4;

  // Collect comments from linked reason/action columns
  const comments = collectComments(col, dataRows, nameIdx, 'rating');
  const cardId = `rating-comments-${index}`;

  // Trend
  const trend = getTrend(col.header, sheetName, 'rating');

  const card = document.createElement('div');
  card.className = 'card' + (warn ? ' card-flagged' : '');
  card.style.animationDelay = (index * 0.06) + 's';
  card.innerHTML = `
    <div class="card-header">
      <div class="card-title">${esc(col.header)}</div>
      <div class="card-metric">
        ${warn ? '<div class="warning-dot"></div>' : ''}
        <div class="value ${cls}">${mean}</div>
      </div>
    </div>
    <div class="card-chart"><canvas></canvas></div>
    ${buildTrendHtml(trend)}
    ${buildCommentSection(comments, cardId)}
  `;
  grid.appendChild(card);

  const ctx = card.querySelector('canvas').getContext('2d');
  const chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['1','2','3','4','5'],
      datasets: [{ data: dist, backgroundColor: barColors, borderRadius: 6, borderSkipped: false, barThickness: 22 }]
    },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false },
        tooltip: { backgroundColor: '#2C2520', padding: 10, cornerRadius: 8,
          callbacks: { label: c => `${c.raw} respondent${c.raw !== 1 ? 's' : ''}` }
        }
      },
      scales: {
        x: { grid: { display: false }, max: ratingMax, ticks: { stepSize: 1, font: { size: 11 } }, border: { display: false } },
        y: { grid: { display: false }, ticks: { font: { size: 11 } }, border: { display: false } }
      }
    }
  });
  charts.push(chart);
}

function buildYnCard(col, index, grid, dataRows, nameIdx, sheetName) {
  const yesCount = col.values.filter(v => /^yes$/i.test(String(v).trim())).length;
  const noCount = col.values.filter(v => /^no$/i.test(String(v).trim())).length;
  const total = yesCount + noCount;
  if (!total) return;

  const pct = (yesCount / total * 100).toFixed(0);
  const cls = pctStatus(pct);
  const warn = pct < 80;

  // Collect comments
  const comments = collectComments(col, dataRows, nameIdx, 'yesno');
  const cardId = `yn-comments-${index}`;

  // Trend
  const trend = getTrend(col.header, sheetName, 'yesno');

  const card = document.createElement('div');
  card.className = 'card' + (warn ? ' card-flagged' : '');
  card.style.animationDelay = (index * 0.06) + 's';
  card.innerHTML = `
    <div class="card-header">
      <div class="card-title">${esc(col.header)}</div>
      <div class="card-metric">
        ${warn ? '<div class="warning-dot"></div>' : ''}
        <div class="value ${cls}">${pct}%</div>
      </div>
    </div>
    <div class="card-chart donut">
      <div class="donut-wrapper"><canvas></canvas>
        <div class="donut-center-label">
          <div class="pct ${cls}">${yesCount}/${total}</div>
          <div class="lbl">Yes</div>
        </div>
      </div>
      <div class="donut-legend">
        <div class="donut-legend-row">
          <span class="donut-legend-swatch" style="background:var(--deep-green)"></span>
          Yes: <strong style="color:var(--text)">${yesCount}</strong>
        </div>
        <div class="donut-legend-row">
          <span class="donut-legend-swatch" style="background:var(--terracotta-light)"></span>
          No: <strong style="color:var(--text)">${noCount}</strong>
        </div>
      </div>
    </div>
    ${buildTrendHtml(trend)}
    ${buildCommentSection(comments, cardId)}
  `;
  grid.appendChild(card);

  const ctx = card.querySelector('canvas').getContext('2d');
  const chart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Yes','No'],
      datasets: [{ data: [yesCount, noCount], backgroundColor: ['#2D6A4F','#E8A491'], borderWidth: 0, spacing: 2 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '68%',
      plugins: { legend: { display: false },
        tooltip: { backgroundColor: '#2C2520', padding: 10, cornerRadius: 8, caretPadding: 10,
          callbacks: {
            title: () => '',
            label: c => ` ${c.label}: ${c.raw} (${(c.raw/total*100).toFixed(0)}%)`
          }
        }
      }
    }
  });
  charts.push(chart);
}

function collectComments(col, dataRows, nameIdx, type) {
  const comments = [];
  dataRows.forEach(row => {
    const reason = col.reasonIndex !== null ? String(row[col.reasonIndex] ?? '').trim() : '';
    const action = col.actionIndex !== null ? String(row[col.actionIndex] ?? '').trim() : '';
    if (!reason && !action) return;

    const name = nameIdx !== null ? String(row[nameIdx] ?? '').trim() : 'Unknown';
    const val = row[col.index];
    let badge = null, badgeCls = '';

    if (type === 'rating') {
      const num = Number(val);
      if (!isNaN(num) && num <= 3) {
        badge = num + '/5';
        badgeCls = num <= 2 ? 'low' : 'mid';
      }
    } else if (type === 'yesno') {
      const yn = String(val ?? '').trim().toLowerCase();
      if (yn === 'no') { badge = 'No'; badgeCls = 'no'; }
    }

    comments.push({ name, reason, action, badge, badgeCls });
  });
  return comments;
}

function toggleComments(id, btn) {
  const el = document.getElementById(id);
  const isOpen = el.classList.contains('open');

  if (isOpen) {
    el.style.maxHeight = el.scrollHeight + 'px';
    el.offsetHeight;
    el.style.maxHeight = '0';
    el.classList.remove('open');
  } else {
    el.style.maxHeight = el.scrollHeight + 'px';
    el.classList.add('open');
    el.addEventListener('transitionend', function handler() {
      if (el.classList.contains('open')) el.style.maxHeight = 'none';
      el.removeEventListener('transitionend', handler);
    });
  }

  btn.classList.toggle('open', !isOpen);
}

function scrollToFlagged() {
  const flagged = document.querySelectorAll('.card-flagged');
  if (flagged.length) {
    flagged[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    flagged.forEach(card => {
      card.classList.add('highlight');
      setTimeout(() => card.classList.remove('highlight'), 2000);
    });
  }
}

function toggleCardSort() {
  cardSortMode = cardSortMode === 'original' ? 'worst' : 'original';
  if (currentRenderState) {
    renderDashboard(currentRenderState.sheetName, currentRenderState.columns,
      currentRenderState.dataRows, currentRenderState.headers);
  }
}

function updateSortToggles() {
  document.querySelectorAll('.sort-toggle').forEach(btn => {
    btn.classList.toggle('active', cardSortMode === 'worst');
    const label = btn.querySelector('.sort-toggle-label');
    if (label) label.textContent = cardSortMode === 'worst' ? 'Original order' : 'Worst first';
  });
}
