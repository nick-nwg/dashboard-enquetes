// --- SHEET PARSING ---
function loadSheet(sheetName) {
  // Destroy existing charts
  charts.forEach(c => c.destroy());
  charts = [];

  const ws = workbook.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  if (raw.length < 2) return alert('Sheet has no data rows.');

  // Find the header row (first row with actual question text)
  // Some sheets have a second sub-header row with scale descriptions
  const headerRow = raw[0];

  // Detect if row 1 is a sub-header (contains scale descriptions like "1 - very poor...")
  let dataStartRow = 1;
  if (raw.length > 1) {
    const secondRow = raw[1];
    const isSubHeader = secondRow.some(cell =>
      typeof cell === 'string' && /\d\s*-\s*(very\s+)?poor/i.test(cell)
    );
    if (isSubHeader) dataStartRow = 2;
  }

  const dataRows = raw.slice(dataStartRow).filter(row =>
    row.some(cell => cell !== '' && cell !== null && cell !== undefined)
  );

  if (dataRows.length === 0) return alert('No data found in this sheet.');

  // Classify columns
  const columns = classifyColumns(headerRow, dataRows);

  // Build dashboard
  document.getElementById('uploadScreen').style.display = 'none';
  document.getElementById('dashboard').style.display = 'block';

  // Sync sheet selectors
  document.querySelectorAll('#sheetSelector .sheet-btn').forEach(btn => {
    btn.classList.toggle('active', btn.textContent === sheetName);
  });
  renderDashboardSheets(sheetName);

  renderDashboard(sheetName, columns, dataRows, headerRow);
}

function classifyColumns(headers, dataRows) {
  const columns = [];
  let lastQuestionCol = null;

  headers.forEach((header, i) => {
    if (!header || typeof header !== 'string') return;
    const h = header.trim();

    // Link clarification columns to the last question
    if (/^If the answer/i.test(h)) {
      if (lastQuestionCol) lastQuestionCol.reasonIndex = i;
      return;
    }
    if (/^Actions taken/i.test(h)) {
      if (lastQuestionCol) lastQuestionCol.actionIndex = i;
      return;
    }
    if (/^Share this/i.test(h)) return;

    // Collect non-empty values from data rows for this column
    const values = dataRows.map(row => row[i]).filter(v => v !== '' && v !== null && v !== undefined);
    if (values.length === 0) return;

    // Detect column type
    const type = detectType(h, values);
    const col = { index: i, header: cleanHeader(h), type, values, reasonIndex: null, actionIndex: null };
    columns.push(col);

    // Track last question column for linking reason/action columns
    if (type === 'rating' || type === 'yesno') lastQuestionCol = col;
  });

  return columns;
}

function detectType(header, values) {
  const h = header.toLowerCase();

  // Known metadata columns
  if (/start\s*day/i.test(h) || /date\s*of\s*form/i.test(h)) return 'date';
  if (/name.*employee/i.test(h)) return 'name';
  if (/name.*client/i.test(h)) return 'client';
  if (/job\s*coach/i.test(h)) return 'coach';

  // Check if values are mostly Yes/No
  const ynCount = values.filter(v => /^(yes|no)$/i.test(String(v).trim())).length;
  if (ynCount > values.length * 0.6) return 'yesno';

  // Check if values are mostly numbers 1-5
  const numValues = values.map(v => Number(v)).filter(v => !isNaN(v) && v >= 1 && v <= 5);
  if (numValues.length > values.length * 0.6) return 'rating';

  // Check if header hints at a rating
  if (/1\s*-\s*very\s*poor|how does.*rate|evaluation|impression|1\s*-.*5\s*-/i.test(h)) return 'rating';

  return 'text';
}

function cleanHeader(h) {
  // Remove scale descriptions from header
  return h
    .replace(/\s*\n?\s*1\s*-\s*very\s*poor.*$/is, '')
    .replace(/\s*\n?\s*1\s*-\s*very poor.*$/is, '')
    .replace(/\.\d+$/, '') // Remove .1 .2 etc suffixes
    .trim();
}