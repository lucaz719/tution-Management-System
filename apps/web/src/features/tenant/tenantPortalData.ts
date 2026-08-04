import type { Expense, ProfitLoss } from '../../services/api/finance';
import type { AcademicEvent } from '../../services/api/academicEvents';

export interface TenantDashboardData {
  activeStudentsCount: number;
  activeTeachersCount: number;
  totalOverdueAmountNpr: number;
  pendingLeaveRequestsCount: number;
  branchSummary: Array<{
    branchId: string;
    branchName: string;
    activeStudents: number;
    staffRoles: number;
  }>;
}

export interface FinancialForecast {
  billingCycle: string;
  metrics: {
    baseForecastNpr: number;
    estimatedAttritionNpr: number;
    attritionPercentage: string;
    netForecastNpr: number;
    actualCollectedNpr: number;
    varianceNpr: number;
    activeEnrollments: number;
  };
}

export interface FinancialSignal {
  type: string;
  severity: 'HIGH' | 'MEDIUM' | 'WARNING' | 'INFO';
  message: string;
}

export interface FinancialSuggestions {
  alerts: FinancialSignal[];
  budgetAnalysis: {
    projectedSurplusNpr: number;
    promptText: string;
  };
}

export const tenantDashboardMock: TenantDashboardData = {
  activeStudentsCount: 486,
  activeTeachersCount: 34,
  totalOverdueAmountNpr: 184500,
  pendingLeaveRequestsCount: 7,
  branchSummary: [
    { branchId: 'demo-main', branchName: 'TMS Main Center', activeStudents: 218, staffRoles: 28 },
    { branchId: 'demo-lakeside', branchName: 'Lakeside Learning Hub', activeStudents: 156, staffRoles: 19 },
    { branchId: 'demo-east', branchName: 'East Wing Academy', activeStudents: 112, staffRoles: 15 },
  ],
};

export const tenantProfitLossMock: ProfitLoss = {
  revenue: 1847500,
  operatingCosts: 1163250,
  netMargin: 684250,
  month: 'August 2026',
};

export const tenantExpensesMock: Expense[] = [
  { id: 'demo-expense-1', category: 'Rent', amount: 240000, description: 'Monthly rent for three learning centers', date: '2026-08-01', branchId: 'demo-main' },
  { id: 'demo-expense-2', category: 'Payroll', amount: 685000, description: 'Teacher and support staff payroll', date: '2026-08-02', branchId: 'demo-main' },
  { id: 'demo-expense-3', category: 'Utilities', amount: 78250, description: 'Electricity, internet, and water', date: '2026-08-03', branchId: 'demo-main' },
  { id: 'demo-expense-4', category: 'Learning materials', amount: 96000, description: 'Books, lab supplies, and classroom stationery', date: '2026-08-04', branchId: 'demo-lakeside' },
  { id: 'demo-expense-5', category: 'Maintenance', amount: 64000, description: 'Classroom repairs and equipment servicing', date: '2026-08-05', branchId: 'demo-east' },
];

export const tenantForecastMock: FinancialForecast = {
  billingCycle: 'August 2026',
  metrics: {
    baseForecastNpr: 2015000,
    estimatedAttritionNpr: 80600,
    attritionPercentage: '4.0%',
    netForecastNpr: 1934400,
    actualCollectedNpr: 1847500,
    varianceNpr: -86900,
    activeEnrollments: 486,
  },
};

export const tenantSuggestionsMock: FinancialSuggestions = {
  alerts: [
    { type: 'COLLECTION_FOLLOW_UP', severity: 'HIGH', message: 'NPR 184,500 is overdue across 23 student accounts. Prioritize invoices older than 30 days.' },
    { type: 'COST_PATTERN', severity: 'MEDIUM', message: 'Utilities are 8% above the three-month average. Review the Lakeside and East Wing bills.' },
    { type: 'FORECAST_GAP', severity: 'WARNING', message: 'Collections are NPR 86,900 below the current net forecast.' },
  ],
  budgetAnalysis: {
    projectedSurplusNpr: 684250,
    promptText: 'Current collections cover operating costs with a projected 37.0% margin. Preserve the maintenance reserve and follow up overdue tuition before adding discretionary expenses.',
  },
};

const calendarYear = new Date().getFullYear();
const calendarMonth = new Date().getMonth();
const calendarDate = (day: number, hour = 9) => new Date(calendarYear, calendarMonth, day, hour).toISOString();

export const tenantAcademicEventsMock: AcademicEvent[] = [
  { id: 'demo-event-1', branchId: null, title: 'Monthly parent orientation', description: 'Institution-wide session for academic planning and student support.', eventType: 'EVENT', startDate: calendarDate(6, 11), endDate: calendarDate(6, 13) },
  { id: 'demo-event-2', branchId: null, title: 'First terminal examination', description: 'First terminal examinations begin across all branches.', eventType: 'EXAM', startDate: calendarDate(12, 8), endDate: calendarDate(16, 16) },
  { id: 'demo-event-3', branchId: null, title: 'Monthly tuition due', description: 'Final date for the current monthly tuition payment.', eventType: 'FEE_DUE', startDate: calendarDate(20, 9), endDate: calendarDate(20, 17) },
  { id: 'demo-event-4', branchId: null, title: 'Institution holiday', description: 'All classes and administrative offices remain closed.', eventType: 'HOLIDAY', startDate: calendarDate(25, 0), endDate: calendarDate(25, 23) },
];

export function withMockWhenEmpty<T>(live: T[] | null | undefined, fallback: T[]): T[] {
  return live?.length ? live : fallback;
}
