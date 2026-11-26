import { App, type Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { describe, expect, it } from 'vitest';
import { buildApp } from '../bin/snowsync';
import { sendingDomain } from '../lib/emailStack';

const CONTEXT = {
  certificateArn: 'arn:aws:acm:us-west-2:111111111111:certificate/test',
  domainName: 'api.snowsync.test',
  emailFrom: 'SnowSync <no-reply@snowsync.test>',
  githubRepository: 'eshaw8704/SnowSync',
};

function synth(extraContext: Record<string, unknown> = {}) {
  const app = buildApp(new App({ context: { ...CONTEXT, ...extraContext } }));
  const template = (name: string) => Template.fromStack(app.node.findChild(name) as Stack);
  return {
    network: template('SnowSyncNetwork'),
    data: template('SnowSyncData'),
    service: template('SnowSyncService'),
    deploy: template('SnowSyncGithubDeploy'),
    email: template('SnowSyncEmail'),
  };
}

describe('SnowSync AWS stacks', () => {
  const stacks = synth();

  it('spans two Availability Zones with one NAT gateway', () => {
    stacks.network.resourceCountIs('AWS::EC2::NatGateway', 1);
    stacks.network.resourceCountIs('AWS::EC2::Subnet', 6);
  });

  it('keeps PostgreSQL private, encrypted and protected', () => {
    stacks.data.hasResourceProperties('AWS::RDS::DBInstance', {
      Engine: 'postgres',
      PubliclyAccessible: false,
      StorageEncrypted: true,
      DeletionProtection: true,
    });
  });

  it('encrypts Redis in transit and at rest', () => {
    stacks.data.hasResourceProperties('AWS::ElastiCache::ReplicationGroup', {
      Engine: 'redis',
      NumCacheClusters: 1,
      TransitEncryptionEnabled: true,
      AtRestEncryptionEnabled: true,
    });
    stacks.data.resourceCountIs('AWS::ElastiCache::CacheCluster', 0);
    const taskDefinition = JSON.stringify(stacks.service.findResources('AWS::ECS::TaskDefinition'));
    expect(taskDefinition).toContain('"Name":"REDIS_URL"');
    expect(taskDefinition).toContain('rediss://');
  });

  it('opens the database and Redis only to the server tasks', () => {
    const rules = Object.values(stacks.service.findResources('AWS::EC2::SecurityGroupIngress')) as {
      Properties: Record<string, unknown>;
    }[];
    // No separate ingress rule in the service stack may open a public IP range.
    for (const rule of rules) {
      expect(rule.Properties.CidrIp).toBeUndefined();
      expect(rule.Properties.CidrIpv6).toBeUndefined();
    }
    // Exactly one rule each for PostgreSQL and Redis, both from the service security group.
    const dataRules = rules.filter((rule) =>
      [5432, 6379].includes(rule.Properties.FromPort as number),
    );
    expect(dataRules.map((rule) => rule.Properties.FromPort).sort()).toEqual([5432, 6379]);
    for (const rule of dataRules) {
      expect(rule.Properties.ToPort).toBe(rule.Properties.FromPort);
      expect(rule.Properties.SourceSecurityGroupId).toEqual({
        'Fn::GetAtt': [expect.stringMatching(/^ServiceSecurityGroup/), 'GroupId'],
      });
    }
    stacks.data.resourceCountIs('AWS::EC2::SecurityGroupIngress', 0);
    const dataGroups = stacks.data.findResources('AWS::EC2::SecurityGroup');
    expect(JSON.stringify(dataGroups)).not.toContain('0.0.0.0/0');
  });

  it('generates the database password and JWT secret in Secrets Manager', () => {
    stacks.data.resourceCountIs('AWS::SecretsManager::Secret', 2);
  });

  it('runs at least two Fargate tasks in private subnets without public IPs', () => {
    stacks.service.hasResourceProperties('AWS::ECS::Service', {
      LaunchType: 'FARGATE',
      DesiredCount: 2,
      NetworkConfiguration: {
        AwsvpcConfiguration: Match.objectLike({ AssignPublicIp: 'DISABLED' }),
      },
    });
    const service = Object.values(stacks.service.findResources('AWS::ECS::Service'))[0] as {
      Properties: { NetworkConfiguration: unknown };
    };
    const subnets = JSON.stringify(service.Properties.NetworkConfiguration);
    expect(subnets).toMatch(/appSubnet/);
    expect(subnets).not.toMatch(/publicSubnet|dataSubnet/);
  });

  it('starts with no tasks on the first deploy (-c desiredCount=0)', () => {
    synth({ desiredCount: 0 }).service.hasResourceProperties('AWS::ECS::Service', {
      DesiredCount: 0,
    });
  });

  it('serves HTTPS, redirects HTTP and outlasts the WebSocket heartbeat', () => {
    stacks.service.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
      Port: 443,
      Protocol: 'HTTPS',
    });
    stacks.service.hasResourceProperties('AWS::ElasticLoadBalancingV2::Listener', {
      Port: 80,
      DefaultActions: [Match.objectLike({ Type: 'redirect' })],
    });
    stacks.service.hasResourceProperties('AWS::ElasticLoadBalancingV2::LoadBalancer', {
      LoadBalancerAttributes: Match.arrayWith([
        { Key: 'idle_timeout.timeout_seconds', Value: '120' },
      ]),
    });
  });

  it('checks /health and injects secrets instead of baking them into the image', () => {
    stacks.service.hasResourceProperties('AWS::ElasticLoadBalancingV2::TargetGroup', {
      HealthCheckPath: '/health',
    });
    const taskDefinition = Object.values(
      stacks.service.findResources('AWS::ECS::TaskDefinition'),
    )[0] as { Properties: { ContainerDefinitions: { Secrets: { Name: string }[] }[] } };
    const secretNames = taskDefinition.Properties.ContainerDefinitions[0]!.Secrets.map(
      (secret) => secret.Name,
    );
    expect(secretNames.sort()).toEqual(['DB_PASSWORD', 'DB_USERNAME', 'JWT_ACCESS_SECRET']);
    expect(JSON.stringify(taskDefinition)).not.toMatch(/"Name":"DATABASE_URL"/);
  });

  it('lets only main of the SnowSync repository deploy, without stored AWS keys', () => {
    stacks.deploy.hasResourceProperties('AWS::IAM::Role', {
      AssumeRolePolicyDocument: {
        Statement: [
          Match.objectLike({
            Action: 'sts:AssumeRoleWithWebIdentity',
            Condition: {
              StringEquals: { 'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com' },
              StringLike: {
                'token.actions.githubusercontent.com:sub':
                  'repo:eshaw8704/SnowSync:ref:refs/heads/main',
              },
            },
          }),
        ],
      },
    });
    stacks.deploy.resourceCountIs('AWS::IAM::User', 0);
    // Each deploy registers a revision pinned to the commit's image and runs it.
    const policies = JSON.stringify(stacks.deploy.findResources('AWS::IAM::Policy'));
    expect(policies).toContain('ecs:RegisterTaskDefinition');
    expect(policies).toMatch(/task-definition\/.*:\*/);
  });

  it('reuses an existing GitHub OIDC provider with -c createGithubOidcProvider=false', () => {
    stacks.deploy.resourceCountIs('Custom::AWSCDKOpenIdConnectProvider', 1);
    // -c on the command line passes the string "false", not the boolean.
    synth({ createGithubOidcProvider: 'false' }).deploy.resourceCountIs(
      'Custom::AWSCDKOpenIdConnectProvider',
      0,
    );
  });

  it('verifies the sending domain with DKIM and lets only the server send', () => {
    expect(sendingDomain('SnowSync <no-reply@snowsync.test>')).toBe('snowsync.test');
    stacks.email.hasResourceProperties('AWS::SES::EmailIdentity', {
      EmailIdentity: 'snowsync.test',
      DkimAttributes: { SigningEnabled: true },
    });
    stacks.service.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({ Action: Match.arrayWith(['ses:SendEmail']) }),
        ]),
      },
      Roles: [{ Ref: Match.stringLikeRegexp('TaskDefTaskRole') }],
    });
    const taskDefinition = JSON.stringify(stacks.service.findResources('AWS::ECS::TaskDefinition'));
    expect(taskDefinition).toContain('"Name":"EMAIL_TRANSPORT","Value":"ses"');
  });

  it('refuses to synthesize without the domain and certificate', () => {
    expect(() => buildApp(new App({ context: { githubRepository: 'a/b' } }))).toThrow(
      'certificateArn',
    );
  });
});
