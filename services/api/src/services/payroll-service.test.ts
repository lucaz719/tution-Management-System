import assert from 'node:assert/strict';
import { compensationStructure, salaryStructureFor } from './payroll-service';

const fixed = compensationStructure('FIXED', { baseMonthlySalary: 32_000 });
assert.deepEqual(fixed, { success: true, value: { baseMonthlySalary: 32_000 } });

const hourly = compensationStructure('HOUR_RATE', { hourlyRate: 500 });
assert.deepEqual(hourly, { success: true, value: { hourlyRate: 500 } });

assert.equal(compensationStructure('FIXED', {}).success, false);
assert.equal(compensationStructure('HOUR_RATE', {}).success, false);
assert.equal(compensationStructure('CASUAL', {}).success, false);
assert.deepEqual(salaryStructureFor('FIXED', 45_000), { baseMonthlySalary: 45_000 });
assert.deepEqual(salaryStructureFor('HOUR_RATE', 750), { hourlyRate: 750 });

console.log('payroll compensation contract tests passed');
