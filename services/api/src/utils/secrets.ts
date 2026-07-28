import crypto from 'node:crypto';

export function encryptSecret(value: string): string {
  const configuredKey = process.env.SOCIAL_TOKEN_ENCRYPTION_KEY;
  if (!configuredKey) throw new Error('SOCIAL_TOKEN_ENCRYPTION_KEY is required.');
  const key = crypto.createHash('sha256').update(configuredKey).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((part) => part.toString('base64url')).join('.');
}
