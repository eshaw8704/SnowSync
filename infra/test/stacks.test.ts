import { App, type Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { describe, expect, it } from 'vitest';
import { buildApp } from '../bin/snowsync';

const CONTEXT = {
  certificateArn: 'arn:aws:acm:us-west-2:111111111111:certificate/test',
  domainName: 'api.snowsync.test',
  emailFrom: 'SnowSync <no-reply@snowsync.test>',
  githubRepository: 'eshaw8704/SnowSync',
};

function synth() {
  const app = buildApp(new App({ context: CONTEXT }));
  const template = (name: string) => Template.fromStack(app.node.findChild(name) as Stack);
  return {
    network: template('SnowSyncNetwork'),
    data: template('SnowSyncData'),
    service: template('SnowSyncService'),
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

  it('opens the database and Redis only to the server tasks', () => {
    stacks.service.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
      FromPort: 5432,
      ToPort: 5432,
      SourceSecurityGroupId: Match.anyValue(),
    });
    stacks.service.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
      FromPort: 6379,
      ToPort: 6379,
      SourceSecurityGroupId: Match.anyValue(),
    });
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

  it('refuses to synthesize without the domain and certificate', () => {
    expect(() => buildApp(new App({ context: { githubRepository: 'a/b' } }))).toThrow(
      'certificateArn',
    );
  });
});
