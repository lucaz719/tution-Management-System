import { ISmsSender } from '@tms/types';

const AAKASH_SMS_ENDPOINT = 'https://sms.aakashsms.com/sms/v3/send';

type AakashSmsResponse = {
  error?: boolean | string | number;
  status?: string | number;
  message?: string;
  message_id?: string | number;
  messageId?: string | number;
  id?: string | number;
  [key: string]: unknown;
};

function normaliseNepalPhoneNumber(value: string): string {
  // Aakash accepts Nepali numbers. Normalising the most common local formats
  // here keeps callers from accidentally sending an unusable number.
  const digits = value.replace(/[\s()-]/g, '');
  if (/^\+977\d{10}$/.test(digits)) return digits.slice(1);
  if (/^977\d{10}$/.test(digits)) return digits;
  if (/^\d{10}$/.test(digits)) return `977${digits}`;
  return digits;
}

function maskPhoneNumber(value: string): string {
  return `${'*'.repeat(Math.max(0, value.length - 4))}${value.slice(-4)}`;
}

// Concrete Adapter for Mock SMS gateway (used in development and testing)
export class MockSmsSender implements ISmsSender {
  async sendSms(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    console.log(`[SMS Gateway SIMULATION] To: ${to} | Content: "${message}"`);
    return {
      success: true,
      messageId: 'mock-sms-' + Math.random().toString(36).substr(2, 9),
    };
  }
}

// Concrete adapter for Aakash SMS API v3.
// Docs: POST/GET https://sms.aakashsms.com/sms/v3/send
// Parameters: auth_token, to, text
export class AakashSmsSender implements ISmsSender {
  constructor(private readonly authToken: string) {}

  async sendSms(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const recipient = normaliseNepalPhoneNumber(to);

    if (!/^977\d{10}$/.test(recipient)) {
      return { success: false, error: 'A valid Nepali mobile number is required.' };
    }
    if (!message.trim()) {
      return { success: false, error: 'SMS text cannot be empty.' };
    }

    try {
      const response = await fetch(AAKASH_SMS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ auth_token: this.authToken, to: recipient, text: message }).toString(),
        signal: AbortSignal.timeout(15_000),
      });
      const rawBody = await response.text();
      let body: AakashSmsResponse | undefined;

      try {
        body = JSON.parse(rawBody) as AakashSmsResponse;
      } catch {
        // Aakash may return a non-JSON gateway error. Keep it out of logs and
        // return a safe, actionable failure to the caller.
      }

      const apiError = body?.error === true || body?.error === 'true' || body?.error === 1;
      if (!response.ok || apiError) {
        return {
          success: false,
          error: body?.message || `Aakash SMS request failed (${response.status}).`,
        };
      }

      const messageId = body?.message_id ?? body?.messageId ?? body?.id;
      console.info(`[Aakash SMS] Message accepted for ${maskPhoneNumber(recipient)}`);
      return { success: true, messageId: messageId == null ? undefined : String(messageId) };
    } catch (error) {
      console.error('[Aakash SMS] Request failed:', error instanceof Error ? error.message : 'Unknown error');
      return { success: false, error: 'Unable to reach Aakash SMS. Please try again.' };
    }
  }
}

// Factory to resolve the SMS Sender based on environment configuration
export function getSmsSender(): ISmsSender {
  const provider = (process.env.SMS_PROVIDER || 'MOCK').toUpperCase();
  const token = process.env.AAKASH_SMS_AUTH_TOKEN || '';

  if (provider === 'AAKASH') {
    if (!token) {
      console.warn('[Aakash SMS] AAKASH_SMS_AUTH_TOKEN is not configured; using mock delivery.');
      return new MockSmsSender();
    }
    return new AakashSmsSender(token);
  }

  return new MockSmsSender();
}

const smsSender = getSmsSender();
export default smsSender;
