import { Selector } from 'testcafe';

fixture `TMS Smoke Test`
    .page `http://localhost:5173/login?demo=true`;

test('Should login and complete 2FA flow successfully as Tenant Admin', async t => {
    // Wait for the login page to load
    const title = Selector('.auth-form-title').withText('Sign in to TMS');
    await t.expect(title.exists).ok({ timeout: 15000 });

    // Select the Tenant Admin demo quick fill button
    const tenantAdminBtn = Selector('button.auth-link-button').withText('Tenant Admin');
    await t.expect(tenantAdminBtn.exists).ok({ timeout: 5000 });
    await t.click(tenantAdminBtn);

    // Verify email and password fields are filled
    const emailInput = Selector('#login-email');
    const passwordInput = Selector('#login-password');
    await t.expect(emailInput.value).eql('admin@pinnacle.edu.np');
    await t.expect(passwordInput.value).eql('PinnacleAdmin777!');

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
