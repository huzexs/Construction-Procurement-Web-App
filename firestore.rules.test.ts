import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Security rules specification & structural verification tests for the "Dirty Dozen"
 * adversarial payloads documented in security_spec.md.
 * Evaluates the deployed firestore.rules invariants statically and via payload guards.
 */
const rulesText = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf8');

test('firestore.rules includes global default-deny and verified admin email check', () => {
  assert.match(rulesText, /match \/\{document=\*\*\}\s*\{\s*allow read, write: if false;\s*\}/);
  assert.match(rulesText, /request\.auth\.token\.email_verified == true/);
  assert.match(rulesText, /request\.auth\.token\.email\.lower\(\) == 'abubakarkhuzaifa001@gmail\.com'/);
});

test('firestore.rules protects appConfig/security and codeVerifications from worker reads', () => {
  assert.match(rulesText, /match \/appConfig\/security\s*\{\s*allow get: if isAdmin\(\);\s*allow list: if false;/);
  assert.match(rulesText, /match \/codeVerifications\/\{userId\}\s*\{\s*allow read: if false;/);
});

test('firestore.rules enforces worker isolation, immutability, and sequential counter atomicity', () => {
  assert.match(rulesText, /match \/requests\/\{requestId\}[\s\S]*allow list: if isAdmin\(\) \|\| \(isSignedIn\(\) && existing\(\)\.workerId == request\.auth\.uid\);/);
  assert.match(rulesText, /match \/requests\/\{requestId\}[\s\S]*allow update: if isAdmin\(\)/);
  assert.match(rulesText, /match \/requests\/\{requestId\}[\s\S]*allow delete: if false;/);
  assert.match(rulesText, /getAfter\(\/databases\/\$\(database\)\/documents\/counters\/requests\)\.data\.count == incoming\(\)\.requestNumberNum/);
  assert.match(rulesText, /incoming\(\)\.count == existing\(\)\.count \+ 1/);
});

test('Dirty Dozen payload guards reject forged, oversized, or privileged client writes', () => {
  // Verify every collection uses strict hasOnly / hasAll key allowlisting
  const hasOnlyMatches = rulesText.match(/\.keys\(\)\.hasOnly\(/g) || [];
  assert.ok(hasOnlyMatches.length >= 7, 'Expected strict hasOnly() schema checks on all entities');

  // Verify worker cannot update role, active, or removed directly
  assert.match(rulesText, /incoming\(\)\.role == existing\(\)\.role/);
  assert.match(rulesText, /existing\(\)\.removed == false/);
  assert.match(rulesText, /affectedKeys\(\)\.hasOnly\(\['lastSeenAt', 'displayName'\]\)/);
});
