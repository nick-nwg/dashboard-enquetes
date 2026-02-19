// --- FILE HANDLING ---
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');

dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
});
fileInput.addEventListener('change', e => { if (e.target.files.length) handleFiles(e.target.files); });

function handleFiles(fileList) {
  const files = Array.from(fileList);
  let pending = files.length;

  showLoading('Bestanden laden (' + pending + ')…');

  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      const data = new Uint8Array(e.target.result);
      try {
        const wb = XLSX.read(data, { type: 'array', cellDates: true });
        const weekNum = extractWeekNumber(file.name);
        if (weekNum !== null) {
          registerWorkbook(weekNum, file.name, wb);
          pending--;
          if (pending === 0) { hideLoading(); showUploadSummary(); }
        } else {
          hideLoading();
          promptWeekNumber(file.name, wb, () => {
            pending--;
            if (pending === 0) showUploadSummary();
          });
        }
      } catch (err) {
        pending--;
        if (pending === 0) hideLoading();
        alert('Fout bij lezen van ' + file.name + ': ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

function registerWorkbook(weekNum, fileName, wb) {
  // Temporarily set globals so processAllSheets() works
  const prevWb = workbook;
  const prevSheetData = allSheetData;
  const prevFileName = currentFileName;

  workbook = wb;
  allSheetData = {};
  currentFileName = fileName;
  processAllSheets();

  allWorkbooks[weekNum] = {
    fileName: fileName,
    workbook: wb,
    allSheetData: { ...allSheetData }
  };

  // Restore globals
  workbook = prevWb;
  allSheetData = prevSheetData;
  currentFileName = prevFileName;
}

function promptWeekNumber(fileName, wb, callback) {
  const overlay = document.createElement('div');
  overlay.className = 'week-prompt-overlay';
  overlay.innerHTML = `
    <div class="week-prompt-modal">
      <h3>Weeknummer niet gevonden</h3>
      <p>Bestand: <strong>${esc(fileName)}</strong></p>
      <p>Voer het weeknummer in voor dit bestand:</p>
      <input type="number" class="week-prompt-input" min="1" max="53" placeholder="bijv. 3" autofocus>
      <div class="week-prompt-actions">
        <button class="week-prompt-skip">Overslaan</button>
        <button class="week-prompt-ok">OK</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const input = overlay.querySelector('.week-prompt-input');
  const okBtn = overlay.querySelector('.week-prompt-ok');
  const skipBtn = overlay.querySelector('.week-prompt-skip');

  function finish(weekNum) {
    if (weekNum) registerWorkbook(weekNum, fileName, wb);
    overlay.remove();
    callback();
  }

  okBtn.onclick = () => {
    const val = parseInt(input.value);
    if (!val || val < 1 || val > 53) { input.focus(); return; }
    finish(val);
  };

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') okBtn.click();
  });

  skipBtn.onclick = () => finish(null);
}

function showUploadSummary() {
  const container = document.getElementById('uploadSummary');
  const weeks = Object.keys(allWorkbooks).map(Number).sort((a, b) => a - b);

  if (weeks.length === 0) {
    container.innerHTML = '';
    return;
  }

  let html = '<div class="upload-summary">';
  html += '<h2 class="upload-summary-heading">Geladen bestanden</h2>';
  html += '<div class="upload-file-list">';

  weeks.forEach(w => {
    const entry = allWorkbooks[w];
    const sheetCount = entry.workbook.SheetNames.length;
    html += `<div class="upload-file-item">
      <div class="upload-file-info">
        <span class="upload-file-week">Week ${w}</span>
        <span class="upload-file-name">${esc(entry.fileName)}</span>
        <span class="upload-file-sheets">${sheetCount} sheet${sheetCount !== 1 ? 's' : ''}</span>
      </div>
      <button class="upload-file-remove" onclick="removeWorkbook(${w})">&#10005;</button>
    </div>`;
  });

  html += '</div>';
  html += '<button class="upload-open-btn" onclick="openDashboard()">Dashboard openen</button>';
  html += '</div>';

  container.innerHTML = html;
}

function removeWorkbook(weekNum) {
  delete allWorkbooks[weekNum];
  if (currentWeek === weekNum) currentWeek = null;
  showUploadSummary();
}

function openDashboard() {
  const weeks = Object.keys(allWorkbooks).map(Number).sort((a, b) => a - b);
  if (weeks.length === 0) return;

  // Select first week
  selectWeek(weeks[0]);
  // Pick first sheet that has data, fall back to first sheet
  const firstSheet = workbook.SheetNames.find(name => allSheetData[name]) || workbook.SheetNames[0];
  loadSheet(firstSheet);
}

function renderDashboardSheets(currentSheet) {
  const weeks = Object.keys(allWorkbooks).map(Number).sort((a, b) => a - b);

  // Week tabs (only if >1 week)
  const weekContainer = document.getElementById('weekTabs');
  weekContainer.innerHTML = '';
  if (weeks.length > 1) {
    weekContainer.style.display = 'flex';
    weeks.forEach(w => {
      const btn = document.createElement('button');
      btn.className = 'week-btn' + (w === currentWeek ? ' active' : '');
      btn.textContent = 'Week ' + w;
      btn.onclick = () => {
        selectWeek(w);
        const first = workbook.SheetNames.find(n => allSheetData[n]) || workbook.SheetNames[0];
        loadSheet(first);
      };
      weekContainer.appendChild(btn);
    });
  } else {
    weekContainer.style.display = 'none';
  }

  // Sheet tabs
  const container = document.getElementById('dashboardSheets');
  container.innerHTML = '';
  workbook.SheetNames.forEach(name => {
    const btn = document.createElement('button');
    btn.className = 'sheet-btn' + (name === currentSheet ? ' active' : '');
    btn.textContent = name;
    btn.onclick = () => loadSheet(name);
    container.appendChild(btn);
  });
}

function showUpload() {
  document.getElementById('uploadScreen').style.display = 'flex';
  document.getElementById('dashboard').style.display = 'none';
  // Show summary if files are already loaded
  if (Object.keys(allWorkbooks).length > 0) {
    showUploadSummary();
  }
}
