import { ROWS, COLS, address, coordinates, calculate } from './formulas.mjs';
import { STORAGE_KEY, initialWorkbook } from './workbook.mjs';
import { bounds, decodeBlock, encodeBlock, parseRange, rangeAddress, rangeRows } from './ranges.mjs';
import { setupStatistics } from './stats-panel.mjs';

const icons = {
  grid: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>',
  pencil: '<path d="m13.5 6.5 4 4M4 20l4.5-1 11-11a2.8 2.8 0 0 0-4-4l-11 11L4 20Z"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.3 2.3 4.7-4.7"/>',
  download: '<path d="M12 3v12m-4-4 4 4 4-4M5 16v4h14v-4"/>',
  undo: '<path d="M9 8H4m0 0 4-4M4 8h10a5 5 0 0 1 0 10h-3"/>',
  redo: '<path d="M15 8h5m0 0-4-4m4 4H10a5 5 0 0 0 0 10h3"/>',
  chevron: '<path d="m7 10 5 5 5-5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.3 9a2.7 2.7 0 1 1 4.2 2.3c-1 .7-1.5 1.2-1.5 2.3m0 2.7h.01"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  statistics: '<path d="M4 4v16h16M8 15v-3m5 3V8m5 7V5"/>',
};
for (const element of document.querySelectorAll('[data-icon]')) {
  element.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[element.dataset.icon]}</svg>`;
}

const byId = id => document.getElementById(id);
const grid = byId('grid');
const scroller = byId('grid-scroll');
const formula = byId('formula');
const addressInput = byId('address');
const nameInput = byId('workbook-name');
const tabs = byId('tabs');
const formatInput = byId('number-format');
const saveState = byId('save-state');
const undo = [];
const redo = [];
const cellNodes = [];
const rowHeaders = [];
const columnHeaders = [];
const sheetSelections = new WeakMap();
let selected = [0, 0];
let rangeEnd = selected;
let editor = null;
let book = loadWorkbook();
const statistics = setupStatistics(currentSheet, () => rangeAddress(selected, rangeEnd));

function loadWorkbook() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved?.sheets?.[saved.active]?.cells) return saved;
  } catch {
    showSaveState(false, 'Local storage unavailable');
    return initialWorkbook();
  }
  showSaveState(true, 'Saves locally');
  return initialWorkbook();
}

function showSaveState(ok, text) {
  saveState.toggleAttribute('data-error', !ok);
  saveState.lastElementChild.textContent = text;
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(book));
    showSaveState(true, 'Saved locally');
  } catch {
    showSaveState(false, 'Local save unavailable');
  }
}

function currentSheet() {
  return book.sheets[book.active];
}

function currentKey() {
  return address(...selected);
}

function snapshot() {
  return { book: structuredClone(book), selected, rangeEnd };
}

function change(update, refreshTabs = false) {
  undo.push(snapshot());
  if (undo.length > 100) undo.shift();
  redo.length = 0;
  update();
  save();
  if (refreshTabs) renderTabs();
  refreshGrid();
}

function restore(from, to) {
  if (!from.length) return;
  to.push(snapshot());
  const previous = from.pop();
  book = previous.book;
  selected = previous.selected;
  rangeEnd = previous.rangeEnd;
  nameInput.value = book.name;
  save();
  renderTabs();
  refreshGrid();
  revealSelection();
}

function makeGrid() {
  const head = grid.createTHead().insertRow();
  const corner = document.createElement('th');
  corner.className = 'grid-corner';
  head.append(corner);
  for (let column = 0; column < COLS; column++) {
    const cell = document.createElement('th');
    cell.id = `col-${column}`;
    cell.scope = 'col';
    cell.textContent = address(0, column)[0];
    cell.className = column === 0 ? 'first-column' : 'column-size';
    head.append(cell);
    columnHeaders.push(cell);
  }
  const body = grid.createTBody();
  for (let row = 0; row < ROWS; row++) {
    const tr = body.insertRow();
    const rowHeader = document.createElement('th');
    rowHeader.id = `row-${row}`;
    rowHeader.scope = 'row';
    rowHeader.className = 'row-head';
    rowHeader.textContent = row + 1;
    tr.append(rowHeader);
    rowHeaders.push(rowHeader);
    const nodes = [];
    for (let col = 0; col < COLS; col++) {
      const td = tr.insertCell();
      td.id = `cell-${address(row, col)}`;
      td.setAttribute('role', 'gridcell');
      td.setAttribute('headers', `row-${row} col-${col}`);
      td.dataset.row = row;
      td.dataset.col = col;
      const value = document.createElement('span');
      value.className = 'cell-value';
      td.append(value);
      nodes.push(td);
    }
    cellNodes.push(nodes);
  }
}

const numberFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 8 });
const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const percentFormatter = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 2 });

function formatValue(value, format, raw) {
  if (typeof value !== 'number') return value;
  if (format === 'currency') return currencyFormatter.format(value);
  if (format === 'percent' || (!format && raw?.trim().endsWith('%') && !raw.startsWith('='))) {
    return percentFormatter.format(value);
  }
  if (format === 'number') return numberFormatter.format(value);
  return String(Number(value.toPrecision(15)));
}

function refreshGrid() {
  const { cells } = currentSheet();
  const result = calculate(cells);
  cellNodes[0][0].parentElement.classList.toggle('title-row', cells.A1?.style === 'title');
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const key = address(row, col);
      const node = cellNodes[row][col];
      const cell = cells[key];
      const { value, error } = result(key);
      const text = formatValue(value, cell?.format, cell?.value);
      node.firstElementChild.textContent = text;
      node.title = text;
      node.className = cell?.style ? `style-${cell.style}` : '';
      node.classList.toggle('numeric', typeof value === 'number');
      node.classList.toggle('negative', typeof value === 'number' && value < 0);
      node.classList.toggle('error', error);
      node.firstElementChild.style.fontWeight = cell?.bold ? '700' : '';
      node.firstElementChild.style.fontStyle = cell?.italic ? 'italic' : '';
    }
  }
  syncSelection();
  statistics.invalidate();
}

let marked = [];
let markedHeaders = [];
function syncSelection() {
  for (const cell of marked) {
    cell.classList.remove('selected', 'range-cell', 'range-top', 'range-right', 'range-bottom', 'range-left');
    cell.removeAttribute('aria-selected');
  }
  for (const header of markedHeaders) header.classList.remove('header-active');
  marked = [];
  const [top, left, bottom, right] = bounds(selected, rangeEnd);
  const count = (bottom - top + 1) * (right - left + 1);
  for (let row = top; row <= bottom; row++) {
    for (let col = left; col <= right; col++) {
      const node = cellNodes[row][col];
      node.setAttribute('aria-selected', 'true');
      if (count > 1) {
        node.classList.add('range-cell');
        node.classList.toggle('range-top', row === top);
        node.classList.toggle('range-right', col === right);
        node.classList.toggle('range-bottom', row === bottom);
        node.classList.toggle('range-left', col === left);
      }
      marked.push(node);
    }
  }
  markedHeaders = [...rowHeaders.slice(top, bottom + 1), ...columnHeaders.slice(left, right + 1)];
  for (const header of markedHeaders) header.classList.add('header-active');
  const anchor = cellNodes[selected[0]][selected[1]];
  anchor.classList.add('selected');
  grid.setAttribute('aria-activedescendant', anchor.id);
  const key = currentKey();
  const { cells } = currentSheet();
  const entries = marked.map(node => cells[node.id.slice(5)]);
  addressInput.value = rangeAddress(selected, rangeEnd);
  formula.value = cells[key]?.value ?? '';
  const firstFormat = entries[0]?.format ?? '';
  formatInput.value = entries.every(cell => (cell?.format ?? '') === firstFormat) ? firstFormat : 'mixed';
  for (const style of ['bold', 'italic']) byId(style).setAttribute('aria-pressed', entries.every(cell => cell?.[style]));
  for (const format of ['currency', 'percent']) byId(format).setAttribute('aria-pressed', entries.every(cell => cell?.format === format));
  byId('undo').disabled = undo.length === 0;
  byId('redo').disabled = redo.length === 0;
  byId('selection-status').textContent = count > 1 ? `${count} cells selected` : `${ROWS} rows · ${COLS} columns`;
}

function revealSelection() {
  const node = cellNodes[rangeEnd[0]][rangeEnd[1]].getBoundingClientRect();
  const visible = scroller.getBoundingClientRect();
  const top = visible.top + grid.tHead.offsetHeight;
  const left = visible.left + rowHeaders[0].offsetWidth;
  const bottom = visible.top + scroller.clientHeight;
  const right = visible.left + scroller.clientWidth;
  if (node.top < top) scroller.scrollTop -= top - node.top;
  else if (node.bottom > bottom) scroller.scrollTop += node.bottom - bottom;
  if (node.left < left) scroller.scrollLeft -= left - node.left;
  else if (node.right > right) scroller.scrollLeft += node.right - right;
}

function select(row, col, reveal = true, extend = false) {
  grid.focus({ preventScroll: true });
  rangeEnd = [Math.max(0, Math.min(row, ROWS - 1)), Math.max(0, Math.min(col, COLS - 1))];
  if (!extend) selected = rangeEnd;
  syncSelection();
  if (reveal) revealSelection();
}

function move(row, col, extend = false) {
  const origin = extend ? rangeEnd : selected;
  select(origin[0] + row, origin[1] + col, true, extend);
}

function put(cells, key, properties) {
  const cell = { ...cells[key], ...properties };
  if (cell.value || cell.style || cell.bold || cell.italic || cell.format) cells[key] = cell;
  else delete cells[key];
}

function setValue(key, value) {
  const { cells } = currentSheet();
  if (value === (cells[key]?.value ?? '')) return;
  change(() => put(cells, key, { value }));
}

function setFormat(format) {
  updateRange('format', format);
}

function updateRange(property, value) {
  const { cells } = currentSheet();
  const keys = rangeRows(selected, rangeEnd, key => key).flat();
  const changed = keys.filter(key => (cells[key]?.[property] ?? '') !== value);
  if (changed.length) change(() => {
    for (const key of changed) put(cells, key, { [property]: value });
  });
}

function toggleStyle(style) {
  updateRange(style, byId(style).getAttribute('aria-pressed') !== 'true');
}

function startEditing(replace) {
  if (editor) return;
  rangeEnd = selected;
  syncSelection();
  revealSelection();
  const [row, col] = selected;
  const node = cellNodes[row][col];
  const key = currentKey();
  const value = currentSheet().cells[key]?.value ?? '';
  const input = document.createElement('input');
  input.className = 'cell-editor';
  input.setAttribute('aria-label', `Edit cell ${key}`);
  input.spellcheck = false;
  input.value = replace ?? value;
  input.style.height = `${node.offsetHeight + 2}px`;
  node.classList.add('editing');
  node.append(input);
  editor = input;
  input.focus();
  input.setSelectionRange(input.value.length, input.value.length);

  function finish(commit) {
    if (editor !== input) return;
    editor = null;
    node.classList.remove('editing');
    input.remove();
    if (commit) setValue(key, input.value);
    syncSelection();
  }
  input.addEventListener('input', () => { formula.value = input.value; });
  input.addEventListener('blur', () => finish(true));
  input.addEventListener('keydown', event => {
    if (event.isComposing) return;
    if (!['Escape', 'Enter', 'Tab'].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    finish(event.key !== 'Escape');
    const direction = event.shiftKey ? -1 : 1;
    if (event.key === 'Escape') grid.focus({ preventScroll: true });
    else if (event.key === 'Enter') move(direction, 0);
    else move(0, direction);
  });
}

function switchSheet(index) {
  if (book.active === index) return;
  sheetSelections.set(currentSheet(), [selected, rangeEnd]);
  book.active = index;
  [selected, rangeEnd] = sheetSelections.get(currentSheet()) ?? [[0, 0], [0, 0]];
  scroller.scrollTo(0, 0);
  save();
  renderTabs();
  refreshGrid();
  revealSelection();
}

function renameSheet(index, tab) {
  const input = document.createElement('input');
  input.className = 'tab-editor';
  input.setAttribute('aria-label', 'Sheet name');
  input.maxLength = 40;
  input.value = book.sheets[index].name;
  tab.replaceWith(input);
  input.select();
  let done = false;
  function finish(commit) {
    if (done) return;
    done = true;
    const name = input.value.trim();
    if (commit && name && name !== book.sheets[index].name) {
      change(() => { book.sheets[index].name = name; }, true);
    } else renderTabs();
  }
  input.addEventListener('blur', () => finish(true));
  input.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== 'Escape') return;
    event.preventDefault();
    finish(event.key === 'Enter');
    tabs.children[index]?.focus();
  });
}

function renderTabs() {
  tabs.replaceChildren();
  book.sheets.forEach((sheet, index) => {
    const tab = document.createElement('button');
    tab.className = 'sheet-tab';
    tab.role = 'tab';
    tab.textContent = sheet.name;
    tab.title = 'Double-click to rename';
    tab.setAttribute('aria-selected', index === book.active);
    tab.tabIndex = index === book.active ? 0 : -1;
    tab.addEventListener('click', () => {
      switchSheet(index);
      tabs.children[index].focus();
    });
    tab.addEventListener('dblclick', () => renameSheet(index, tabs.children[index]));
    tab.addEventListener('keydown', event => {
      if (event.key === 'F2') {
        event.preventDefault();
        renameSheet(index, tab);
      }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        const step = event.key === 'ArrowLeft' ? -1 : 1;
        const next = (index + step + book.sheets.length) % book.sheets.length;
        switchSheet(next);
        tabs.children[next].focus();
      }
    });
    tabs.append(tab);
  });
}

let selectionPointer = null;
let dragged = false;
grid.addEventListener('pointerdown', event => {
  dragged = false;
  if (event.button !== 0 || event.pointerType !== 'mouse' || event.target === editor) return;
  const node = event.target.closest('[data-row]');
  if (!node) return;
  selectionPointer = event.pointerId;
  select(Number(node.dataset.row), Number(node.dataset.col), false, event.shiftKey);
});
grid.addEventListener('pointermove', event => {
  if (event.pointerId !== selectionPointer || !(event.buttons & 1)) return;
  const node = event.target.closest('[data-row]');
  if (!node) return;
  const row = Number(node.dataset.row);
  const col = Number(node.dataset.col);
  if (row === rangeEnd[0] && col === rangeEnd[1]) return;
  dragged = true;
  select(row, col, false, true);
});
for (const type of ['pointerup', 'pointercancel']) {
  document.addEventListener(type, event => {
    if (event.pointerId === selectionPointer) selectionPointer = null;
  });
}
grid.addEventListener('click', event => {
  if (dragged) {
    dragged = false;
    return;
  }
  if (event.target === editor) return;
  const node = event.target.closest('[data-row]');
  if (node) select(Number(node.dataset.row), Number(node.dataset.col), false, event.shiftKey);
});
grid.addEventListener('dblclick', event => {
  if (event.target.closest('[data-row]') && event.target !== editor) startEditing();
});
grid.addEventListener('keydown', event => {
  if (event.target !== grid || event.isComposing) return;
  const key = event.key.toLowerCase();
  if (event.ctrlKey || event.metaKey) {
    if (key === 'z' || key === 'y') {
      event.preventDefault();
      if (key === 'y' || event.shiftKey) restore(redo, undo);
      else restore(undo, redo);
    }
    if (key === 'b' || key === 'i') {
      event.preventDefault();
      toggleStyle(key === 'b' ? 'bold' : 'italic');
    }
    return;
  }
  const direction = event.shiftKey ? -1 : 1;
  const steps = {
    ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1],
    Enter: [direction, 0], Tab: [0, direction],
  };
  if (Object.hasOwn(steps, event.key)) {
    const [row, col] = steps[event.key];
    if (event.key === 'Tab' && (selected[1] + col < 0 || selected[1] + col >= COLS)) return;
    event.preventDefault();
    move(row, col, event.shiftKey && event.key.startsWith('Arrow'));
  } else if (event.key === 'Escape') {
    select(...selected);
  } else if (event.key === 'F2') {
    event.preventDefault();
    startEditing();
  } else if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault();
    updateRange('value', '');
  } else if (event.key.length === 1 && !event.altKey) {
    event.preventDefault();
    startEditing(event.key);
  }
});

grid.addEventListener('copy', event => {
  if (event.target !== grid) return;
  const { cells } = currentSheet();
  const rows = rangeRows(selected, rangeEnd, key => cells[key]?.value ?? '');
  event.clipboardData.setData('text/plain', encodeBlock(rows));
  event.preventDefault();
});
grid.addEventListener('paste', event => {
  if (event.target !== grid) return;
  const text = event.clipboardData.getData('text/plain');
  if (!text) return;
  event.preventDefault();
  const [startRow, startCol] = bounds(selected, rangeEnd);
  const rows = decodeBlock(text).slice(0, ROWS - startRow).map(row => row.slice(0, COLS - startCol));
  const { cells } = currentSheet();
  change(() => {
    rows.forEach((row, offset) => {
      row.forEach((value, col) => {
        put(cells, address(startRow + offset, startCol + col), { value });
      });
    });
    selected = [startRow, startCol];
    rangeEnd = [startRow + rows.length - 1, startCol + Math.max(...rows.map(row => row.length)) - 1];
  });
});

byId('formula-form').addEventListener('submit', event => {
  event.preventDefault();
  if (document.activeElement === addressInput) {
    const target = parseRange(addressInput.value);
    if (target) {
      grid.focus({ preventScroll: true });
      [selected, rangeEnd] = target;
      syncSelection();
      revealSelection();
    }
    else addressInput.select();
    return;
  }
  setValue(currentKey(), formula.value);
  move(1, 0);
});
formula.addEventListener('blur', () => setValue(currentKey(), formula.value));
formula.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  formula.value = currentSheet().cells[currentKey()]?.value ?? '';
  grid.focus({ preventScroll: true });
});
addressInput.addEventListener('blur', () => { addressInput.value = rangeAddress(selected, rangeEnd); });
nameInput.addEventListener('blur', () => {
  const name = nameInput.value.trim() || book.name;
  if (name !== book.name) change(() => { book.name = name; });
  nameInput.value = book.name;
});
nameInput.addEventListener('keydown', event => {
  if (event.key === 'Escape') nameInput.value = book.name;
  if (event.key === 'Escape' || event.key === 'Enter') grid.focus({ preventScroll: true });
});

byId('help').addEventListener('click', () => byId('help-dialog').showModal());
byId('undo').addEventListener('click', () => { restore(undo, redo); grid.focus({ preventScroll: true }); });
byId('redo').addEventListener('click', () => { restore(redo, undo); grid.focus({ preventScroll: true }); });
for (const style of ['bold', 'italic']) {
  byId(style).addEventListener('click', () => { toggleStyle(style); grid.focus({ preventScroll: true }); });
}
for (const format of ['currency', 'percent']) {
  byId(format).addEventListener('click', () => {
    setFormat(byId(format).getAttribute('aria-pressed') === 'true' ? '' : format);
    grid.focus({ preventScroll: true });
  });
}
formatInput.addEventListener('change', () => { setFormat(formatInput.value); grid.focus({ preventScroll: true }); });
byId('add-sheet').addEventListener('click', () => {
  const usedNames = new Set(book.sheets.map(sheet => sheet.name));
  let number = book.sheets.length + 1;
  while (usedNames.has(`Sheet ${number}`)) number++;
  const index = book.sheets.length;
  sheetSelections.set(currentSheet(), [selected, rangeEnd]);
  change(() => {
    book.sheets.push({ name: `Sheet ${number}`, cells: {} });
    book.active = index;
    selected = [0, 0];
    rangeEnd = selected;
  }, true);
  scroller.scrollTo(0, 0);
  tabs.children[index].scrollIntoView({ block: 'nearest', inline: 'nearest' });
  select(0, 0);
});
byId('export').addEventListener('click', () => {
  const { name, cells } = currentSheet();
  let lastRow = -1;
  let lastCol = -1;
  for (const [key, cell] of Object.entries(cells)) {
    if (!cell.value) continue;
    const [row, col] = coordinates(key);
    lastRow = Math.max(lastRow, row);
    lastCol = Math.max(lastCol, col);
  }
  const result = calculate(cells);
  const lines = [];
  for (let row = 0; row <= lastRow; row++) {
    const values = [];
    for (let col = 0; col <= lastCol; col++) {
      const { value } = result(address(row, col));
      let text = typeof value === 'number' ? String(Number(value.toPrecision(15))) : value;
      if (typeof value === 'string' && /^[\s]*[=+\-@]/.test(text)) text = "'" + text;
      values.push('"' + text.replaceAll('"', '""') + '"');
    }
    lines.push(values.join(','));
  }
  const url = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${name.replace(/[^\p{L}\p{N} ._-]/gu, '_') || 'Sheet'}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

nameInput.value = book.name;
makeGrid();
renderTabs();
refreshGrid();
