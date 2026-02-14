import type { AppConfig } from './types';

const { env } = process;

export const config: AppConfig = {
  gitlab: {
    token: env.GITLAB_TOKEN || env.CI_JOB_TOKEN || '',
    apiUrl: env.CI_API_V4_URL || env.GITLAB_API_URL || 'https://gitlab.com/api/v4',
    projectId: env.CI_PROJECT_ID || env.GITLAB_PROJECT_ID || '',
    projectPath: env.CI_PROJECT_PATH || '',
    mrIid: env.CI_MERGE_REQUEST_IID || '',
    sourceBranch: env.CI_MERGE_REQUEST_SOURCE_BRANCH_NAME || env.CI_COMMIT_BRANCH || '',
    targetBranch: env.CI_MERGE_REQUEST_TARGET_BRANCH_NAME || env.CI_DEFAULT_BRANCH || 'main',
    commitSha: env.CI_COMMIT_SHA || '',
    pipelineUrl: env.CI_PIPELINE_URL || '',
  },

  gemini: {
    apiKey: env.GEMINI_API_KEY || '',
    model: env.GEMINI_MODEL || 'gemini-2.5-pro',
  },

  review: {
    maxFiles: parseInt(env.REVIEW_MAX_FILES || '50', 10),
    maxDiffSize: parseInt(env.REVIEW_MAX_DIFF_SIZE || '100000', 10),
    severityThreshold: env.REVIEW_SEVERITY_THRESHOLD || 'LOW',
    includePatterns: env.REVIEW_INCLUDE_PATTERNS || '',
    excludePatterns: env.REVIEW_EXCLUDE_PATTERNS || 'package-lock.json,yarn.lock,*.min.js,*.min.css',
    postAsNote: env.REVIEW_POST_AS_NOTE !== 'false',
    failOnCritical: env.REVIEW_FAIL_ON_CRITICAL === 'true',
  },
};

export function validate(): string[] {
  const errors: string[] = [];

  if (!config.gitlab.token) {
    errors.push('GITLAB_TOKEN or CI_JOB_TOKEN is required');
  }
  if (!config.gitlab.projectId) {
    errors.push('CI_PROJECT_ID or GITLAB_PROJECT_ID is required');
  }
  if (!config.gemini.apiKey) {
    errors.push('GEMINI_API_KEY is required');
  }

  return errors;
}

export function validateForMR(): string[] {
  const errors = validate();
  if (!config.gitlab.mrIid) {
    errors.push('CI_MERGE_REQUEST_IID is required for MR review mode');
  }
  return errors;
}
