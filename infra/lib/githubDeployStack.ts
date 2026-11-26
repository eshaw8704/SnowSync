import { CfnOutput, Stack, type StackProps } from 'aws-cdk-lib';
import type * as ecr from 'aws-cdk-lib/aws-ecr';
import type * as ecs from 'aws-cdk-lib/aws-ecs';
import * as iam from 'aws-cdk-lib/aws-iam';
import type { Construct } from 'constructs';
import type { SnowSyncConfig } from './config';

export interface GithubDeployStackProps extends StackProps {
  config: SnowSyncConfig;
  repository: ecr.IRepository;
  taskDefinition: ecs.TaskDefinition;
  service: ecs.FargateService;
}

// The role GitHub Actions assumes to deploy, through OpenID Connect: no AWS keys are stored in GitHub.
// Only main of the configured repo can assume it, and it can only push the server image, run the migration task, roll the service and read stack outputs.
export class GithubDeployStack extends Stack {
  constructor(scope: Construct, id: string, props: GithubDeployStackProps) {
    super(scope, id, props);
    const issuer = 'token.actions.githubusercontent.com';
    const provider = props.config.createGithubOidcProvider
      ? new iam.OpenIdConnectProvider(this, 'GithubOidc', {
          url: `https://${issuer}`,
          clientIds: ['sts.amazonaws.com'],
        })
      : iam.OpenIdConnectProvider.fromOpenIdConnectProviderArn(
          this,
          'GithubOidc',
          `arn:aws:iam::${this.account}:oidc-provider/${issuer}`,
        );

    const role = new iam.Role(this, 'DeployRole', {
      description: 'GitHub Actions deploys SnowSync from main',
      assumedBy: new iam.WebIdentityPrincipal(provider.openIdConnectProviderArn, {
        StringEquals: { [`${issuer}:aud`]: 'sts.amazonaws.com' },
        // GitHub's exact subject for this repo (immutable owner/repo IDs), limited to main.
        StringLike: {
          [`${issuer}:sub`]: `${props.config.githubOidcSubjectPrefix}:ref:refs/heads/main`,
        },
      }),
    });

    props.repository.grantPullPush(role);
    // Each deploy registers a new revision pinned to the commit's image, so allow every revision
    // of this task family (not just the one CDK created), only on SnowSync's cluster.
    role.addToPolicy(
      new iam.PolicyStatement({
        actions: ['ecs:RunTask'],
        resources: [
          `arn:aws:ecs:${this.region}:${this.account}:task-definition/${props.taskDefinition.family}:*`,
          props.service.cluster.clusterArn,
        ],
        conditions: { ArnEquals: { 'ecs:cluster': props.service.cluster.clusterArn } },
      }),
    );
    // These two can't be limited to specific resources in IAM.
    role.addToPolicy(
      new iam.PolicyStatement({
        actions: ['ecs:DescribeTaskDefinition', 'ecs:RegisterTaskDefinition'],
        resources: ['*'],
      }),
    );
    role.addToPolicy(
      new iam.PolicyStatement({
        actions: ['ecs:DescribeTasks', 'ecs:DescribeServices', 'ecs:UpdateService'],
        resources: ['*'],
        conditions: { ArnEquals: { 'ecs:cluster': props.service.cluster.clusterArn } },
      }),
    );
    role.addToPolicy(
      new iam.PolicyStatement({
        actions: ['iam:PassRole'],
        resources: [
          props.taskDefinition.taskRole.roleArn,
          props.taskDefinition.obtainExecutionRole().roleArn,
        ],
      }),
    );
    role.addToPolicy(
      new iam.PolicyStatement({
        actions: ['cloudformation:DescribeStacks'],
        resources: [`arn:aws:cloudformation:${this.region}:${this.account}:stack/SnowSync*/*`],
      }),
    );

    new CfnOutput(this, 'DeployRoleArn', { value: role.roleArn });
  }
}
