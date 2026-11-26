import { Duration, RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import type { Construct } from 'constructs';

/* Left out of the generated database password so it is safe inside a URL. */
const URL_UNSAFE = ' %+~`#$&*()|[]{}:;<>?!\'/@"\\=,^';

export interface DataStackProps extends StackProps {
  vpc: ec2.IVpc;
}

/* PostgreSQL and Redis in isolated subnets. Their security groups have no inbound rules here: the service stack opens them to the server only. Secrets are generated into Secrets Manager. */
export class DataStack extends Stack {
  readonly database: rds.DatabaseInstance;
  readonly databaseSecurityGroup: ec2.SecurityGroup;
  readonly redisSecurityGroup: ec2.SecurityGroup;
  readonly redisEndpoint: string;
  readonly redisPort: string;
  readonly jwtSecret: secretsmanager.Secret;

  constructor(scope: Construct, id: string, props: DataStackProps) {
    super(scope, id, props);
    const isolated = { subnetType: ec2.SubnetType.PRIVATE_ISOLATED };

    this.databaseSecurityGroup = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
      vpc: props.vpc,
      description: 'PostgreSQL: reachable only from SnowSync server tasks',
      allowAllOutbound: false,
    });
    this.database = new rds.DatabaseInstance(this, 'Database', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_17,
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
      vpc: props.vpc,
      vpcSubnets: isolated,
      securityGroups: [this.databaseSecurityGroup],
      databaseName: 'snowsync',
      credentials: rds.Credentials.fromGeneratedSecret('snowsync', {
        excludeCharacters: URL_UNSAFE,
      }),
      allocatedStorage: 20,
      maxAllocatedStorage: 50,
      storageEncrypted: true,
      publiclyAccessible: false,
      multiAz: false,
      backupRetention: Duration.days(7),
      deletionProtection: true,
      removalPolicy: RemovalPolicy.SNAPSHOT,
    });

    this.redisSecurityGroup = new ec2.SecurityGroup(this, 'RedisSecurityGroup', {
      vpc: props.vpc,
      description: 'Redis: reachable only from SnowSync server tasks',
      allowAllOutbound: false,
    });
    const redisSubnets = new elasticache.CfnSubnetGroup(this, 'RedisSubnets', {
      description: 'SnowSync Redis (isolated subnets)',
      subnetIds: props.vpc.selectSubnets(isolated).subnetIds,
    });
    // A replication group (one node) because Redis only supports TLS there; the server connects with rediss://.
    // A plain CfnCacheCluster can't encrypt Redis traffic.
    const redis = new elasticache.CfnReplicationGroup(this, 'Redis', {
      replicationGroupDescription: 'SnowSync Redis',
      engine: 'redis',
      cacheNodeType: 'cache.t4g.micro',
      numCacheClusters: 1,
      automaticFailoverEnabled: false,
      cacheSubnetGroupName: redisSubnets.ref,
      securityGroupIds: [this.redisSecurityGroup.securityGroupId],
      transitEncryptionEnabled: true,
      atRestEncryptionEnabled: true,
    });
    this.redisEndpoint = redis.attrPrimaryEndPointAddress;
    this.redisPort = redis.attrPrimaryEndPointPort;

    this.jwtSecret = new secretsmanager.Secret(this, 'JwtAccessSecret', {
      description: 'SnowSync JWT_ACCESS_SECRET (signs access tokens)',
      generateSecretString: { passwordLength: 64, excludePunctuation: true },
    });
  }
}
