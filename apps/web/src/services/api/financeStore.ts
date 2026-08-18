export interface StudentSubscription {
  studentId: string;
  studentName: string;
  grade: string;
  branchName: string;
  monthlyRate: number;
  startDate: string;
  endDate: string;
}

export interface TeacherContract {
  teacherId: string;
  teacherName: string;
  branchName: string;
  baseSalary: number;
}

export interface InvoiceRecord {
  id: string;
  studentId: string;
  studentName: string;
  branchName: string;
  amount: number;
  discount: number;
  netPayable: number;
  status: 'PAID' | 'DUE' | 'OVERDUE' | 'PENDING';
  dueDate: string;
  billingCycleStart: string;
  billingCycleEnd: string;
  transactionId: string | null;
  purpose?: string;
}

export interface PayrollRecord {
  id: string;
  teacherId: string;
  teacherName: string;
  branchName: string;
  month: string;
  base: number;
  extra: number;
  deductions: number;
  net: number;
  status: 'PAID' | 'PENDING';
  purpose?: string;
}

// Initial Mock Data
let subscriptions: StudentSubscription[] = [
  { studentId: 'S001', studentName: 'Aakash Bista', grade: 'Grade 10', branchName: 'Main Branch', monthlyRate: 15000, startDate: '2026-01-01', endDate: '2026-12-31' },
  { studentId: 'S002', studentName: 'Priya Gurung', grade: 'Grade 8', branchName: 'East Wing', monthlyRate: 12000, startDate: '2026-02-01', endDate: '2027-01-31' },
  { studentId: 'S003', studentName: 'Rohan Sharma', grade: 'Grade 10', branchName: 'Main Branch', monthlyRate: 18000, startDate: '2026-03-01', endDate: '2027-02-28' },
  { studentId: 'S004', studentName: 'Neha Shrestha', grade: 'Grade 9', branchName: 'East Wing', monthlyRate: 14000, startDate: '2026-04-01', endDate: '2027-03-31' },
];

let contracts: TeacherContract[] = [
  { teacherId: 'T001', teacherName: 'Sanjay Rai', branchName: 'Main Branch', baseSalary: 45000 },
  { teacherId: 'T002', teacherName: 'Rina Karki', branchName: 'East Wing', baseSalary: 40000 },
];

let invoices: InvoiceRecord[] = [
  { id: 'INV-1001', studentId: 'S001', studentName: 'Aakash Bista', branchName: 'Main Branch', amount: 15000, discount: 0, netPayable: 15000, status: 'PAID', dueDate: '2026-07-20', billingCycleStart: '2026-07-01', billingCycleEnd: '2026-07-31', transactionId: 'TXN-ABC-123' },
  { id: 'INV-1002', studentId: 'S002', studentName: 'Priya Gurung', branchName: 'East Wing', amount: 12000, discount: 0, netPayable: 12000, status: 'DUE', dueDate: '2026-08-20', billingCycleStart: '2026-08-01', billingCycleEnd: '2026-08-31', transactionId: null },
];

let payrolls: PayrollRecord[] = [
  { id: 'PAY-2001', teacherId: 'T001', teacherName: 'Sanjay Rai', branchName: 'Main Branch', month: 'July 2026', base: 45000, extra: 5000, deductions: 2000, net: 48000, status: 'PAID' },
  { id: 'PAY-2002', teacherId: 'T002', teacherName: 'Rina Karki', branchName: 'East Wing', month: 'July 2026', base: 40000, extra: 0, deductions: 2000, net: 38000, status: 'PENDING' },
];

export const financeStore = {
  getInvoices: () => invoices,
  getPayrolls: () => payrolls,
  getSubscriptions: () => subscriptions,
  getContracts: () => contracts,

  createInvoice: (record: Omit<InvoiceRecord, 'id'>) => {
    const newInvoice: InvoiceRecord = {
      ...record,
      id: `INV-${Date.now()}`
    };
    invoices = [newInvoice, ...invoices];
    return newInvoice;
  },

  createPayroll: (record: Omit<PayrollRecord, 'id'>) => {
    const newPayroll: PayrollRecord = {
      ...record,
      id: `PAY-${Date.now()}`
    };
    payrolls = [newPayroll, ...payrolls];
    return newPayroll;
  },
  
  markInvoicePaid: (id: string, transactionId: string) => {
    invoices = invoices.map(i => i.id === id ? { ...i, status: 'PAID', transactionId } : i);
  },

  getMrrProjections: () => {
    // Current MRR is the sum of all active student subscriptions
    const currentMrr = subscriptions.reduce((sum, sub) => sum + sub.monthlyRate, 0);
    // ARR is 12 * MRR
    const projectedArr = currentMrr * 12;
    // Monthly Operating Costs (Teacher base salaries)
    const monthlyCosts = contracts.reduce((sum, con) => sum + con.baseSalary, 0);
    
    // Past 30 days collected (Simulated from PAID invoices this month, but we'll just sum PAID invoices)
    const collectedThisMonth = invoices.filter(i => i.status === 'PAID').reduce((sum, i) => sum + i.netPayable, 0);

    return {
      currentMrr,
      projectedArr,
      monthlyCosts,
      collectedThisMonth,
      netMarginMrr: currentMrr - monthlyCosts
    };
  }
};
