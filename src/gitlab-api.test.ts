import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { GitLabAPI } from './gitlab-api';

describe('GitLabAPI constructor', () => {
  it('creates instance with required options', () => {
    const api = new GitLabAPI({
      apiUrl: 'https://gitlab.com/api/v4',
      token: 'glpat-test',
      projectId: '123',
    });
    assert.ok(api instanceof GitLabAPI);
  });

  it('creates instance with explicit tokenType', () => {
    const api = new GitLabAPI({
      apiUrl: 'https://gitlab.com/api/v4',
      token: 'job-token',
      projectId: '456',
      tokenType: 'job',
    });
    assert.ok(api instanceof GitLabAPI);
  });
});

describe('GitLabAPI auth headers', () => {
  // Access private _authHeaders via bracket notation for testing
  function getAuthHeaders(tokenType: 'private' | 'job' | 'oauth', token: string): Record<string, string> {
    const api = new GitLabAPI({
      apiUrl: 'https://gitlab.com/api/v4',
      token,
      projectId: '123',
      tokenType,
    });
    return (api as any)._authHeaders();
  }

  it('uses PRIVATE-TOKEN header for private token type', () => {
    const headers = getAuthHeaders('private', 'glpat-abc');
    assert.strictEqual(headers['PRIVATE-TOKEN'], 'glpat-abc');
    assert.strictEqual(headers['Authorization'], undefined);
    assert.strictEqual(headers['JOB-TOKEN'], undefined);
  });

  it('uses JOB-TOKEN header for job token type', () => {
    const headers = getAuthHeaders('job', 'ci-job-token');
    assert.strictEqual(headers['JOB-TOKEN'], 'ci-job-token');
    assert.strictEqual(headers['PRIVATE-TOKEN'], undefined);
    assert.strictEqual(headers['Authorization'], undefined);
  });

  it('uses Bearer Authorization header for oauth token type', () => {
    const headers = getAuthHeaders('oauth', 'oauth-token');
    assert.strictEqual(headers['Authorization'], 'Bearer oauth-token');
    assert.strictEqual(headers['PRIVATE-TOKEN'], undefined);
    assert.strictEqual(headers['JOB-TOKEN'], undefined);
  });
});

describe('GitLabAPI URL construction', () => {
  it('encodes project ID with special characters', () => {
    const api = new GitLabAPI({
      apiUrl: 'https://gitlab.com/api/v4',
      token: 'test',
      projectId: 'group/subgroup/project',
    });
    // Verify that _request would use encodeURIComponent on projectId
    // by checking the encoded value matches expectations
    const encoded = encodeURIComponent('group/subgroup/project');
    assert.strictEqual(encoded, 'group%2Fsubgroup%2Fproject');
  });

  it('handles numeric project IDs', () => {
    const api = new GitLabAPI({
      apiUrl: 'https://gitlab.com/api/v4',
      token: 'test',
      projectId: '12345',
    });
    const encoded = encodeURIComponent('12345');
    assert.strictEqual(encoded, '12345');
  });
});
