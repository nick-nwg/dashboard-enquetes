// --- KPI STRIP ---
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
