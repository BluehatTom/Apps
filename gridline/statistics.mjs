const sum = values => values.reduce((total, value) => total + value, 0);
const clampProbability = value => Math.max(0, Math.min(1, value));

function requireData(condition, message) {
  if (!condition) throw new RangeError(message);
}

function summary(values) {
  const n = values.length;
  requireData(n > 0, 'Select at least one numeric value.');
  const mean = sum(values) / n;
  const ss = sum(values.map(value => (value - mean) ** 2));
  requireData(Number.isFinite(mean) && Number.isFinite(ss), 'The values are too large for this calculation.');
  return { n, mean, ss, variance: n > 1 ? ss / (n - 1) : null };
}

// Lanczos approximation for log Γ, evaluated here only for positive arguments.
function logGamma(x) {
  const coefficients = [
    676.5203681218851, -1259.1392167224028, 771.3234287776531, -176.6150291621406,
    12.507343278686905, -0.13857109526572012, 9.984369578019572e-6, 1.5056327351493116e-7,
  ];
  const z = x - 1;
  const series = coefficients.reduce((value, item, i) => value + item / (z + i + 1), 0.9999999999998099);
  const t = z + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(series);
}

const tolerance = 1e-14;
const nonzero = value => Math.abs(value) < 1e-300 ? (value < 0 ? -1e-300 : 1e-300) : value;

function betaFraction(a, b, x) {
  let c = 1;
  let d = 1 / nonzero(1 - (a + b) * x / (a + 1));
  let result = d;
  for (let m = 1; m <= 500; m++) {
    const twice = 2 * m;
    const even = m * (b - m) * x / ((a + twice - 1) * (a + twice));
    d = 1 / nonzero(1 + even * d);
    c = nonzero(1 + even / c);
    result *= d * c;
    const odd = -(a + m) * (a + b + m) * x / ((a + twice) * (a + twice + 1));
    d = 1 / nonzero(1 + odd * d);
    c = nonzero(1 + odd / c);
    const factor = d * c;
    result *= factor;
    if (Math.abs(factor - 1) < tolerance) return result;
  }
  throw new RangeError('The probability calculation did not converge.');
}

// Evaluate the smaller beta tail directly to preserve small p-values.
function regularizedBeta(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const scale = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log1p(-x));
  if (x < (a + 1) / (a + b + 2)) return clampProbability(scale * betaFraction(a, b, x) / a);
  return clampProbability(1 - scale * betaFraction(b, a, 1 - x) / b);
}

function gammaUpper(a, x) {
  if (x === 0) return 1;
  if (x === Infinity) return 0;
  const scale = Math.exp(a * Math.log(x) - x - logGamma(a));
  if (x < a + 1) {
    let term = 1 / a;
    let series = term;
    for (let i = 1; i <= 1000; i++) {
      term *= x / (a + i);
      series += term;
      if (Math.abs(term) < Math.abs(series) * tolerance) return clampProbability(1 - scale * series);
    }
  } else {
    let b = x + 1 - a;
    let c = 1e300;
    let d = 1 / b;
    let fraction = d;
    for (let i = 1; i <= 1000; i++) {
      const coefficient = i * (a - i);
      b += 2;
      d = 1 / nonzero(b + coefficient * d);
      c = nonzero(b + coefficient / c);
      const factor = c * d;
      fraction *= factor;
      if (Math.abs(factor - 1) < tolerance) return clampProbability(scale * fraction);
    }
  }
  throw new RangeError('The probability calculation did not converge.');
}

const tProbability = (t, df) => regularizedBeta(df / (df + t ** 2), df / 2, 0.5);

function tResult(difference, standardError, df, details) {
  requireData(standardError > 0, 'The estimated variation is zero, so this t-test is undefined.');
  const t = difference / standardError;
  return [['t', t], ['Degrees of freedom', df], ['p-value (two-sided)', tProbability(t, df)], ...details];
}

function oneSample(values, target, paired = false) {
  const { n, mean, variance } = summary(values);
  requireData(n > 1, 'Use at least two numeric observations.');
  const details = [[paired ? 'Complete pairs' : 'Sample size', n], [paired ? 'Mean difference (A − B)' : 'Sample mean', mean]];
  if (!paired) details.push(['Hypothesized mean', target]);
  return tResult(mean - target, Math.sqrt(variance / n), n - 1, details);
}

function welch(first, second) {
  const a = summary(first);
  const b = summary(second);
  requireData(a.n > 1 && b.n > 1, 'Use at least two numeric observations per sample.');
  const left = a.variance / a.n;
  const right = b.variance / b.n;
  const total = left + right;
  requireData(total > 0, 'The estimated variation is zero, so this t-test is undefined.');
  const df = 1 / ((left / total) ** 2 / (a.n - 1) + (right / total) ** 2 / (b.n - 1));
  return tResult(a.mean - b.mean, Math.sqrt(total), df,
    [['Sample size A', a.n], ['Sample size B', b.n], ['Mean difference (A − B)', a.mean - b.mean]]);
}

