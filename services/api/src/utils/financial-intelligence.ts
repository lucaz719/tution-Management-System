type ExpenseSample = {
  category: string;
  amount: number;
  date: Date;
};

type PayrollSample = {
  netPayable: number;
  month: number;
  year: number;
};

export type FinancialAlert = {
  type: 'MISSING_EXPENSE_ALERT' | 'ANOMALY_DETECTION';
  severity: 'HIGH' | 'WARNING';
  message: string;
  category: string;
  currentAmountNpr: number;
  baselineAmountNpr: number;
};

function monthKey(year: number, zeroBasedMonth: number) {
  return `${year}-${String(zeroBasedMonth + 1).padStart(2, '0')}`;
}

function previousMonthKeys(now: Date, count: number) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - index - 1, 1);
    return monthKey(date.getFullYear(), date.getMonth());
  });
}

function roundNpr(value: number) {
  return Math.round(value * 100) / 100;
}

export function buildFinancialIntelligence(input: {
  now: Date;
  expenses: ExpenseSample[];
  payrolls: PayrollSample[];
  projectedIncomeNpr: number;
  activeEnrollments: number;
}) {
  const currentKey = monthKey(input.now.getFullYear(), input.now.getMonth());
  const baselineKeys = previousMonthKeys(input.now, 3);
  const expenseByCategory = new Map<string, Map<string, number>>();

  for (const expense of input.expenses) {
    const category = expense.category.trim().toUpperCase() || 'OTHER';
    const key = monthKey(expense.date.getFullYear(), expense.date.getMonth());
    const monthly = expenseByCategory.get(category) ?? new Map<string, number>();
    monthly.set(key, (monthly.get(key) ?? 0) + Number(expense.amount));
    expenseByCategory.set(category, monthly);
  }

  const alerts: FinancialAlert[] = [];
  for (const [category, monthly] of expenseByCategory) {
    const historical = baselineKeys.map((key) => monthly.get(key) ?? 0);
    const monthsRecorded = historical.filter((amount) => amount > 0).length;
    if (monthsRecorded < 2) continue;

    const baseline = historical.reduce((sum, amount) => sum + amount, 0) / monthsRecorded;
    const current = monthly.get(currentKey) ?? 0;
    if (current === 0) {
      alerts.push({
        type: 'MISSING_EXPENSE_ALERT',
        severity: 'HIGH',
        category,
        currentAmountNpr: 0,
        baselineAmountNpr: roundNpr(baseline),
        message: `${category} was recorded in ${monthsRecorded} of the previous 3 months, but no entry exists for the current month.`,
      });
    } else if (current > baseline * 1.3) {
      alerts.push({
        type: 'ANOMALY_DETECTION',
        severity: 'WARNING',
        category,
        currentAmountNpr: roundNpr(current),
        baselineAmountNpr: roundNpr(baseline),
        message: `${category} expenses are ${Math.round(((current - baseline) / baseline) * 100)}% above the recent monthly baseline.`,
      });
    }
  }

  const payrollTotals = new Map<string, number>();
  for (const payroll of input.payrolls) {
    const key = monthKey(payroll.year, payroll.month - 1);
    payrollTotals.set(key, (payrollTotals.get(key) ?? 0) + Number(payroll.netPayable));
  }
  const historicalPayroll = baselineKeys.map((key) => payrollTotals.get(key) ?? 0).filter((amount) => amount > 0);
  const currentPayroll = payrollTotals.get(currentKey) ?? 0;
  if (historicalPayroll.length >= 2 && currentPayroll > 0) {
    const baseline = historicalPayroll.reduce((sum, amount) => sum + amount, 0) / historicalPayroll.length;
    if (currentPayroll > baseline * 1.3) {
      alerts.push({
        type: 'ANOMALY_DETECTION',
        severity: 'WARNING',
        category: 'PAYROLL',
        currentAmountNpr: roundNpr(currentPayroll),
        baselineAmountNpr: roundNpr(baseline),
        message: `Payroll is ${Math.round(((currentPayroll - baseline) / baseline) * 100)}% above the recent monthly baseline.`,
      });
    }
  }

  const currentExpenses = Array.from(expenseByCategory.values())
    .reduce((sum, monthly) => sum + (monthly.get(currentKey) ?? 0), 0);
  const projectedCostsNpr = roundNpr(currentExpenses + currentPayroll);
  const projectedSurplusNpr = roundNpr(input.projectedIncomeNpr - projectedCostsNpr);

  return {
    alerts,
    budgetAnalysis: {
      activeEnrollments: input.activeEnrollments,
      projectedIncomeNpr: roundNpr(input.projectedIncomeNpr),
      projectedCostsNpr,
      projectedSurplusNpr,
      basis: 'Current active enrollment fees minus expenses and payroll recorded for the current month.',
    },
  };
}
