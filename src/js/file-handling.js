// --- FILE HANDLING ---
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');

dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', e => { if (e.target.files.length) handleFile(e.target.files[0]); });

function handleFile(file) {
  currentFileName = file.name;
  showLoading('Parsing ' + file.name + '…');
  const reader = new FileReader();
  reader.onload = e => {
    const data = new Uint8Array(e.target.result);
    setTimeout(() => {
      try {
        workbook = XLSX.read(data, { type: 'array', cellDates: true });
        hideLoading();
        showSheetSelector();
      } catch (err) {
        hideLoading();
        alert('Error reading file: ' + err.message);
      }
    }, 50);
  };
  reader.readAsArrayBuffer(file);
}

function showSheetSelector() {
  const sel = document.getElementById('sheetSelector');
  sel.innerHTML = '';
  workbook.SheetNames.forEach(name => {
    const btn = document.createElement('button');
    btn.className = 'sheet-btn';
    btn.textContent = name;
    btn.onclick = () => {
      sel.querySelectorAll('.sheet-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadSheet(name);
    };
    sel.appendChild(btn);
  });
}

function renderDashboardSheets(currentSheet) {
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
}