import crypto from 'node:crypto';

function key() {
  const secret = process.env.ADMISSION_DELIVERY_SECRET || process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error('Admission delivery requires a stable secret of at least 32 characters.');
  return crypto.createHash('sha256').update(`tms-admission-delivery-v1:${secret}`).digest();
}

export function encryptDeliveryPayload(id: string, payload: { phone: string; message: string }) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  cipher.setAAD(Buffer.from(id));
  const data = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map(part => part.toString('base64')).join('.');
}

export function decryptDeliveryPayload(id: string, encrypted: string): { phone: string; message: string } {
  const [iv, tag, data] = encrypted.split('.').map(part => Buffer.from(part, 'base64'));
  const cipher = crypto.createDecipheriv('aes-256-gcm', key(), iv);
  cipher.setAAD(Buffer.from(id));
  cipher.setAuthTag(tag);
  return JSON.parse(Buffer.concat([cipher.update(data), cipher.final()]).toString('utf8'));
}
