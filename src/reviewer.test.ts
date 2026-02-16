import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { Reviewer } from './reviewer';

const reviewer = new Reviewer({ geminiApiKey: 'dummy-key' });

describe('filterDiff', () => {
  const baseDiff = [
    'diff --git a/src/index.ts b/src/index.ts',
    '--- a/src/index.ts',
    '+++ b/src/index.ts',
    '@@ -1,3 +1,4 @@',
    '+import { foo } from "bar";',
    ' const x = 1;',
  ].join('\n');

  const lockDiff = [
    'diff --git a/package-lock.json b/package-lock.json',
    '--- a/package-lock.json',
    '+++ b/package-lock.json',
    '@@ -1,3 +1,4 @@',
    '+  "resolved": "https://example.com"',
  ].join('\n');

  const multiFileDiff = baseDiff + '\n' + lockDiff;

  it('returns empty string for empty input', () => {
    const result = reviewer.filterDiff('', {
      includePatterns: '',
      excludePatterns: '',
      maxDiffSize: 100000,
    });
    assert.strictEqual(result, '');
  });

  it('returns full diff when no patterns specified', () => {
    const result = reviewer.filterDiff(baseDiff, {
      includePatterns: '',
      excludePatterns: '',
      maxDiffSize: 100000,
    });
    assert.strictEqual(result, baseDiff);
  });

  it('excludes files matching exclude patterns', () => {
    const result = reviewer.filterDiff(multiFileDiff, {
      includePatterns: '',
      excludePatterns: 'package-lock.json',
      maxDiffSize: 100000,
    });
    assert.ok(result.includes('src/index.ts'));
    assert.ok(!result.includes('package-lock.json'));
  });

  it('excludes files matching wildcard exclude patterns', () => {
    const result = reviewer.filterDiff(multiFileDiff, {
      includePatterns: '',
      excludePatterns: '*.json',
      maxDiffSize: 100000,
    });
    assert.ok(result.includes('src/index.ts'));
    assert.ok(!result.includes('package-lock.json'));
  });

  it('includes only files matching include patterns', () => {
    const cssDiff = [
      'diff --git a/style.css b/style.css',
      '--- a/style.css',
      '+++ b/style.css',
      '@@ -1 +1 @@',
      '+body { color: red; }',
    ].join('\n');
    const combined = baseDiff + '\n' + cssDiff;

    const result = reviewer.filterDiff(combined, {
      includePatterns: '*.ts',
      excludePatterns: '',
      maxDiffSize: 100000,
    });
    assert.ok(result.includes('src/index.ts'));
    assert.ok(!result.includes('style.css'));
  });

  it('truncates diff exceeding maxDiffSize', () => {
    const result = reviewer.filterDiff(baseDiff, {
      includePatterns: '',
      excludePatterns: '',
      maxDiffSize: 20,
    });
    assert.ok(result.includes('[diff truncated due to size]'));
    assert.ok(result.length < baseDiff.length + 50);
  });

  it('applies exclude before include', () => {
    const result = reviewer.filterDiff(multiFileDiff, {
      includePatterns: '*.json,*.ts',
      excludePatterns: 'package-lock.json',
      maxDiffSize: 100000,
    });
    assert.ok(result.includes('src/index.ts'));
    assert.ok(!result.includes('package-lock.json'));
  });
});

describe('hasCriticalFindings', () => {
  it('returns true when CRITICAL finding present', () => {
    assert.strictEqual(
      reviewer.hasCriticalFindings([
        { severity: 'CRITICAL', file: 'file.ts', line: 1, description: 'issue' },
      ]),
      true,
    );
  });

  it('returns false when only non-critical findings', () => {
    assert.strictEqual(
      reviewer.hasCriticalFindings([
        { severity: 'HIGH', file: 'file.ts', line: 1, description: 'issue' },
        { severity: 'LOW', file: 'file.ts', line: 2, description: 'minor' },
      ]),
      false,
    );
  });

  it('returns false for empty findings', () => {
    assert.strictEqual(reviewer.hasCriticalFindings([]), false);
  });

  it('detects CRITICAL among mixed severities', () => {
    assert.strictEqual(
      reviewer.hasCriticalFindings([
        { severity: 'LOW', file: 'a.ts', line: 1, description: 'minor' },
        { severity: 'CRITICAL', file: 'b.ts', line: 5, description: 'vuln' },
        { severity: 'HIGH', file: 'c.ts', line: 10, description: 'bug' },
      ]),
      true,
    );
  });
});

describe('review', () => {
  it('returns empty findings for empty diff', async () => {
    const result = await reviewer.review('');
    assert.strictEqual(result.summary, 'No code changes to review.');
    assert.deepStrictEqual(result.findings, []);
  });

  it('returns empty findings for whitespace-only diff', async () => {
    const result = await reviewer.review('   \n  \n  ');
    assert.strictEqual(result.summary, 'No code changes to review.');
    assert.deepStrictEqual(result.findings, []);
  });
});
