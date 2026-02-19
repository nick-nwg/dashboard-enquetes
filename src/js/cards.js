// --- CARD RENDERING ---
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
        tooltip: { backgroundColor: '#1E2340', padding: 10, cornerRadius: 8,
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
          <span class="donut-legend-swatch" style="background:var(--sage-light)"></span>
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
      datasets: [{ data: [yesCount, noCount], backgroundColor: ['#262E61','#C8E0E8'], borderWidth: 0, spacing: 2 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '68%',
      plugins: { legend: { display: false },
        tooltip: { backgroundColor: '#1E2340', padding: 10, cornerRadius: 8, caretPadding: 10,
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
