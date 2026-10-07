/* GLAZE UI V1.2 Candidate — bounded productive-interface behavior; fixture DOM only, no transport or persistence. */
const ROOT_SELECTOR = '[data-glz-productive-root]';

function rows(root) { return [...root.querySelectorAll('[data-record-row]')]; }
function selectedRows(root) { return rows(root).filter(row => row.dataset.selected === 'true'); }

function updateInspector(root) {
  const selected = selectedRows(root);
  const title = root.querySelector('[data-inspector-title]');
  const body = root.querySelector('[data-inspector-body]');
  if (!title || !body) return;
  if (!selected.length) {
    title.textContent = 'No record selected';
    body.textContent = 'Select a record to inspect its fixture details.';
  } else if (selected.length > 1) {
    title.textContent = `${selected.length} records selected`;
    body.textContent = 'Bulk scope only. The inspector does not pretend these records are one object.';
  } else {
    const row = selected[0];
    title.textContent = row.dataset.name || 'Selected record';
    body.textContent = `State: ${row.dataset.state || 'Unknown'} · Source: ${row.dataset.source || 'Fixture source'}`;
  }
}

function updateSelection(root) {
  const selected = selectedRows(root);
  const count = root.querySelector('[data-selection-count]');
  const bulk = root.querySelector('[data-bulk-bar]');
  if (count) count.textContent = `${selected.length} selected`;
  if (bulk) bulk.hidden = selected.length === 0;
  updateInspector(root);
}

function initSelection(root) {
  for (const box of root.querySelectorAll('[data-row-select]')) {
    box.addEventListener('change', () => {
      const row = box.closest('[data-record-row]');
      if (!row) return;
      row.dataset.selected = String(box.checked);
      updateSelection(root);
    });
  }
  const all = root.querySelector('[data-select-all]');
  if (all) all.addEventListener('change', () => {
    for (const box of root.querySelectorAll('[data-row-select]')) {
      box.checked = all.checked;
      const row = box.closest('[data-record-row]');
      if (row) row.dataset.selected = String(all.checked);
    }
    updateSelection(root);
  });
  updateSelection(root);
}

function compareValue(a, b, key) {
  const av = a.dataset[key] || '';
  const bv = b.dataset[key] || '';
  const an = Number(av), bn = Number(bv);
  if (Number.isFinite(an) && Number.isFinite(bn) && av !== '' && bv !== '') return an - bn;
  return av.localeCompare(bv, undefined, { numeric: true, sensitivity: 'base' });
}

function sortRows(root, button) {
  const key = button.dataset.sortKey;
  if (!key) return;
  const header = button.closest('th');
  const current = header?.getAttribute('aria-sort') || 'none';
  const direction = current === 'ascending' ? 'descending' : 'ascending';
  for (const th of root.querySelectorAll('th[aria-sort]')) th.setAttribute('aria-sort', th === header ? direction : 'none');
  const mark = button.querySelector('[data-sort-mark]');
  if (mark) mark.textContent = direction === 'ascending' ? '↑' : '↓';
  const tbody = root.querySelector('[data-record-body]');
  if (!tbody) return;
  const ordered = rows(root).sort((a,b) => compareValue(a,b,key) * (direction === 'ascending' ? 1 : -1));
  for (const row of ordered) tbody.append(row);
  root.dataset.sortKey = key;
  root.dataset.sortDirection = direction;
}

function initSorting(root) {
  for (const button of root.querySelectorAll('[data-sort-key]')) button.addEventListener('click', () => sortRows(root, button));
}

function activeFilters(root) {
  const status = root.querySelector('[data-filter-status]')?.value || 'all';
  const query = (root.querySelector('[data-table-search]')?.value || '').trim().toLowerCase();
  return { status, query };
}

function updateFilterChips(root, filters) {
  const bar = root.querySelector('[data-active-filters]');
  const count = root.querySelector('[data-filter-count]');
  if (!bar) return;
  const chips = [];
  if (filters.status !== 'all') chips.push(`Status: ${filters.status}`);
  if (filters.query) chips.push(`Search: ${filters.query}`);
  bar.replaceChildren(...chips.map(text => {
    const span = document.createElement('span');
    span.className = 'glz12-filter-chip';
    span.textContent = text;
    span.dataset.filterChip = 'true';
    return span;
  }));
  if (count) count.textContent = `Filters · ${chips.length}`;
}

function applyFilters(root) {
  const filters = activeFilters(root);
  let visible = 0;
  for (const row of rows(root)) {
    const statusMatch = filters.status === 'all' || row.dataset.state === filters.status;
    const queryMatch = !filters.query || (row.dataset.searchText || row.textContent || '').toLowerCase().includes(filters.query);
    row.hidden = !(statusMatch && queryMatch);
    if (!row.hidden) visible += 1;
  }
  updateFilterChips(root, filters);
  const empty = root.querySelector('[data-no-results]');
  if (empty) {
    empty.hidden = visible !== 0;
    const query = empty.querySelector('[data-no-results-query]');
    if (query) query.textContent = filters.query || '(no search query)';
  }
  root.dataset.visibleRecords = String(visible);
}

function initFiltering(root) {
  const status = root.querySelector('[data-filter-status]');
  const search = root.querySelector('[data-table-search]');
  if (status) status.addEventListener('change', () => applyFilters(root));
  if (search) search.addEventListener('input', () => applyFilters(root));
  const clear = root.querySelector('[data-clear-filters]');
  if (clear) clear.addEventListener('click', () => {
    if (status) status.value = 'all';
    if (search) search.value = '';
    applyFilters(root);
  });
  applyFilters(root);
}

function initRowFocus(root) {
  for (const row of rows(root)) {
    row.addEventListener('focus', () => {
      for (const other of rows(root)) other.dataset.focused = String(other === row);
    });
  }
}

function initLog(root) {
  const log = root.querySelector('[data-log-viewer]');
  const toggle = root.querySelector('[data-log-toggle]');
  if (!log || !toggle) return;
  root.dataset.logLive = 'true';
  toggle.addEventListener('click', () => {
    const next = root.dataset.logLive !== 'true';
    root.dataset.logLive = String(next);
    toggle.textContent = next ? 'Pause live log' : 'Resume live log';
    toggle.setAttribute('aria-pressed', String(!next));
  });
  log.addEventListener('scroll', () => {
    const away = log.scrollTop + log.clientHeight < log.scrollHeight - 2;
    if (away && root.dataset.logLive === 'true') {
      root.dataset.logLive = 'false';
      toggle.textContent = 'Resume live log';
      toggle.setAttribute('aria-pressed','true');
    }
  });
}

function init(root) {
  initSelection(root);
  initSorting(root);
  initFiltering(root);
  initRowFocus(root);
  initLog(root);
}

export function initializeProductiveInterfaces(scope = document) {
  for (const root of scope.querySelectorAll(ROOT_SELECTOR)) init(root);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => initializeProductiveInterfaces(), { once: true });
else initializeProductiveInterfaces();

window.GlazeV12ProductiveInterfaces = Object.freeze({ initializeProductiveInterfaces });
