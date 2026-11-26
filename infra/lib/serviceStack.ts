import { CfnOutput, Duration, RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as logs from 'aws-cdk-lib/aws-logs';
import type * as ses from 'aws-cdk-lib/aws-ses';
import type { Construct } from 'constructs';
import type { SnowSyncConfig } from './config';
import type { DataStack } from './dataStack';

export interface ServiceStackProps extends StackProps {
  vpc: ec2.IVpc;
  data: DataStack;
  config: SnowSyncConfig;
  /* The SES identity the server sends from. */
  emailIdentity: ses.IEmailIdentity;
}

/* The container's name in the task definition; the deploy workflow overrides its command. */
export const CONTAINER_NAME = 'server';

/* ECR repository and 2+ Fargate tasks in private subnets behind an HTTPS-only load balancer.
 * Secrets come from Secrets Manager at start; nothing secret is in the image. */
export class ServiceStack extends Stack {
  readonly repository: ecr.Repository;
  readonly service: ecsPatterns.ApplicationLoadBalancedFargateService;

  constructor(scope: Construct, id: string, props: ServiceStackProps) {
    super(scope, id, props);
    const { data, config } = props;

    // The only rules that open PostgreSQL and Redis. They live here so the data stack never depends on the service stack.
    const serviceSecurityGroup = new ec2.SecurityGroup(this, 'ServiceSecurityGroup', {
      vpc: props.vpc,
      description: 'SnowSync server tasks',
    });
    const allowFromService = (name: string, target: ec2.ISecurityGroup, port: number) =>
      new ec2.CfnSecurityGroupIngress(this, name, {
        groupId: target.securityGroupId,
        sourceSecurityGroupId: serviceSecurityGroup.securityGroupId,
        ipProtocol: 'tcp',
        fromPort: port,
        toPort: port,
        description: `${name} from SnowSync server tasks`,
      });
    allowFromService('PostgresIngress', data.databaseSecurityGroup, 5432);
    allowFromService('RedisIngress', data.redisSecurityGroup, 6379);

    this.repository = new ecr.Repository(this, 'Repository', {
      repositoryName: 'snowsync-server',
      imageScanOnPush: true,
      removalPolicy: RemovalPolicy.RETAIN,
      lifecycleRules: [{ description: 'Keep the last 20 images', maxImageCount: 20 }],
    });

    const cluster = new ecs.Cluster(this, 'Cluster', {
      vpc: props.vpc,
      containerInsightsV2: ecs.ContainerInsights.ENABLED,
    });
    const databaseSecret = data.database.secret!;

    // First deploy: -c desiredCount=0 (the ECR repository is still empty), then deploy again for 2.
    const desiredCount = Number(this.node.tryGetContext('desiredCount') ?? 2);

    this.service = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'Service', {
      cluster,
      // The pattern refuses 0, so 0 is set on the CloudFormation service below.
      desiredCount: Math.max(desiredCount, 1),
      cpu: 512,
      memoryLimitMiB: 1024,
      minHealthyPercent: 100,
      taskSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [serviceSecurityGroup],
      assignPublicIp: false,
      publicLoadBalancer: true,
      protocol: elbv2.ApplicationProtocol.HTTPS,
      certificate: acm.Certificate.fromCertificateArn(this, 'Certificate', config.certificateArn),
      sslPolicy: elbv2.SslPolicy.RECOMMENDED_TLS,
      redirectHTTP: true,
      // Longer than the WebSocket heartbeat (Sprint 5).
      idleTimeout: Duration.seconds(120),
      circuitBreaker: { rollback: true },
      taskImageOptions: {
        containerName: CONTAINER_NAME,
        image: ecs.ContainerImage.fromEcrRepository(this.repository, 'latest'),
        containerPort: 3000,
        logDriver: ecs.LogDrivers.awsLogs({
          streamPrefix: 'server',
          logRetention: logs.RetentionDays.ONE_MONTH,
        }),
        environment: {
          NODE_ENV: 'production',
          PORT: '3000',
          LOG_LEVEL: 'info',
          DB_HOST: data.database.dbInstanceEndpointAddress,
          DB_PORT: data.database.dbInstanceEndpointPort,
          DB_NAME: 'snowsync',
          REDIS_URL: `rediss://${data.redisEndpoint}:${data.redisPort}`,
          EMAIL_TRANSPORT: 'ses',
          EMAIL_FROM: config.emailFrom,
          AWS_REGION: this.region,
        },
        secrets: {
          DB_USERNAME: ecs.Secret.fromSecretsManager(databaseSecret, 'username'),
          DB_PASSWORD: ecs.Secret.fromSecretsManager(databaseSecret, 'password'),
          JWT_ACCESS_SECRET: ecs.Secret.fromSecretsManager(data.jwtSecret),
        },
      },
    });
    if (desiredCount === 0) {
      (this.service.service.node.defaultChild as ecs.CfnService).desiredCount = 0;
    }

    props.emailIdentity.grantSendEmail(this.service.taskDefinition.taskRole);

    this.service.targetGroup.configureHealthCheck({
      path: '/health',
      healthyHttpCodes: '200',
      interval: Duration.seconds(15),
      healthyThresholdCount: 2,
    });
    this.service.targetGroup.setAttribute('deregistration_delay.timeout_seconds', '30');

    const out = (name: string, value: string) => new CfnOutput(this, name, { value });
    out('LoadBalancerDns', this.service.loadBalancer.loadBalancerDnsName);
    out('RepositoryUri', this.repository.repositoryUri);
    out('ClusterName', cluster.clusterName);
    out('ServiceName', this.service.service.serviceName);
    out('TaskDefinitionArn', this.service.taskDefinition.taskDefinitionArn);
    out('ContainerName', CONTAINER_NAME);
    out('ServiceSecurityGroupId', serviceSecurityGroup.securityGroupId);
    out(
      'PrivateSubnetIds',
      props.vpc
        .selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS })
        .subnetIds.join(','),
    );
  }
}
