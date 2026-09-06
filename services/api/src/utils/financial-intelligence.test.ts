import assert from 'node:assert/strict';
import { buildFinancialIntelligence } from './financial-intelligence';

const now = new Date(2026, 7, 15);
const result = buildFinancialIntelligence({
  now,
  projectedIncomeNpr: 100_000,
  activeEnrollments: 10,
  expenses: [
    { category: 'RENT', amount: 20_000, date: new Date(2026, 4, 1) },
    { category: 'RENT', amount: 20_000, date: new Date(2026, 5, 1) },
    { category: 'UTILITIES', amount: 5_000, date: new Date(2026, 5, 5) },
    { category: 'UTILITIES', amount: 5_000, date: new Date(2026, 6, 5) },
    { category: 'UTILITIES', amount: 8_000, date: new Date(2026, 7, 5) },
  ],
  payrolls: [
    { netPayable: 10_000, month: 6, year: 2026 },
    { netPayable: 10_000, month: 7, year: 2026 },
    { netPayable: 14_000, month: 8, year: 2026 },
  ],
});

assert.equal(result.alerts.length, 3);
assert.ok(result.alerts.some((alert) => alert.category === 'RENT' && alert.type === 'MISSING_EXPENSE_ALERT'));
assert.ok(result.alerts.some((alert) => alert.category === 'UTILITIES' && alert.currentAmountNpr === 8_000));
assert.ok(result.alerts.some((alert) => alert.category === 'PAYROLL' && alert.currentAmountNpr === 14_000));
assert.deepEqual(result.budgetAnalysis, {
  activeEnrollments: 10,
  projectedIncomeNpr: 100_000,
  projectedCostsNpr: 22_000,
  projectedSurplusNpr: 78_000,
  basis: 'Current active enrollment fees minus expenses and payroll recorded for the current month.',
});

const empty = buildFinancialIntelligence({
  now,
  projectedIncomeNpr: 0,
  activeEnrollments: 0,
  expenses: [],
  payrolls: [],
});
assert.deepEqual(empty.alerts, []);
assert.equal(empty.budgetAnalysis.projectedSurplusNpr, 0);

console.log('financial intelligence tests passed');
