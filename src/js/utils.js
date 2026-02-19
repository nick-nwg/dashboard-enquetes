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
let allSheetData = {};
let currentRenderState = null;
let cardSortMode = 'original';

// Multi-file state
let allWorkbooks = {};   // { weekNum: { fileName, workbook, allSheetData } }
let currentWeek = null;

function extractWeekNumber(filename) {
  const m = filename.match(/week\s*[-_]?\s*(\d+)/i);
  return m ? parseInt(m[1]) : null;
}

function selectWeek(weekNum) {
  const entry = allWorkbooks[weekNum];
  if (!entry) return;
  currentWeek = weekNum;
  workbook = entry.workbook;
  currentFileName = entry.fileName;
  allSheetData = entry.allSheetData;
}