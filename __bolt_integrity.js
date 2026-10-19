'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const manifest = require('./__bolt_manifest.json');
let checked = false;

function sha256(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

function createManifestPayload(data) {
  return JSON.stringify({
    algorithm: data.algorithm,
    generatedAt: data.generatedAt,
    files: data.files || {},
    systemFiles: data.systemFiles || {}
  });
}

function timingSafeEqualHex(leftHex, rightHex) {
  const left = Buffer.from(String(leftHex || ''), 'hex');
  const right = Buffer.from(String(rightHex || ''), 'hex');
  if (left.length !== right.length) {
    return false;
  }

  return crypto.timingSafeEqual(left, right);
}

function verifyManifestSignature() {
  const hasSignature = !!(manifest && manifest.signature && manifest.signatureAlgorithm === 'hmac-sha256');
  if (!hasSignature) {
    return;
  }

  const signingSecret = process.env.BOLT_HASH_SECRET || '';
  if (!signingSecret) {
    crash('Manifest is signed but BOLT_HASH_SECRET is missing');
  }

  const expectedSignature = crypto.createHmac('sha256', signingSecret).update(createManifestPayload(manifest)).digest('hex');
  if (!timingSafeEqualHex(expectedSignature, manifest.signature)) {
    crash('Manifest signature mismatch. The manifest may have been forged.');
  }
}

function crash(message) {
  const finalMessage = '[BOLT-INTEGRITY] ' + message;
  console.error(finalMessage);
  throw new Error(finalMessage);
}

function verifyEntries(entries) {
  for (const [relativeFile, expectedHash] of Object.entries(entries || {})) {
    const absoluteFile = path.join(__dirname, relativeFile);

    if (!fs.existsSync(absoluteFile)) {
      crash('Missing protected file: ' + relativeFile);
    }

    const actualHash = sha256(absoluteFile);
    if (actualHash !== expectedHash) {
      crash('File has been modified or corrupted: ' + relativeFile);
    }
  }
}

function verify() {
  if (checked) {
    return;
  }

  checked = true;
  verifyManifestSignature();
  verifyEntries(manifest && manifest.files ? manifest.files : {});
  verifyEntries(manifest && manifest.systemFiles ? manifest.systemFiles : {});
}

module.exports = { verify };
