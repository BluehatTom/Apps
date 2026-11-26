import { calculate } from './formulas.mjs';
import { parseRange, rangeRows } from './ranges.mjs';
import { analyze } from './statistics.mjs';

const analyses = {
  describe: ['Data range', 'Summarize numeric cells. Blank and text cells are skipped.'],
  'one-sample': ['Sample range', 'Compare a sample mean with a specified value. Use independent observations.'],
  welch: ['Range A', 'Compare two independent sample means. The groups may have different variances.'],
  paired: ['Range A', 'Compare matched observations. Use ranges of the same shape, with each pair in the same relative position.'],
  pearson: ['Range A', 'Measure linear association. Use ranges of the same shape with matching observations.'],
  anova: ['Group columns', 'Select one column per independent group. This test assumes similar variances across groups.'],
  'chi-square': ['Count table', 'Select the observed counts. Exclude labels, totals, and percentages. Uses Pearson’s chi-square without continuity correction.'],
};

function displayNumber(value, label) {
  if (value === null) return '—';
  if (label.startsWith('p-value') && value === 0) return '< 1e−300';
  const magnitude = Math.abs(value);
  return magnitude && (magnitude < 0.0001 || magnitude >= 1e9)
    ? value.toExponential(4)
    : Number(value.toPrecision(7)).toLocaleString(undefined, { maximumFractionDigits: 10 });
}

export function setupStatistics(getSheet, getSelection) {
  const byId = id => document.getElementById(id);
  const panel = byId('statistics-panel');
  const toggle = byId('toggle-statistics');
  const select = byId('analysis-type');
  const rangeA = byId('stats-range-a');
  const rangeB = byId('stats-range-b');
  const secondField = byId('range-b-field');
  const meanField = byId('target-mean-field');
  const result = byId('analysis-result');

  function invalidate() {
    byId('statistics-sheet').textContent = getSheet().name;
    result.replaceChildren();
  }

  function setOpen(open) {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', open);
    if (open) {
      const current = getSelection();
      if (!rangeA.value && current.includes(':')) rangeA.value = current;
      select.focus();
    } else toggle.focus();
  }

  function describeAnalysis() {
    const mode = select.value;
    const [label, guide] = analyses[mode];
    byId('range-a-label').textContent = label;
    byId('analysis-guide').textContent = guide;
    secondField.hidden = !['welch', 'paired', 'pearson'].includes(mode);
    meanField.hidden = mode !== 'one-sample';
    invalidate();
  }

  function readMatrix(field, evaluate) {
    const range = parseRange(field.value);
    if (!range) {
      field.focus();
      throw new RangeError(`Enter a valid cell or range for ${field.labels[0].textContent}, such as A1:A10.`);
    }
    return rangeRows(...range, key => {
      const cell = evaluate(key);
      if (cell.error) throw new RangeError(`Fix the formula error in ${key} before running this analysis.`);
      return typeof cell.value === 'number' ? cell.value : null;
    });
  }

  function addElement(parent, tag, text, className) {
    const element = document.createElement(tag);
    element.textContent = text;
    if (className) element.className = className;
    parent.append(element);
    return element;
  }

  toggle.addEventListener('click', () => setOpen(panel.hidden));
  byId('close-statistics').addEventListener('click', () => setOpen(false));
  panel.addEventListener('keydown', event => {
    if (event.key === 'Escape') setOpen(false);
  });
  select.addEventListener('change', describeAnalysis);
  byId('statistics-form').addEventListener('input', invalidate);
  for (const [name, input] of [['a', rangeA], ['b', rangeB]]) {
    byId(`use-range-${name}`).addEventListener('click', () => {
      input.value = getSelection();
      invalidate();
    });
  }
  byId('statistics-form').addEventListener('submit', event => {
    event.preventDefault();
    invalidate();
    try {
      const evaluate = calculate(getSheet().cells);
      const first = readMatrix(rangeA, evaluate);
      const second = secondField.hidden ? null : readMatrix(rangeB, evaluate);
      const target = meanField.hidden ? null : byId('target-mean').valueAsNumber;
      const { rows, notes } = analyze(select.value, first, second, target);
      addElement(result, 'h3', 'Results');
      const list = addElement(result, 'dl', '', 'analysis-values');
      for (const [label, value] of rows) {
        addElement(list, 'dt', label);
        addElement(list, 'dd', displayNumber(value, label));
      }
      for (const note of notes) addElement(result, 'p', note, 'analysis-guide');
    } catch (error) {
      if (!(error instanceof RangeError)) throw error;
      addElement(result, 'p', error.message, 'analysis-error');
    }
  });

  describeAnalysis();
  return { invalidate };
}
