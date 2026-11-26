import { address, coordinates } from './formulas.mjs';

export const STORAGE_KEY = 'gridline.workbook.v1';

export function initialWorkbook() {
  return { name: 'Untitled spreadsheet', active: 0, sheets: [{ name: 'Sheet 1', cells: {} }] };
}

export function removePristineExample(book) {
  return book.name === 'Personal budget' && JSON.stringify(book) === JSON.stringify(legacyExample())
    ? initialWorkbook()
    : book;
}

function legacyExample() {
  const cells = {};
  function row(number, values, style = '', bold = false) {
    values.forEach((value, column) => {
      cells[address(number - 1, column)] = {
        value, style, bold, format: column > 0 && value && style !== 'heading' ? 'currency' : '',
      };
    });
  }
  row(1, ['Monthly budget', '', '', ''], 'title', true);
  row(2, ['Income and expenses', '', '', ''], 'subtitle');
  row(4, ['Category', 'Planned', 'Actual', 'Variance'], 'heading', true);
  row(5, ['INCOME'], 'section', true);
  row(6, ['Salary', '4200', '4200', '=C6-B6']);
  row(7, ['Freelance', '600', '750', '=C7-B7']);
  row(8, ['Total income', '=SUM(B6:B7)', '=SUM(C6:C7)', '=C8-B8'], 'total', true);
  row(10, ['EXPENSES'], 'section', true);
  row(11, ['Rent', '1450', '1450', '=B11-C11']);
  row(12, ['Groceries', '420', '398.75', '=B12-C12']);
  row(13, ['Utilities', '160', '173.20', '=B13-C13']);
  row(14, ['Transport', '180', '145', '=B14-C14']);
  row(15, ['Subscriptions', '65', '64.50', '=B15-C15']);
  row(16, ['Dining out', '200', '236.80', '=B16-C16']);
  row(17, ['Total expenses', '=SUM(B11:B16)', '=SUM(C11:C16)', '=B17-C17'], 'total', true);
  row(19, ['Remaining', '=B8-B17', '=C8-C17', '=C19-B19'], 'net', true);
  return { name: 'Personal budget', active: 0, sheets: [{ name: 'Budget', cells }] };
}

export const FILL_COLORS = {
  yellow: '#fff0ab',
  green: '#c9f1db',
  blue: '#cde6ff',
  purple: '#e6d7ff',
  pink: '#ffd8e4',
  orange: '#ffdfbd',
  gray: '#e2e7ee',
};

export const BORDER_SIDES = { top: 1, right: 2, bottom: 4, left: 8 };

export function encodeWorkbook(book, name) {
  return JSON.stringify({ format: 'gridline-workbook', version: 1, workbook: { ...book, name } });
}

export function decodeWorkbook(text) {
  const invalid = () => new Error('Choose a valid Gridline workbook (.gridline.json).');
  let file;
  try {
    file = JSON.parse(text);
  } catch {
    throw invalid();
  }
  const book = file?.workbook;
  const validName = (name, limit) => typeof name === 'string' && name.trim() && name.length <= limit;
  if (file?.format !== 'gridline-workbook' || file.version !== 1 || !validName(book?.name, 70)
      || !Array.isArray(book.sheets) || !Number.isInteger(book.active) || !book.sheets[book.active]) throw invalid();
  const sheets = book.sheets.map(sheet => {
    if (!validName(sheet?.name, 40) || !sheet.cells || typeof sheet.cells !== 'object' || Array.isArray(sheet.cells)) throw invalid();
    const cells = {};
    for (const [key, entry] of Object.entries(sheet.cells)) {
      if (!coordinates(key) || key !== key.toUpperCase() || !entry || typeof entry !== 'object'
          || Array.isArray(entry) || (entry.value !== undefined && typeof entry.value !== 'string')) throw invalid();
      const cell = { value: entry.value ?? '' };
      if (['title', 'subtitle', 'heading', 'section', 'total', 'net'].includes(entry.style)) cell.style = entry.style;
      if (['number', 'currency', 'percent'].includes(entry.format)) cell.format = entry.format;
      if (entry.bold === true) cell.bold = true;
      if (entry.italic === true) cell.italic = true;
      if (Object.hasOwn(FILL_COLORS, entry.fill)) cell.fill = entry.fill;
      if (Number.isInteger(entry.border) && entry.border > 0 && entry.border <= 15) cell.border = entry.border;
      cells[key] = cell;
    }
    return { name: sheet.name, cells };
  });
  return { name: book.name, active: book.active, sheets };
}
