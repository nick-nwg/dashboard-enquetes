// --- UTILITIES ---
function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function showLoading(msg) {
  const el = document.getElementById('loadingOverlay');
  el.querySelector('.loading-text').textContent = msg || 'Loading…';
  el.classList.add('visible');
}

function hideLoading() {
  document.getElementById('loadingOverlay').classList.remove('visible');
}

// --- STATE ---
let workbook = null;
let charts = [];
let currentFileName = '';
let tableState = { cols: [], dataRows: [], sortCol: -1, sortDir: 'asc' };