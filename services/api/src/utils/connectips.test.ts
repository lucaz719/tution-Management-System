import assert from 'node:assert/strict';
import forge from 'node-forge';
import { createConnectIpsForm } from './connectips';

const keys = forge.pki.rsa.generateKeyPair(1024);
const cert = forge.pki.createCertificate();
cert.publicKey = keys.publicKey;
cert.serialNumber = '01';
cert.validity.notBefore = new Date(Date.now() - 60_000);
cert.validity.notAfter = new Date(Date.now() + 86_400_000);
const attrs = [{ name: 'commonName', value: 'TMS connectIPS test' }];
cert.setSubject(attrs);
cert.setIssuer(attrs);
cert.sign(keys.privateKey, forge.md.sha256.create());
const password = 'test-pfx-password';
const pfx = forge.pkcs12.toPkcs12Asn1(keys.privateKey, cert, password, { algorithm: '3des' });

process.env.CONNECTIPS_ENABLED = 'true';
process.env.CONNECTIPS_MERCHANT_ID = '550';
process.env.CONNECTIPS_APP_ID = 'MER-550-APP-1';
process.env.CONNECTIPS_APP_NAME = 'TMS Test';
process.env.CONNECTIPS_PFX_BASE64 = forge.util.encode64(forge.asn1.toDer(pfx).getBytes());
process.env.CONNECTIPS_PFX_PASSWORD = password;
process.env.CONNECTIPS_VALIDATE_PASSWORD = 'validate-password';
process.env.CONNECTIPS_GATEWAY_URL = 'https://uat.connectips.com/connectipswebgw/loginpage';
process.env.CONNECTIPS_VALIDATE_URL = 'https://uat.connectips.com/connectipswebws/api/creditor/validatetxn';

const result = createConnectIpsForm('0123456789abcdef0123', 565000n, 'Admission, invoice', 'Student admission fee');
assert.equal(result.fields.TXNID, '0123456789abcdef0123');
assert.equal(result.fields.REFERENCEID, result.fields.TXNID);
assert.equal(result.fields.TXNAMT, '565000');
assert.equal(result.fields.TXNCRNCY, 'NPR');
assert.equal(result.fields.REMARKS.includes(','), false, 'signed form fields cannot inject delimiters');
assert.match(result.fields.TXNDATE, /^\d{2}-\d{2}-\d{4}$/);

const orderedFields = [
  'MERCHANTID',
  'APPID',
  'APPNAME',
  'TXNID',
  'TXNDATE',
  'TXNCRNCY',
  'TXNAMT',
  'REFERENCEID',
  'REMARKS',
  'PARTICULARS',
];
const message = orderedFields.map((key) => `${key}=${result.fields[key]}`).join(',') + ',TOKEN=TOKEN';
const digest = forge.md.sha256.create();
digest.update(message, 'utf8');
assert.equal(
  keys.publicKey.verify(digest.digest().bytes(), forge.util.decode64(result.fields.TOKEN)),
  true,
  'checkout token must be an RSA SHA-256 signature over the exact ordered message',
);

assert.throws(() => createConnectIpsForm('too-long-transaction-id', 100n, '', ''), /TXNID/);
assert.throws(() => createConnectIpsForm('valid-txn', 0n, '', ''), /positive/);

console.log('connectIPS signing tests passed');
