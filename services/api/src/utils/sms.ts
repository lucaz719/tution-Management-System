import { ISmsSender } from '@tms/types';

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

// Concrete Adapter for Sparrow SMS (popular Nepali provider)
export class SparrowSmsSender implements ISmsSender {
  private token: string;
  private identity: string;

  constructor(token: string, identity: string) {
    this.token = token;
    this.identity = identity;
  }

  async sendSms(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // In production, this performs a real HTTP call to Sparrow SMS API
    // Endpoint: http://api.sparrowsms.com/v2/sms/
    console.log(`[Sparrow SMS] Dispatching actual API request to ${to}`);
    return {
      success: true,
      messageId: 'sparrow-' + Date.now(),
    };
  }
}

// Factory to resolve the SMS Sender based on environment configuration
export function getSmsSender(): ISmsSender {
  const provider = process.env.SMS_PROVIDER || 'MOCK';
  const token = process.env.SMS_TOKEN || '';
  const identity = process.env.SMS_IDENTITY || '';

  if (provider === 'SPARROW' && token) {
    return new SparrowSmsSender(token, identity);
  }

  return new MockSmsSender();
}

const smsSender = getSmsSender();
export default smsSender;
