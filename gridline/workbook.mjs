import { address } from './formulas.mjs';

export const STORAGE_KEY = 'gridline.workbook.v1';

export function initialWorkbook() {
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
