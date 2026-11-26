import { App } from 'aws-cdk-lib';
import { readConfig } from '../lib/config';
import { DataStack } from '../lib/dataStack';
import { EmailStack } from '../lib/emailStack';
import { GithubDeployStack } from '../lib/githubDeployStack';
import { NetworkStack } from '../lib/networkStack';
import { ServiceStack } from '../lib/serviceStack';

/* The SnowSync AWS app. Deploy with: npx cdk deploy --all -c certificateArn=… -c domainName=api.example.com -c emailFrom=… */
export function buildApp(app: App = new App()): App {
  const config = readConfig(app);
  const env = {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'us-west-2',
  };
  const network = new NetworkStack(app, 'SnowSyncNetwork', { env });
  const data = new DataStack(app, 'SnowSyncData', { env, vpc: network.vpc });
  const email = new EmailStack(app, 'SnowSyncEmail', { env, config });
  const service = new ServiceStack(app, 'SnowSyncService', {
    env,
    vpc: network.vpc,
    data,
    config,
    emailIdentity: email.identity,
  });
  new GithubDeployStack(app, 'SnowSyncGithubDeploy', {
    env,
    config,
    repository: service.repository,
    taskDefinition: service.service.taskDefinition,
    service: service.service.service,
  });
  return app;
}

// Run as the CDK app (cdk.json "app"); tests import buildApp instead.
if (process.argv[1]?.endsWith('snowsync.ts')) {
  buildApp().synth();
}
