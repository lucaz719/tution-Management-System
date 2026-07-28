import { Selector } from 'testcafe';

fixture `TMS Smoke Test`
    .page `http://localhost:5173/login`;

const smokeEmail = process.env.TMS_SMOKE_EMAIL;
const smokePassword = process.env.TMS_SMOKE_PASSWORD;

test('Should login and complete 2FA flow successfully as Tenant Admin', async t => {
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

    // Should redirect to 2FA page
    const twoFactorTitle = Selector('.auth-form-title').withText('Two-Factor Authentication');
    await t.expect(twoFactorTitle.exists).ok({ timeout: 15000 });

    // Fill the 6-digit OTP code '123456'
    for (let i = 1; i <= 6; i++) {
        const digitInput = Selector(`input[aria-label="Digit ${i} of 6"]`);
        await t.expect(digitInput.exists).ok({ timeout: 5000 });
        await t.typeText(digitInput, String(i));
    }

    // After typing the 6th digit, it should automatically submit and redirect to dashboard
    const dashboardHeader = Selector('h3').withText('Enterprise Financial Center');
    await t.expect(dashboardHeader.exists).ok({ timeout: 15000 });
});
