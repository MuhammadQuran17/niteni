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

describe('parseFindings', () => {
  it('parses a single finding with all fields', () => {
    const text = [
      '### Summary',
      'Test changes.',
      '',
      '### Findings',
      '',
      '**[CRITICAL]** `src/app.ts:42`',
      '> SQL injection vulnerability in user input',
      '> Rationale: User input should be parameterized',
      '```suggestion',
      'db.query("SELECT * FROM users WHERE id = ?", [id]);',
      '```',
    ].join('\n');

    const findings = reviewer.parseFindings(text);
    assert.strictEqual(findings.length, 1);
    assert.strictEqual(findings[0].severity, 'CRITICAL');
    assert.strictEqual(findings[0].file, 'src/app.ts');
    assert.strictEqual(findings[0].line, 42);
    assert.ok(findings[0].description.includes('SQL injection'));
    assert.ok(findings[0].suggestion?.includes('db.query'));
    assert.ok(findings[0].rationale?.includes('parameterized'));
  });

  it('parses multiple findings', () => {
    const text = [
      '### Findings',
      '',
      '**[HIGH]** `src/api.ts:10`',
      '> Missing error handling',
      '',
      '---',
      '',
      '**[LOW]** `src/utils.ts:5`',
      '> Variable could be const',
    ].join('\n');

    const findings = reviewer.parseFindings(text);
    assert.strictEqual(findings.length, 2);
    assert.strictEqual(findings[0].severity, 'HIGH');
    assert.strictEqual(findings[0].file, 'src/api.ts');
    assert.strictEqual(findings[1].severity, 'LOW');
    assert.strictEqual(findings[1].file, 'src/utils.ts');
  });

  it('returns empty array for no findings text', () => {
    const text = [
      '### Summary',
      'Everything looks good.',
      '',
      '### Findings',
      'No significant issues found. The code changes look good.',
    ].join('\n');

    const findings = reviewer.parseFindings(text);
    assert.strictEqual(findings.length, 0);
  });

  it('handles findings without suggestion or rationale', () => {
    const text = '**CRITICAL** `config.ts:1`\n> Missing validation\n';
    const findings = reviewer.parseFindings(text);
    assert.strictEqual(findings.length, 1);
    assert.strictEqual(findings[0].suggestion, undefined);
    assert.strictEqual(findings[0].rationale, undefined);
  });

  it('handles severity without brackets', () => {
    const text = '**MEDIUM** `src/index.ts:15`\n> Unused import\n';
    const findings = reviewer.parseFindings(text);
    assert.strictEqual(findings.length, 1);
    assert.strictEqual(findings[0].severity, 'MEDIUM');
  });

  it('defaults line to 0 when not a number', () => {
    const text = '**HIGH** `src/file.ts:`\n> Bad line number\n';
    const findings = reviewer.parseFindings(text);
    assert.strictEqual(findings.length, 1);
    assert.strictEqual(findings[0].line, 0);
  });
});

describe('hasCriticalFindings', () => {
  it('returns true when CRITICAL finding present', () => {
    assert.strictEqual(
      reviewer.hasCriticalFindings('**[CRITICAL]** `file.ts:1`\n> issue'),
      true,
    );
  });

  it('returns true for CRITICAL without brackets', () => {
    assert.strictEqual(
      reviewer.hasCriticalFindings('**CRITICAL** `file.ts:1`\n> issue'),
      true,
    );
  });

  it('returns false when only non-critical findings', () => {
    assert.strictEqual(
      reviewer.hasCriticalFindings('**[HIGH]** `file.ts:1`\n> issue'),
      false,
    );
  });

  it('returns false for empty text', () => {
    assert.strictEqual(reviewer.hasCriticalFindings(''), false);
  });

  it('returns false for clean review', () => {
    assert.strictEqual(
      reviewer.hasCriticalFindings('No significant issues found.'),
      false,
    );
  });
});
