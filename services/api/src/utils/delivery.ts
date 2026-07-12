// Verification-code delivery transport.
//
// There is no client domain/SMTP yet, so codes are printed to the server
// console in development. When a real channel exists (Brevo/SendGrid verified
// single sender, Sparrow SMS, ...), replace the body of sendVerificationCode —
// nothing else in the auth flows needs to change.
export async function sendVerificationCode(
  email: string,
  code: string,
  purpose: 'PASSWORD_RESET' | 'TWO_FACTOR'
): Promise<void> {
  const label = purpose === 'PASSWORD_RESET' ? 'Password reset' : 'Two-factor';
  console.log(`[otp] ${label} code for ${email}: ${code} (valid 5 minutes)`);
}
