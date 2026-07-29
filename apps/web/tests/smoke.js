import { Selector } from 'testcafe';

fixture `TMS Smoke Test`
    .page `http://localhost:5173/login`;

const smokeEmail = process.env.TMS_SMOKE_EMAIL;
const smokePassword = process.env.TMS_SMOKE_PASSWORD;

test('Tenant Admin can authenticate and open critical workspaces', async t => {
    // Wait for the login page to load
    const title = Selector('.auth-form-title').withText('Sign in to TMS');
    await t.expect(title.exists).ok({ timeout: 15000 });

    const emailInput = Selector('#login-email');
    const passwordInput = Selector('#login-password');
    if (!smokeEmail || !smokePassword) {
        await t.expect(emailInput.value).eql('');
        await t.expect(passwordInput.value).eql('');
        return;
    }

    await t.typeText(emailInput, smokeEmail);
    await t.typeText(passwordInput, smokePassword);

    // Click submit button
    const submitBtn = Selector('.auth-submit-btn');
    await t.click(submitBtn);

    const twoFactorTitle = Selector('.auth-form-title').withText('Two-Factor Authentication');
    const dashboardTitle = Selector('h1').withText('Dashboard');
    await t.wait(2000);

    if (await twoFactorTitle.exists) {
        for (let i = 1; i <= 6; i++) {
            const digitInput = Selector(`input[aria-label="Digit ${i} of 6"]`);
            await t.expect(digitInput.exists).ok({ timeout: 5000 });
            await t.typeText(digitInput, String(i));
        }
    }

    await t.expect(dashboardTitle.exists).ok({ timeout: 15000 });

    const criticalRoutes = [
        ['/tenant/admissions', 'Admissions'],
        ['/tenant/petty-cash', 'Petty Cash'],
        ['/tenant/payroll', 'Payroll'],
        ['/tenant/pl-reports', 'P&L Reports'],
        ['/tenant/resource-logs', 'Resource Logs'],
        ['/tenant/academic-calendar', 'Academic Calendar'],
    ];
    for (const [route, heading] of criticalRoutes) {
        await t.navigateTo(`http://localhost:5173${route}`);
        await t.expect(Selector('h1').withText(heading).exists).ok({ timeout: 10000 });
        await t.expect(Selector('body').withText('construction').exists).notOk();
    }
});
