import type { App } from 'aws-cdk-lib';

/* Per-account settings from CDK context (cdk.json or -c name=value). */
export interface SnowSyncConfig {
  certificateArn: string;
  // The API's domain, e.g. api.snowsync.app.
  domainName: string;
  // Must be on the SES-verified domain.
  emailFrom: string;
  // owner/repo allowed to deploy through GitHub OIDC.
  githubRepository: string;
  // False when the account already has GitHub's OIDC provider.
  createGithubOidcProvider: boolean;
}

function required(app: App, name: string): string {
  const value: unknown = app.node.tryGetContext(name);
  if (typeof value !== 'string' || value.length === 0 || value.includes('REPLACE')) {
    throw new Error(
      `Missing CDK context "${name}". Pass it with -c ${name}=… (see infra/README.md). ` +
        'The domain and certificate are team decisions made before the first deploy.',
    );
  }
  return value;
}

/* Reads every setting and throws a clear message naming anything missing. */
export function readConfig(app: App): SnowSyncConfig {
  // cdk.json gives a boolean, but -c on the command line always gives a string.
  const createOidc: unknown = app.node.tryGetContext('createGithubOidcProvider');
  return {
    certificateArn: required(app, 'certificateArn'),
    domainName: required(app, 'domainName'),
    emailFrom: required(app, 'emailFrom'),
    githubRepository: required(app, 'githubRepository'),
    createGithubOidcProvider: createOidc !== false && createOidc !== 'false',
  };
}
