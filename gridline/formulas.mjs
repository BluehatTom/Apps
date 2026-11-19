export const ROWS = 60;
export const COLS = 26;

export function address(row, column) {
  return String.fromCharCode(65 + column) + (row + 1);
}

export function coordinates(value) {
  const match = /^([A-Z])([1-9]\d?)$/i.exec(value);
  if (!match || Number(match[2]) > ROWS) return null;
  return [Number(match[2]) - 1, match[1].toUpperCase().charCodeAt(0) - 65];
}

const numberPattern = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;

function cellLiteral(raw) {
  const trimmed = raw.trim();
  if (numberPattern.test(trimmed) && Number.isFinite(Number(trimmed))) return Number(trimmed);
  if (trimmed.endsWith('%') && numberPattern.test(trimmed.slice(0, -1))) {
    const percent = Number(trimmed.slice(0, -1)) / 100;
    if (Number.isFinite(percent)) return percent;
  }
  return raw;
}

class FormulaError extends Error {}

function fail(code) {
  throw new FormulaError(code);
}

const functions = {
  SUM: values => values.reduce((sum, value) => sum + value, 0),
  AVERAGE: values => {
    if (!values.length) fail('#DIV/0!');
    return functions.SUM(values) / values.length;
  },
  MIN: values => values.length ? Math.min(...values) : 0,
  MAX: values => values.length ? Math.max(...values) : 0,
  COUNT: values => values.length,
};

function evaluate(source, resolve) {
  const tokens = [];
  const pattern = /\s*(?:(\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?|[a-z]+\d*|[+*/%(),:\-])/iy;
  while (pattern.lastIndex < source.length) {
    const token = pattern.exec(source);
    if (!token) fail('#ERROR!');
    tokens.push(token[0].trim().toUpperCase());
  }
  let position = 0;
  const take = value => {
    if (tokens[position] !== value) return false;
    position++;
    return true;
  };
  function expect(token) {
    if (!take(token)) fail('#ERROR!');
  }
  function readReference(reference) {
    if (!coordinates(reference)) fail('#REF!');
    return resolve(reference);
  }
  function readRange(start, end) {
    const first = coordinates(start);
    const last = coordinates(end ?? '');
    if (!first || !last) fail('#REF!');
    const values = [];
    for (let row = Math.min(first[0], last[0]); row <= Math.max(first[0], last[0]); row++) {
      for (let col = Math.min(first[1], last[1]); col <= Math.max(first[1], last[1]); col++) {
        const value = resolve(address(row, col));
        if (typeof value === 'number') values.push(value);
      }
    }
    return values;
  }
  function readFunction(name) {
    if (!Object.hasOwn(functions, name)) fail('#NAME?');
    const values = [];
    if (!take(')')) {
      do {
        const token = tokens[position];
        if (token && /^[A-Z]+\d+$/.test(token) && tokens[position + 1] === ':') {
          position += 2;
          values.push(...readRange(token, tokens[position++]));
        } else {
          const value = expression();
          if (typeof value === 'number') values.push(value);
        }
      } while (take(','));
      expect(')');
    }
    return functions[name](values);
  }
  function atom() {
    const token = tokens[position++];
    if (token === '(') {
      const value = expression();
      expect(')');
      return value;
    }
    if (!token) fail('#ERROR!');
    if (numberPattern.test(token)) return Number(token);
    if (/^[A-Z]+\d+$/.test(token)) return readReference(token);
    if (/^[A-Z]+$/.test(token)) {
      if (!take('(')) fail('#NAME?');
      return readFunction(token);
    }
    return fail('#ERROR!');
  }
  function numeric(value) {
    if (value === '') return 0;
    if (typeof value !== 'number') fail('#VALUE!');
    return value;
  }
  function unary() {
    if (take('+')) return numeric(unary());
    if (take('-')) return -numeric(unary());
    let value = atom();
    while (take('%')) value = numeric(value) / 100;
    return value;
  }
  function product() {
    let value = unary();
    while (tokens[position] === '*' || tokens[position] === '/') {
      const operator = tokens[position++];
      const next = numeric(unary());
      if (operator === '/' && next === 0) fail('#DIV/0!');
      value = operator === '*' ? numeric(value) * next : numeric(value) / next;
    }
    return value;
  }
  function expression() {
    let value = product();
    while (tokens[position] === '+' || tokens[position] === '-') {
      const operator = tokens[position++];
      const next = numeric(product());
      value = operator === '+' ? numeric(value) + next : numeric(value) - next;
    }
    return value;
  }
  const result = expression();
  if (position !== tokens.length) fail('#ERROR!');
  if (typeof result === 'number' && !Number.isFinite(result)) fail('#NUM!');
  return result;
}

export function calculate(cells) {
  const cache = new Map();
  const evaluating = new Set();
  function resolve(key) {
    if (evaluating.has(key)) fail('#CYCLE!');
    if (cache.has(key)) {
      const result = cache.get(key);
      if (result instanceof FormulaError) throw result;
      return result;
    }
    const raw = cells[key]?.value ?? '';
    if (!raw.startsWith('=')) return cellLiteral(raw);
    evaluating.add(key);
    try {
      const value = evaluate(raw.slice(1).trim(), resolve);
      cache.set(key, value);
      return value;
    } catch (error) {
      const result = error instanceof FormulaError ? error : new FormulaError('#ERROR!');
      cache.set(key, result);
      throw result;
    } finally {
      evaluating.delete(key);
    }
  }
  return key => {
    try {
      return { value: resolve(key), error: false };
    } catch (error) {
      return { value: error.message, error: true };
    }
  };
}
