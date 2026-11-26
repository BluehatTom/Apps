import { ROWS, COLS, address, coordinates } from './formulas.mjs';
import { bounds, parseRange, rangeAddress, rangeRows } from './ranges.mjs';
import { BORDER_SIDES, FILL_COLORS, decodeWorkbook, encodeWorkbook } from './workbook.mjs';

const THEME_KEY = 'gridline.theme';
const themes = ['light', 'dark', 'green', 'orange', 'colorful'];

export function downloadFile(text, mimeType, name) {
  const url = URL.createObjectURL(new Blob([text], { type: mimeType }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function safeFilename(name, fallback) {
  return name.replace(/[^\p{L}\p{N} ._()-]/gu, '_').replace(/^[ .]+|[ .]+$/g, '') || fallback;
}

export function makeGenerator(type, first, second, categoryInput, random = Math.random) {
  if (type === 'categories') {
    const categories = categoryInput.split(',').map(category => category.trim()).filter(Boolean);
    if (!categories.length) throw new RangeError('Enter at least one category.');
    if (categories.some(category => category.startsWith('='))) throw new RangeError('Category labels cannot start with an equals sign.');
    return () => categories[Math.floor(random() * categories.length)];
  }

  if (!Number.isFinite(first) || !Number.isFinite(second)) throw new RangeError('Enter two finite numbers.');
  if (type === 'normal') {
    if (second <= 0) throw new RangeError('Standard deviation must be greater than zero.');
    return () => {
      const standardNormal = Math.sqrt(-2 * Math.log1p(-random())) * Math.cos(2 * Math.PI * random());
      return decimalValue(first + second * standardNormal);
    };
  }
  if (second < first) throw new RangeError('Maximum must be at least the minimum.');
  if (type === 'integers') {
    const span = second - first + 1;
    if (!Number.isSafeInteger(first) || !Number.isSafeInteger(second) || !Number.isSafeInteger(span)) {
      throw new RangeError('Use whole-number bounds within a range of safe integers.');
    }
    return () => String(first + Math.floor(random() * span));
  }
  return () => {
    const weight = random();
    const value = first * (1 - weight) + second * weight;
    return String(Math.min(second, Math.max(first, value)));
  };
}

function decimalValue(value) {
  if (!Number.isFinite(value)) throw new RangeError('The chosen settings produced a value outside the supported numeric range.');
  return String(Number(value.toPrecision(12)));
}

export function applyCellAppearance(node, cell) {
  const fill = Object.hasOwn(FILL_COLORS, cell?.fill) ? FILL_COLORS[cell.fill] : '';
  node.style.setProperty('--cell-fill', fill);
  node.classList.toggle('has-fill', Boolean(fill));
  for (const [side, flag] of Object.entries(BORDER_SIDES)) {
    node.classList.toggle('border-' + side, Boolean(cell?.border & flag));
  }
}

export function renderPrintSheet(container, book, sheet, cellNodes) {
  const title = document.createElement('h1');
  title.textContent = book.name;
  const subtitle = document.createElement('p');
  subtitle.textContent = sheet.name;
  container.replaceChildren(title, subtitle);

  const entries = Object.entries(sheet.cells).filter(([, cell]) => cell.value || cell.fill || cell.border || cell.style);
  if (!entries.length) return;
  let top = ROWS - 1;
  let left = COLS - 1;
  let bottom = 0;
  let right = 0;
  for (const [key] of entries) {
    const [row, col] = coordinates(key);
    top = Math.min(top, row);
    left = Math.min(left, col);
    bottom = Math.max(bottom, row);
    right = Math.max(right, col);
  }

  const table = document.createElement('table');
  const head = table.createTHead().insertRow();
  function label(row, text, scope) {
    const th = document.createElement('th');
    th.textContent = text;
    th.scope = scope;
    row.append(th);
  }
  label(head, '', 'col');
  for (let col = left; col <= right; col++) label(head, address(0, col)[0], 'col');
  const body = table.createTBody();
  for (let row = top; row <= bottom; row++) {
    const tr = body.insertRow();
    label(tr, String(row + 1), 'row');
    for (let col = left; col <= right; col++) {
      const source = cellNodes[row][col];
      const cell = tr.insertCell();
      if (source.classList.contains('numeric')) cell.classList.add('numeric');
      applyCellAppearance(cell, sheet.cells[address(row, col)]);
      cell.append(source.firstElementChild.cloneNode(true));
    }
  }
  container.append(table);
}

export function setupWorkbookTools({ getBook, openBook, getSelection, writeGenerated, preparePrint }) {
  const byId = id => document.getElementById(id);
  const fileMenu = byId('file-menu');
  const fileInput = byId('workbook-file');
  const saveDialog = byId('save-as-dialog');
  const saveName = byId('save-as-name');
  const themeSelect = byId('theme');
  const notice = byId('app-notice');
  let noticeTimer;
  let fileRequest = 0;

  function announce(message, error = false) {
    clearTimeout(noticeTimer);
    notice.toggleAttribute('data-error', error);
    notice.textContent = message;
    noticeTimer = setTimeout(() => { notice.textContent = ''; }, error ? 7500 : 3750);
  }

  function applyTheme(theme) {
    const choice = themes.includes(theme) ? theme : 'light';
    document.documentElement.dataset.theme = choice;
    themeSelect.value = choice;
  }
  try {
    applyTheme(localStorage.getItem(THEME_KEY));
  } catch {
    applyTheme('light');
  }
  themeSelect.addEventListener('change', () => {
    applyTheme(themeSelect.value);
    try {
      localStorage.setItem(THEME_KEY, themeSelect.value);
    } catch {
      announce('Theme changed for this session.');
    }
  });

  function closeMenu() {
    if (!fileMenu.open) return;
    fileMenu.open = false;
    fileMenu.querySelector('summary').focus();
  }
  document.addEventListener('click', event => {
    if (!fileMenu.contains(event.target)) fileMenu.open = false;
  });
  fileMenu.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeMenu();
  });

  byId('save-workbook-as').addEventListener('click', () => {
    closeMenu();
    saveName.value = getBook().name;
    saveDialog.showModal();
    saveName.select();
  });
  byId('save-as-form').addEventListener('submit', event => {
    event.preventDefault();
    const name = saveName.value.trim() || getBook().name;
    downloadFile(encodeWorkbook(getBook(), name), 'application/json', safeFilename(name, 'Gridline') + '.gridline.json');
    saveDialog.close();
  });
  byId('open-workbook').addEventListener('click', () => {
    closeMenu();
    fileInput.click();
  });
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    fileInput.value = '';
    if (!file) return;
    const request = ++fileRequest;
    try {
      const workbook = decodeWorkbook(await file.text());
      if (request !== fileRequest) return;
      openBook(workbook);
      announce('Opened ' + workbook.name + '.');
    } catch (error) {
      if (request === fileRequest) announce(error.message || 'Could not open the workbook.', true);
    }
  });
  byId('export').addEventListener('click', closeMenu);
  byId('print').addEventListener('click', () => {
    closeMenu();
    preparePrint();
    window.print();
  });
  window.addEventListener('beforeprint', preparePrint);

  const generator = byId('generator-dialog');
  const range = byId('generator-range');
  const type = byId('generator-type');
  const first = byId('generator-first');
  const second = byId('generator-second');
  const categories = byId('generator-categories');
  const overwrite = byId('generator-overwrite');
  const error = byId('generator-error');

  function updateParameters() {
    const categorical = type.value === 'categories';
    const normal = type.value === 'normal';
    byId('generator-first-label').hidden = categorical;
    byId('generator-second-label').hidden = categorical;
    byId('generator-categories-label').hidden = !categorical;
    first.disabled = categorical;
    second.disabled = categorical;
    first.step = second.step = type.value === 'integers' ? '1' : 'any';
    first.labels[0].firstElementChild.textContent = normal ? 'Mean' : 'Minimum';
    second.labels[0].firstElementChild.textContent = normal ? 'Standard deviation' : 'Maximum';
    first.value = normal ? 50 : 1;
    second.value = normal ? 10 : 100;
    error.textContent = '';
  }

  byId('open-generator').addEventListener('click', () => {
    const [start, end] = getSelection();
    const single = start[0] === end[0] && start[1] === end[1];
    const defaultEnd = [Math.min(start[0] + 9, ROWS - 1), Math.min(start[1] + 2, COLS - 1)];
    range.value = rangeAddress(start, single ? defaultEnd : end);
    overwrite.checked = false;
    error.textContent = '';
    generator.showModal();
  });
  type.addEventListener('change', updateParameters);
  updateParameters();
  byId('generator-form').addEventListener('submit', event => {
    event.preventDefault();
    error.textContent = '';
    const target = parseRange(range.value);
    if (!target) {
      error.textContent = 'Enter a valid destination such as A1:C10.';
      range.focus();
      return;
    }
    try {
      const draw = makeGenerator(type.value, first.valueAsNumber, second.valueAsNumber, categories.value);
      const book = getBook();
      const { cells } = book.sheets[book.active];
      const entries = rangeRows(...target, key => key).flat()
        .filter(key => overwrite.checked || !cells[key]?.value)
        .map(key => [key, draw()]);
      if (!entries.length) throw new RangeError('This range has no empty cells. Choose another range or allow replacement.');
      const [top, left, bottom, right] = bounds(...target);
      writeGenerated([[top, left], [bottom, right]], entries);
      generator.close();
      announce(`Generated ${entries.length} ${entries.length === 1 ? 'value' : 'values'} in ${rangeAddress(...target)}.`);
    } catch (failure) {
      error.textContent = failure.message;
    }
  });
}
