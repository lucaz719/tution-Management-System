import assert from 'node:assert/strict';
import { normaliseAakashPhoneNumber } from './sms';

assert.equal(normaliseAakashPhoneNumber('9703078866'), '9703078866');
assert.equal(normaliseAakashPhoneNumber('+977 970-307-8866'), '9703078866');
assert.equal(normaliseAakashPhoneNumber('9779703078866'), '9703078866');
assert.equal(normaliseAakashPhoneNumber('970 307 8866'), '9703078866');
assert.equal(normaliseAakashPhoneNumber('123'), '123');

console.log('Aakash SMS phone normalisation tests passed.');
