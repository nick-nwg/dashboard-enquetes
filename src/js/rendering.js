// --- RENDERING ---
const barColors = ['#C4504A','#D47C3A','#D4A035','#74A68D','#2D6A4F'];
const statusClass = (v, t=4) => v >= t ? 'good' : v >= 3.5 ? 'warning' : 'danger';
const pctStatus = (p, t=80) => p >= t ? 'good' : p >= 60 ? 'warning' : 'danger';

Chart.defaults.font.family = "'IBM Plex Sans', sans-serif";
Chart.defaults.font.size = 12;
Chart.defaults.color = '#7A706A';

function renderDashboard(sheetName, columns, dataRows, headers) {
  // Title
  document.getElementById('dashTitle').textContent = sheetName + ' — Onboarding Survey';
  document.getElementById('dashSubtitle').textContent = (currentFileName ? currentFileName + ' · ' : '') + dataRows.length + ' responses';
  document.getElementById('respondentCount').textContent = dataRows.length;

  const ratingCols = columns.filter(c => c.type === 'rating');
  const ynCols = columns.filter(c => c.type === 'yesno');
  const nameCol = columns.find(c => c.type === 'name');
  const nameIdx = nameCol ? nameCol.index : null;

  // KPIs
  buildKPIs(ratingCols, ynCols);

  // Rating cards
  const ratingGrid = document.getElementById('ratingGrid');
  const ratingSection = document.getElementById('ratingSection');
  ratingGrid.innerHTML = '';
  if (ratingCols.length > 0) {
    ratingSection.style.display = 'block';
    ratingCols.forEach((col, i) => buildRatingCard(col, i, ratingGrid, dataRows, nameIdx));
  } else {
    ratingSection.style.display = 'none';
  }

  // Yes/No cards
  const ynGrid = document.getElementById('ynGrid');
  const ynSection = document.getElementById('ynSection');
  ynGrid.innerHTML = '';
  if (ynCols.length > 0) {
    ynSection.style.display = 'block';
    ynCols.forEach((col, i) => buildYnCard(col, i, ynGrid, dataRows, nameIdx));
  } else {
    ynSection.style.display = 'none';
  }

  // Table
  buildTable(columns, dataRows, headers);
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
    { value: problems, label: 'Attention Areas', cls: problems > 0 ? 'warning' : 'good' },
    { value: best, label: 'Best Score', cls: best !== '—' ? 'good' : '' },
    { value: worst, label: 'Lowest Score', cls: worst !== '—' ? statusClass(worst) : '' }
  ];

  kpis.forEach((k, i) => {
    const el = document.createElement('div');
    el.className = `kpi-item ${k.cls}`;
    el.style.opacity = '0';
    el.style.transform = 'translateY(16px)';
    el.style.animation = `fadeUp 0.5s ease forwards ${i * 0.08}s`;
    el.innerHTML = `<div class="kpi-value">${k.value}</div><div class="kpi-label">${k.label}</div>`;
    strip.appendChild(el);
  });
}

function buildCommentSection(comments, cardId) {
  if (comments.length === 0) return '';
  const count = comments.length;
  const s = count !== 1 ? 's' : '';
  return `
    <button class="card-comments-toggle" onclick="toggleComments('${cardId}', this)">
      <span class="arrow">&#9654;</span>
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

function buildRatingCard(col, index, grid, dataRows, nameIdx) {
  const nums = col.values.map(Number).filter(v => !isNaN(v) && v >= 1 && v <= 5);
  if (!nums.length) return;

  const mean = (nums.reduce((a,b) => a+b, 0) / nums.length).toFixed(1);
  const dist = [0,0,0,0,0];
  nums.forEach(v => dist[v-1]++);
  const cls = statusClass(mean);
  const warn = mean < 4;

  // Collect comments from linked reason/action columns
  const comments = collectComments(col, dataRows, nameIdx, 'rating');
  const commentCount = comments.length;
  const cardId = `rating-comments-${index}`;

  const card = document.createElement('div');
  card.className = 'card';
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
    ${buildCommentSection(comments, cardId)}
  `;
  grid.appendChild(card);

  const ctx = card.querySelector('canvas').getContext('2d');
  const chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['1 — Very poor','2 — Poor','3 — Average','4 — Good','5 — Excellent'],
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
        x: { grid: { display: false }, ticks: { stepSize: 1, font: { size: 11 } }, border: { display: false } },
        y: { grid: { display: false }, ticks: { font: { size: 11 } }, border: { display: false } }
      }
    }
  });
  charts.push(chart);
}

function buildYnCard(col, index, grid, dataRows, nameIdx) {
  const yesCount = col.values.filter(v => /^yes$/i.test(String(v).trim())).length;
  const noCount = col.values.filter(v => /^no$/i.test(String(v).trim())).length;
  const total = yesCount + noCount;
  if (!total) return;

  const pct = (yesCount / total * 100).toFixed(0);
  const cls = pctStatus(pct);
  const warn = pct < 80;

  // Collect comments
  const comments = collectComments(col, dataRows, nameIdx, 'yesno');
  const commentCount = comments.length;
  const cardId = `yn-comments-${index}`;

  const card = document.createElement('div');
  card.className = 'card';
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
  btn.querySelector('.arrow').innerHTML = !isOpen ? '&#9662;' : '&#9654;';
}