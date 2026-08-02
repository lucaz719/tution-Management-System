// Verification-code delivery transport.
//
// There is no client domain/SMTP yet, so codes are printed to the server
// console in development. When a real channel exists (Brevo/SendGrid verified
// single sender, Sparrow SMS, ...), replace the body of sendVerificationCode —
// nothing else in the auth flows needs to change.
const mockVerificationCodes = new Map<string, string>();

function mockCodeKey(email: string, purpose: 'PASSWORD_RESET' | 'TWO_FACTOR'): string {
  return `${purpose}:${email.trim().toLowerCase()}`;
}

// Test support only: this remains process-private and is never exposed by an
// HTTP endpoint. Production delivery must not use the MOCK provider.
export function getMockVerificationCodeForTest(
  email: string,
  purpose: 'PASSWORD_RESET' | 'TWO_FACTOR',
): string | undefined {
  return mockVerificationCodes.get(mockCodeKey(email, purpose));
}

export async function sendVerificationCode(
  email: string,
  code: string,
  purpose: 'PASSWORD_RESET' | 'TWO_FACTOR'
): Promise<void> {
  const label = purpose === 'PASSWORD_RESET' ? 'Password reset' : 'Two-factor';
  if (process.env.SMS_PROVIDER === 'MOCK') {
    mockVerificationCodes.set(mockCodeKey(email, purpose), code);
  }
  console.log(`[otp] ${label} code for ${email}: ${code} (valid 5 minutes)`);
}
