import crypto from 'node:crypto';
import forge from 'node-forge';
import prisma from './db';

interface ConnectIpsConfig {
  merchantId: number;
  appId: string;
  appName: string;
  pfxBase64: string;
  pfxPassword: string;
  validatePassword: string;
  gatewayUrl: string;
  validateUrl: string;
}

export interface ConnectIpsForm {
  gatewayUrl: string;
  fields: Record<string, string>;
}

interface ValidationResponse {
  status?: string;
  statusDesc?: string;
  responseCode?: string;
  [key: string]: unknown;
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required when connectIPS is enabled.`);
  return value;
}

export function connectIpsConfig(): ConnectIpsConfig {
  if (process.env.CONNECTIPS_ENABLED !== 'true') {
    throw new Error('connectIPS is not enabled.');
  }
  const merchantId = Number(required('CONNECTIPS_MERCHANT_ID'));
  if (!Number.isSafeInteger(merchantId) || merchantId <= 0) {
    throw new Error('CONNECTIPS_MERCHANT_ID must be a positive integer.');
  }
  const appId = required('CONNECTIPS_APP_ID');
  const appName = required('CONNECTIPS_APP_NAME');
  if (appId.length > 15) throw new Error('CONNECTIPS_APP_ID exceeds 15 characters.');
  if (appName.length > 30) throw new Error('CONNECTIPS_APP_NAME exceeds 30 characters.');
  return {
    merchantId,
    appId,
    appName,
    pfxBase64: required('CONNECTIPS_PFX_BASE64'),
    pfxPassword: required('CONNECTIPS_PFX_PASSWORD'),
    validatePassword: required('CONNECTIPS_VALIDATE_PASSWORD'),
    gatewayUrl: required('CONNECTIPS_GATEWAY_URL'),
    validateUrl: required('CONNECTIPS_VALIDATE_URL'),
  };
}

function privateKeyFromPfx(config: ConnectIpsConfig): crypto.KeyObject {
  const pfxDer = forge.util.decode64(config.pfxBase64.replace(/\s/g, ''));
  const p12Asn1 = forge.asn1.fromDer(pfxDer);
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, config.pfxPassword);
  const shrouded = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[
    forge.pki.oids.pkcs8ShroudedKeyBag
  ] ?? [];
  const plain = p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag] ?? [];
  const key = [...shrouded, ...plain].find((bag) => bag.key)?.key;
  if (!key) throw new Error('No private key was found in CONNECTIPS_PFX_BASE64.');
  return crypto.createPrivateKey(forge.pki.privateKeyToPem(key));
}

export function signConnectIpsMessage(message: string, config = connectIpsConfig()): string {
  return crypto.sign('RSA-SHA256', Buffer.from(message, 'utf8'), {
    key: privateKeyFromPfx(config),
    padding: crypto.constants.RSA_PKCS1_PADDING,
  }).toString('base64');
}

function clean(value: string, maxLength: number): string {
  return value.replace(/[\r\n,]/g, ' ').trim().slice(0, maxLength);
}

function transactionDate(date: Date): string {
  return [
    String(date.getDate()).padStart(2, '0'),
    String(date.getMonth() + 1).padStart(2, '0'),
    date.getFullYear(),
  ].join('-');
}

export function createConnectIpsForm(
  txnId: string,
  amountPaisa: bigint,
  remarks: string,
  particulars: string,
): ConnectIpsForm {
  const config = connectIpsConfig();
  if (!/^[A-Za-z0-9_-]{1,20}$/.test(txnId)) throw new Error('Invalid connectIPS TXNID.');
  if (amountPaisa <= 0n) throw new Error('connectIPS amount must be positive.');
  const fields = {
    MERCHANTID: String(config.merchantId),
    APPID: config.appId,
    APPNAME: config.appName,
    TXNID: txnId,
    TXNDATE: transactionDate(new Date()),
    TXNCRNCY: 'NPR',
    TXNAMT: amountPaisa.toString(),
    REFERENCEID: txnId,
    REMARKS: clean(remarks, 50),
    PARTICULARS: clean(particulars, 100),
  };
  const message = Object.entries(fields).map(([key, value]) => `${key}=${value}`).join(',') + ',TOKEN=TOKEN';
  return {
    gatewayUrl: config.gatewayUrl,
    fields: { ...fields, TOKEN: signConnectIpsMessage(message, config) },
  };
}

async function validateWithGateway(txnId: string, amountPaisa: bigint): Promise<ValidationResponse> {
  const config = connectIpsConfig();
  const message = `MERCHANTID=${config.merchantId},APPID=${config.appId},REFERENCEID=${txnId},TXNAMT=${amountPaisa}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(config.validateUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${config.appId}:${config.validatePassword}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        merchantId: config.merchantId,
        appId: config.appId,
        referenceId: txnId,
        txnAmt: Number(amountPaisa),
        token: signConnectIpsMessage(message, config),
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`connectIPS validation returned HTTP ${response.status}.`);
    return await response.json() as ValidationResponse;
  } finally {
    clearTimeout(timeout);
  }
}

