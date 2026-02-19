function buildTable(columns, dataRows, headers) {
  const thead = document.getElementById('tableHead');
  const tbody = document.getElementById('tableBody');
  thead.innerHTML = '';
  tbody.innerHTML = '';

  const tableCols = columns.filter(c => ['name','client','coach','rating','yesno'].includes(c.type));
  tableState = { cols: tableCols, dataRows: dataRows, sortCol: -1, sortDir: 'asc' };

  const tr = document.createElement('tr');
  tableCols.forEach((c, colIdx) => {
    const th = document.createElement('th');
    th.className = 'sortable';
    const displayText = c.type === 'name' ? 'Employee' : c.type === 'client' ? 'Client' : c.type === 'coach' ? 'Job Coach' : c.header.length > 25 ? c.header.slice(0,22) + '…' : c.header;
    th.innerHTML = `${esc(displayText)} <span class="sort-indicator"></span>`;
    th.title = c.header;
    th.onclick = () => sortTable(colIdx);
    tr.appendChild(th);
  });
  thead.appendChild(tr);

  renderTableBody();

  // Reset expand state
  const container = document.getElementById('tableContainer');
  container.classList.remove('open');
  container.style.maxHeight = '0';
  const btn = document.getElementById('tableToggle');
  btn.classList.remove('open');
  btn.innerHTML = '<i data-lucide="chevron-right" class="arrow"></i><span class="toggle-text">Show all employee responses</span>';

  // Reset search
  const searchInput = document.getElementById('tableSearchInput');
  if (searchInput) searchInput.value = '';
}

function sortTable(colIdx) {
  if (tableState.sortCol === colIdx) {
    tableState.sortDir = tableState.sortDir === 'asc' ? 'desc' : 'asc';
  } else {
    tableState.sortCol = colIdx;
    tableState.sortDir = 'asc';
  }
  renderTableBody();
  updateSortIndicators();

  // Update max-height if table is open (content may have re-rendered)
  const container = document.getElementById('tableContainer');
  if (container.classList.contains('open')) {
    container.style.maxHeight = 'none';
  }
}

function renderTableBody() {
  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = '';

  let rows = [...tableState.dataRows];
  if (tableState.sortCol >= 0) {
    const col = tableState.cols[tableState.sortCol];
    const dir = tableState.sortDir === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      let va = a[col.index], vb = b[col.index];
      if (col.type === 'rating') {
        va = Number(va) || 0; vb = Number(vb) || 0;
      } else {
        va = String(va ?? '').toLowerCase(); vb = String(vb ?? '').toLowerCase();
      }
      return va < vb ? -dir : va > vb ? dir : 0;
    });
  }

  rows.forEach(row => {
    const tr = document.createElement('tr');
    tableState.cols.forEach(col => {
      const td = document.createElement('td');
      const val = row[col.index];
      const strVal = val instanceof Date ? val.toLocaleDateString() : String(val ?? '');

      if (col.type === 'name') {
        td.className = 'td-name';
        td.textContent = strVal;
      } else if (col.type === 'rating') {
        const num = Number(val);
        if (!isNaN(num) && num >= 1 && num <= 5) {
          td.innerHTML = `<span class="rating-cell r${num}">${num}</span>`;
        } else {
          td.textContent = strVal;
        }
      } else if (col.type === 'yesno') {
        const yn = strVal.trim().toLowerCase();
        if (yn === 'yes' || yn === 'no') {
          td.innerHTML = `<span class="yn-cell ${yn}">${esc(strVal)}</span>`;
        } else {
          td.textContent = strVal;
        }
      } else {
        td.textContent = strVal;
      }
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

function updateSortIndicators() {
  document.querySelectorAll('#tableHead th.sortable').forEach((th, i) => {
    const indicator = th.querySelector('.sort-indicator');
    th.classList.remove('sort-asc', 'sort-desc');
    if (i === tableState.sortCol) {
      th.classList.add(tableState.sortDir === 'asc' ? 'sort-asc' : 'sort-desc');
      indicator.innerHTML = `<i data-lucide="${tableState.sortDir === 'asc' ? 'chevron-up' : 'chevron-down'}"></i>`;
    } else {
      indicator.innerHTML = '';
    }
  });
  lucide.createIcons();
}

function toggleTable() {
  const btn = document.getElementById('tableToggle');
  const container = document.getElementById('tableContainer');
  const isOpen = container.classList.contains('open');

  if (isOpen) {
    container.style.maxHeight = container.scrollHeight + 'px';
    container.offsetHeight;
    container.style.maxHeight = '0';
    container.classList.remove('open');
  } else {
    container.style.maxHeight = container.scrollHeight + 'px';
    container.classList.add('open');
    container.addEventListener('transitionend', function handler() {
      if (container.classList.contains('open')) container.style.maxHeight = 'none';
      container.removeEventListener('transitionend', handler);
    });
  }

  btn.classList.toggle('open', !isOpen);
  btn.querySelector('.toggle-text').textContent = !isOpen ? 'Hide employee responses' : 'Show all employee responses';
}

function filterTable(query) {
  const rows = document.querySelectorAll('#tableBody tr');
  const q = query.toLowerCase();
  rows.forEach(tr => {
    tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}
