import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';
import type {
  GitLabAPIOptions,
  MergeRequest,
  MergeRequestChange,
  MergeRequestChanges,
  MergeRequestNote,
  DiffPosition,
} from './types';

export class GitLabAPI {
  private apiUrl: string;
  private token: string;
  private projectId: string;
  private tokenType: 'private' | 'job' | 'oauth';

  constructor({ apiUrl, token, projectId, tokenType = 'private' }: GitLabAPIOptions) {
    this.apiUrl = apiUrl;
    this.token = token;
    this.projectId = projectId;
    this.tokenType = tokenType;
  }

  private _authHeaders(): Record<string, string> {
    switch (this.tokenType) {
      case 'job':
        return { 'JOB-TOKEN': this.token };
      case 'oauth':
        return { 'Authorization': `Bearer ${this.token}` };
      default:
        return { 'PRIVATE-TOKEN': this.token };
    }
  }

  private _request<T>(method: string, path: string, body: Record<string, unknown> | null = null): Promise<T> {
    return new Promise((resolve, reject) => {
      const encodedProjectId = encodeURIComponent(this.projectId);
      const url = new URL(`${this.apiUrl}/projects/${encodedProjectId}${path}`);
      const transport = url.protocol === 'https:' ? https : http;

      if (url.protocol !== 'https:') {
        console.warn('WARNING: Sending authenticated GitLab API request over unencrypted HTTP!');
      }

      const options: https.RequestOptions = {
        method,
        hostname: url.hostname,
        port: url.port || undefined,
        path: url.pathname + url.search,
        headers: {
          ...this._authHeaders(),
          'Content-Type': 'application/json',
        },
        rejectUnauthorized: true,
      };

      const req = transport.request(options, (res) => {
        let data = '';
        res.on('data', (chunk: string) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data ? JSON.parse(data) : null);
          } else {
            const truncated = data.length > 200 ? data.substring(0, 200) + '...' : data;
            reject(new Error(`GitLab API ${method} ${path} failed (${res.statusCode}): ${truncated}`));
          }
        });
      });

      req.on('error', reject);
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  }

  async getMergeRequest(mrIid: string): Promise<MergeRequest> {
    return this._request<MergeRequest>('GET', `/merge_requests/${encodeURIComponent(mrIid)}`);
  }

  async getMergeRequestChanges(mrIid: string): Promise<MergeRequestChanges> {
    return this._request<MergeRequestChanges>('GET', `/merge_requests/${encodeURIComponent(mrIid)}/changes`);
  }

  async getMergeRequestDiffs(mrIid: string): Promise<MergeRequestChange[]> {
    return this._request<MergeRequestChange[]>('GET', `/merge_requests/${encodeURIComponent(mrIid)}/diffs`);
  }

  async postMergeRequestNote(mrIid: string, body: string): Promise<MergeRequestNote> {
    return this._request<MergeRequestNote>('POST', `/merge_requests/${encodeURIComponent(mrIid)}/notes`, { body });
  }

  async postMergeRequestDiscussion(mrIid: string, body: string, position: DiffPosition | null = null): Promise<unknown> {
    const payload: Record<string, unknown> = { body };
    if (position) {
      payload.position = position;
    }
    return this._request('POST', `/merge_requests/${encodeURIComponent(mrIid)}/discussions`, payload);
  }

  async getMergeRequestNotes(mrIid: string): Promise<MergeRequestNote[]> {
    return this._request<MergeRequestNote[]>('GET', `/merge_requests/${encodeURIComponent(mrIid)}/notes?per_page=100`);
  }

  async deleteMergeRequestNote(mrIid: string, noteId: number): Promise<void> {
    return this._request<void>('DELETE', `/merge_requests/${encodeURIComponent(mrIid)}/notes/${encodeURIComponent(noteId)}`);
  }

  async getMergeRequestDiscussions(mrIid: string): Promise<any[]> {
    return this._request<any[]>('GET', `/merge_requests/${encodeURIComponent(mrIid)}/discussions?per_page=100`);
  }

  async deleteMergeRequestDiscussionNote(mrIid: string, discussionId: string, noteId: number): Promise<void> {
    return this._request<void>('DELETE', `/merge_requests/${encodeURIComponent(mrIid)}/discussions/${encodeURIComponent(discussionId)}/notes/${encodeURIComponent(noteId)}`);
  }

  async getFileContent(filePath: string, ref: string): Promise<string> {
    const encodedPath = encodeURIComponent(filePath);
    return this._request<string>('GET', `/repository/files/${encodedPath}/raw?ref=${encodeURIComponent(ref)}`);
  }

  async compareRefs(from: string, to: string): Promise<unknown> {
    return this._request('GET', `/repository/compare?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
  }
}
