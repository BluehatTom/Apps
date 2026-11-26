import { address, coordinates } from './formulas.mjs';

export function parseRange(input) {
  const parts = input.split(':').map(part => coordinates(part.trim()));
  if (parts.length > 2 || parts.some(part => !part)) return null;
  return [parts[0], parts[1] ?? parts[0]];
}

export function bounds([firstRow, firstCol], [lastRow, lastCol]) {
  return [
    Math.min(firstRow, lastRow), Math.min(firstCol, lastCol),
    Math.max(firstRow, lastRow), Math.max(firstCol, lastCol),
  ];
}

export function rangeAddress(start, end) {
  const [top, left, bottom, right] = bounds(start, end);
  const first = address(top, left);
  return top === bottom && left === right ? first : first + ':' + address(bottom, right);
}

export function rangeRows(start, end, read) {
  const [top, left, bottom, right] = bounds(start, end);
  return Array.from({ length: bottom - top + 1 }, (_, row) =>
    Array.from({ length: right - left + 1 }, (_, col) => read(address(top + row, left + col))));
}

export function encodeBlock(rows) {
  return rows.map(row => row.map(value =>
    /["\t\r\n]/.test(value) || (!value && row.length === 1 && rows.length > 1)
      ? '"' + value.replaceAll('"', '""') + '"'
      : value
  ).join('\t')).join('\n');
}

export function decodeBlock(text) {
  text = text.replace(/\r\n?/g, '\n');
  const rows = [[]];
  let row = rows[0];
  let value = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"' && !value) {
      const quoted = /^"((?:""|[^"])*)"(?=\t|\n|$)/.exec(text.slice(i));
      if (quoted) {
        value = quoted[1].replaceAll('""', '"');
        i += quoted[0].length - 1;
        continue;
      }
    }
    if (char === '\t' || char === '\n') {
      row.push(value);
      value = '';
      if (char === '\n' && i < text.length - 1) {
        row = [];
        rows.push(row);
      }
    } else value += char;
  }
  if (!text.endsWith('\n')) row.push(value);
  return rows;
}