export async function validateAndConfirmConnectIps(txnId: string) {
  const attempt = await prisma.paymentAttempt.findUnique({ where: { txnId }, include: { invoice: true } });
  if (!attempt || attempt.provider !== 'CONNECTIPS') return null;
  if (attempt.status === 'SUCCESS') return attempt;

  const response = await validateWithGateway(attempt.txnId, attempt.amountPaisa);
  const status = String(response.status ?? '').toUpperCase();
  const message = String(response.statusDesc ?? response.responseCode ?? '');
  const now = new Date();

  if (status !== 'SUCCESS') {
    const incomplete = status === 'ERROR' && /INCOMPLETE|NOT FOUND/i.test(message);
    const transition = await prisma.paymentAttempt.updateMany({
      where: { id: attempt.id, status: { not: 'SUCCESS' } },
      data: {
        status: incomplete ? 'INCOMPLETE' : 'FAILED',
        gatewayStatus: status || 'ERROR',
        gatewayMessage: message.slice(0, 500),
        validationAttempts: { increment: 1 },
        lastValidatedAt: now,
        failedAt: incomplete ? null : now,
      },
    });
    if (transition.count !== 1) {
      return prisma.paymentAttempt.findUnique({ where: { id: attempt.id } });
    }
    return prisma.paymentAttempt.findUniqueOrThrow({ where: { id: attempt.id } });
  }

  return prisma.$transaction(async (tx) => {
    const claim = await tx.paymentAttempt.updateMany({
      where: { id: attempt.id, status: { not: 'SUCCESS' } },
      data: {
        status: 'SUCCESS',
        gatewayStatus: 'SUCCESS',
        gatewayMessage: message.slice(0, 500),
        validationAttempts: { increment: 1 },
        lastValidatedAt: now,
        confirmedAt: now,
      },
    });
    if (claim.count !== 1) {
      return tx.paymentAttempt.findUnique({ where: { id: attempt.id } });
    }
    if (attempt.amountPaisa !== BigInt(Math.round(Number(attempt.invoice.netPayable) * 100))) {
      throw new Error('Stored connectIPS amount does not match the invoice.');
    }
    const invoiceTransition = await tx.invoice.updateMany({
      where: {
        id: attempt.invoiceId,
        status: { in: ['UNPAID', 'OVERDUE', 'BLOCKED_OVERRIDE'] },
      },
      data: { status: 'PAID', transactionId: attempt.txnId, paymentDate: now },
    });
    if (invoiceTransition.count !== 1) {
      const paidInvoice = await tx.invoice.findUniqueOrThrow({ where: { id: attempt.invoiceId } });
      if (paidInvoice.status !== 'PAID' || paidInvoice.transactionId !== attempt.txnId) {
        throw new Error('Invoice was already paid through another transaction.');
      }
    }
    if (attempt.invoice.invoiceType === 'ADMISSION') {
      await tx.student.updateMany({
        where: { id: attempt.invoice.studentId, admissionStatus: 'PENDING_PAYMENT' },
        data: { admissionStatus: 'READY_FOR_LOGIN' },
      });
    }
    return tx.paymentAttempt.findUniqueOrThrow({ where: { id: attempt.id } });
  });
}

export interface ReconcilePendingConnectIpsOptions {
  /** Omit only for a trusted server-side scheduler that intentionally processes every tenant. */
  tenantId?: string;
  limit?: number;
}

export async function reconcilePendingConnectIps(
  { tenantId, limit = 50 }: ReconcilePendingConnectIpsOptions = {},
): Promise<{ checked: number; confirmed: number }> {
  const staleBefore = new Date(Date.now() - 2 * 60 * 1000);
  const attempts = await prisma.paymentAttempt.findMany({
    where: {
      provider: 'CONNECTIPS',
      ...(tenantId ? { tenantId } : {}),
      status: { in: ['PENDING', 'INCOMPLETE'] },
      OR: [{ lastValidatedAt: null }, { lastValidatedAt: { lt: staleBefore } }],
    },
    orderBy: { createdAt: 'asc' },
    take: Math.min(Math.max(limit, 1), 100),
    select: { txnId: true },
  });
  let confirmed = 0;
  for (const attempt of attempts) {
    try {
      const result = await validateAndConfirmConnectIps(attempt.txnId);
      if (result?.status === 'SUCCESS') confirmed += 1;
    } catch {
      // A later run retries transient gateway/network failures.
    }
  }
  return { checked: attempts.length, confirmed };
}
