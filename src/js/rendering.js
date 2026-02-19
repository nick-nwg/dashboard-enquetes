// --- RENDERING ---
const barColors = ['#CA3725','#E27B0A','#D4A035','#4294A8','#262E61'];
const statusClass = (v, t=4) => v >= t ? 'good' : v >= 3.5 ? 'warning' : 'danger';
const pctStatus = (p, t=80) => p >= t ? 'good' : p >= 60 ? 'warning' : 'danger';

Chart.defaults.font.family = "'Montserrat', sans-serif";
Chart.defaults.font.size = 12;
Chart.defaults.color = '#6B7280';

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