function pearson(pairs) {
  const n = pairs.length;
  requireData(n >= 3, 'Use at least three complete numeric pairs.');
  const a = summary(pairs.map(([value]) => value));
  const b = summary(pairs.map(([, value]) => value));
  requireData(a.ss > 0 && b.ss > 0, 'Both variables must vary to calculate a correlation.');
  const products = sum(pairs.map(([x, y]) => ((x - a.mean) / Math.sqrt(a.ss)) * ((y - b.mean) / Math.sqrt(b.ss))));
  const r = Math.max(-1, Math.min(1, products));
  const df = n - 2;
  const p = n === 3 ? 2 * Math.acos(Math.abs(r)) / Math.PI : regularizedBeta((1 - Math.abs(r)) * (1 + Math.abs(r)), df / 2, 0.5);
  return [['Pearson r', r], ['Degrees of freedom', df], ['p-value (two-sided)', p], ['Complete pairs', n]];
}

function anova(matrix) {
  requireData(matrix[0].length > 1, 'Select at least two columns, one per group.');
  const groups = matrix[0].map((_, col) => matrix.map(row => row[col]).filter(Number.isFinite));
  requireData(groups.every(group => group.length >= 2), 'Use at least two numeric observations in every group column.');
  const overall = summary(groups.flat());
  const samples = groups.map(summary);
  const within = sum(samples.map(group => group.ss));
  const between = sum(samples.map(group => group.n * (group.mean - overall.mean) ** 2));
  const df1 = groups.length - 1;
  const df2 = overall.n - groups.length;
  requireData(within > 0, 'Within-group variation is zero, so this ANOVA is undefined.');
  const f = (between / df1) / (within / df2);
  return [['F', f], ['Degrees of freedom (between)', df1], ['Degrees of freedom (within)', df2],
    ['p-value', regularizedBeta(df2 / (df2 + df1 * f), df2 / 2, df1 / 2)], ['Groups', groups.length], ['Observations', overall.n]];
}

function chiSquare(matrix) {
  const rows = matrix.length;
  const cols = matrix[0].length;
  requireData(rows >= 2 && cols >= 2, 'Select a table of at least two rows and two columns.');
  requireData(matrix.flat().every(value => Number.isSafeInteger(value) && value >= 0),
    'Use only nonnegative whole-number counts. Leave out labels, blanks, and totals.');
  const rowTotals = matrix.map(sum);
  const colTotals = matrix[0].map((_, col) => sum(matrix.map(row => row[col])));
  requireData(rowTotals.every(Boolean) && colTotals.every(Boolean), 'Each row and column needs a positive total.');
  const n = sum(rowTotals);
  let statistic = 0;
  let belowFive = 0;
  let belowOne = false;
  matrix.forEach((row, i) => row.forEach((count, j) => {
    const expected = rowTotals[i] * (colTotals[j] / n);
    statistic += (count - expected) ** 2 / expected;
    if (expected < 5) belowFive++;
    if (expected < 1) belowOne = true;
  }));
  const df = (rows - 1) * (cols - 1);
  const notes = belowOne || belowFive > 0.2 * rows * cols
    ? ['Some expected counts are small. The chi-square p-value may be unreliable.'] : [];
  return { rows: [['χ²', statistic], ['Degrees of freedom', df], ['p-value', gammaUpper(df / 2, statistic / 2)], ['Total count', n]], notes };
}

const valuesFrom = matrix => matrix.flat().filter(Number.isFinite);

export function analyze(test, first, second, target) {
  let rows;
  const notes = [];
  switch (test) {
    case 'describe': {
      const values = valuesFrom(first).sort((a, b) => a - b);
      const { n, mean, variance } = summary(values);
      const median = n % 2 ? values[Math.floor(n / 2)] : values[n / 2 - 1] / 2 + values[n / 2] / 2;
      rows = [['Count', n], ['Mean', mean], ['Median', median], ['Sample standard deviation', variance === null ? null : Math.sqrt(variance)],
        ['Minimum', values[0]], ['Maximum', values[n - 1]]];
      break;
    }
    case 'one-sample':
      requireData(Number.isFinite(target), 'Enter a finite hypothesized mean.');
      rows = oneSample(valuesFrom(first), target);
      break;
    case 'welch':
      rows = welch(valuesFrom(first), valuesFrom(second));
      break;
    case 'paired':
    case 'pearson': {
      requireData(first.length === second.length && first[0].length === second[0].length, 'Use ranges with the same number of rows and columns.');
      const counterparts = second.flat();
      const all = first.flat().map((value, i) => [value, counterparts[i]]);
      const pairs = all.filter(pair => pair.every(Number.isFinite));
      rows = test === 'paired' ? oneSample(pairs.map(([a, b]) => a - b), 0, true) : pearson(pairs);
      if (pairs.length < all.length) notes.push(`${all.length - pairs.length} incomplete or nonnumeric pairs skipped.`);
      break;
    }
    case 'anova':
      rows = anova(first);
      break;
    case 'chi-square':
      return checkResults(chiSquare(first));
    default:
      throw new RangeError('Choose a supported analysis.');
  }
  return checkResults({ rows, notes });
}

function checkResults(result) {
  requireData(result.rows.every(([, value]) => value === null || Number.isFinite(value)),
    'The values are too large or too small to calculate a reliable result.');
  return result;
}
