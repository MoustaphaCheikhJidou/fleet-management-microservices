#!/usr/bin/env node
/* eslint-disable no-console */
const assert = require('node:assert');
const { extractResetUrlAndToken } = require('./_mailhog');

function run() {
  // Case 1: HTML href full URL
  const htmlBody = '<a href="http://localhost:8081/reset-password?token=ABC123XYZ">Cliquez</a>';
  const res1 = extractResetUrlAndToken(htmlBody, 'http://localhost:8081');
  assert.equal(res1.token, 'ABC123XYZ');
  assert.equal(res1.resetUrl, 'http://localhost:8081/reset-password?token=ABC123XYZ');

  // Case 2: HTML entity &amp; inside href
  const htmlAmp = '<a href="http://localhost:8081/reset-password?token=TOKEN123&amp;utm=1">Lien</a>';
  const res2 = extractResetUrlAndToken(htmlAmp, 'http://localhost:8081');
  assert.equal(res2.token, 'TOKEN123');
  assert.ok(res2.resetUrl.includes('token=TOKEN123'));

  // Case 3: Quoted-printable soft breaks
  const qpBody = 'Please reset: https://localhost:8081/reset-password?token=ABCDEF=\n123';
  const res3 = extractResetUrlAndToken(qpBody, 'http://localhost:8081');
  assert.equal(res3.token, 'ABCDEF123');
  assert.equal(res3.resetUrl, 'https://localhost:8081/reset-password?token=ABCDEF123');

  console.log('All extractor tests passed.');
}

if (require.main === module) {
  run();
}

module.exports = { run };
