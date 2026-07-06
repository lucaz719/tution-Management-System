import { ISmsSender } from '@tms/types';

export class MockSmsSender implements ISmsSender {
  private static sentLogs: { to: string; message: string; timestamp: Date }[] = [];

  async sendSms(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    console.log(`[SMS Gateway] Sending SMS to ${to}: "${message}"`);
    const messageId = `sms-id-${Math.floor(Math.random() * 1000000)}`;
    MockSmsSender.sentLogs.push({ to, message, timestamp: new Date() });
    return { success: true, messageId };
  }

  static getLogs() {
    return this.sentLogs;
  }

  static clearLogs() {
    this.sentLogs = [];
  }
}

export class MockPushNotificationService {
  private static sentLogs: { userId: string; title: string; body: string; timestamp: Date }[] = [];

  static async sendPush(userId: string, title: string, body: string): Promise<{ success: boolean; notificationId: string }> {
    console.log(`[FCM Push] Sending notification to user ${userId} - Title: "${title}", Body: "${body}"`);
    const notificationId = `push-id-${Math.floor(Math.random() * 1000000)}`;
    this.sentLogs.push({ userId, title, body, timestamp: new Date() });
    return { success: true, notificationId };
  }

  static getLogs() {
    return this.sentLogs;
  }

  static clearLogs() {
    this.sentLogs = [];
  }
}
