import { describe, it, beforeEach } from 'node:test';
import * as assert from 'node:assert';
import { config, validate, validateForMR } from './config';

describe('validate', () => {
  beforeEach(() => {
    // Reset config to known state before each test
    config.gitlab.token = '';
    config.gitlab.projectId = '';
    config.gemini.apiKey = '';
    config.gitlab.mrIid = '';
  });

  it('returns errors when all required fields are missing', () => {
    const errors = validate();
    assert.ok(errors.length >= 3);
    assert.ok(errors.some(e => e.includes('GITLAB_TOKEN')));
    assert.ok(errors.some(e => e.includes('PROJECT_ID')));
    assert.ok(errors.some(e => e.includes('GEMINI_API_KEY')));
  });

  it('returns no errors when all required fields are set', () => {
    config.gitlab.token = 'glpat-test';
    config.gitlab.projectId = '123';
    config.gemini.apiKey = 'AIza-test';
    const errors = validate();
    assert.strictEqual(errors.length, 0);
  });

  it('returns error only for missing token', () => {
    config.gitlab.projectId = '123';
    config.gemini.apiKey = 'AIza-test';
    const errors = validate();
    assert.strictEqual(errors.length, 1);
    assert.ok(errors[0].includes('GITLAB_TOKEN'));
  });

  it('returns error only for missing projectId', () => {
    config.gitlab.token = 'glpat-test';
    config.gemini.apiKey = 'AIza-test';
    const errors = validate();
    assert.strictEqual(errors.length, 1);
    assert.ok(errors[0].includes('PROJECT_ID'));
  });

  it('returns error only for missing apiKey', () => {
    config.gitlab.token = 'glpat-test';
    config.gitlab.projectId = '123';
    const errors = validate();
    assert.strictEqual(errors.length, 1);
    assert.ok(errors[0].includes('GEMINI_API_KEY'));
  });
});

describe('validateForMR', () => {
  beforeEach(() => {
    config.gitlab.token = 'glpat-test';
    config.gitlab.projectId = '123';
    config.gemini.apiKey = 'AIza-test';
    config.gitlab.mrIid = '';
  });

  it('returns mrIid error when all base fields are valid but mrIid missing', () => {
    const errors = validateForMR();
    assert.strictEqual(errors.length, 1);
    assert.ok(errors[0].includes('CI_MERGE_REQUEST_IID'));
  });

  it('returns no errors when mrIid is set', () => {
    config.gitlab.mrIid = '42';
    const errors = validateForMR();
    assert.strictEqual(errors.length, 0);
  });

  it('includes base validation errors plus mrIid error', () => {
    config.gitlab.token = '';
    const errors = validateForMR();
    assert.ok(errors.length >= 2);
    assert.ok(errors.some(e => e.includes('GITLAB_TOKEN')));
    assert.ok(errors.some(e => e.includes('CI_MERGE_REQUEST_IID')));
  });
});
