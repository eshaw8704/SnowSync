# SnowSync infrastructure (AWS CDK)

Everything SnowSync runs on in AWS is defined here, so anyone on the team can recreate it
(System Map §23). Nothing secret lives in this folder: the database password and the JWT secret
are generated into AWS Secrets Manager when the stacks are deployed.

| Stack                  | What it creates                                                                                |
| ---------------------- | ---------------------------------------------------------------------------------------------- |
| `SnowSyncNetwork`      | VPC across 2 Availability Zones: public, private (with 1 NAT gateway) and isolated subnets     |
| `SnowSyncData`         | PostgreSQL 17 (RDS) and Redis (ElastiCache, TLS) in isolated subnets; generated secrets        |
| `SnowSyncEmail`        | Amazon SES domain identity with Easy DKIM (SS-36)                                              |
| `SnowSyncService`      | ECR repository, ECS cluster, 2+ Fargate tasks behind an HTTPS Application Load Balancer        |
| `SnowSyncGithubDeploy` | The IAM role GitHub Actions assumes through OIDC to deploy from `main` (no AWS keys in GitHub) |

## Before the first deploy (team decisions)

1. **AWS account access** for whoever deploys, with the AWS CLI signed in (`aws sts get-caller-identity`).
2. **A domain** for the API (for example `api.snowsync.app`) and an **ACM certificate** for it in the
   deploy region. Copy the certificate ARN.
3. **The sender address** on a domain you control, for example `SnowSync <no-reply@snowsync.app>`.

## First deploy

The ECR repository starts empty, so the service is created with no tasks first, an image is pushed,
and then the service is scaled up.

1. Create everything with **0 tasks**:

   ```bash
   cd infra
   npx cdk bootstrap                       # once per account and region
   npx cdk deploy --all \
     -c certificateArn=arn:aws:acm:us-west-2:123456789012:certificate/… \
     -c domainName=api.snowsync.app \
     -c "emailFrom=SnowSync <no-reply@snowsync.app>" \
     -c desiredCount=0
   ```

   On PowerShell, put each `-c` value in single quotes. If the account already has GitHub's OIDC
   provider, add `-c createGithubOidcProvider=false`.

2. Using the stack outputs:
   - Point the API domain at the `LoadBalancerDns` output with a CNAME record.
   - Add the three `DkimRecord` outputs as CNAME records at your DNS provider, then request SES
     production access in the SES console (it can take a day or more).
   - In GitHub → Settings → Secrets and variables → Actions → **Variables**, add
     `AWS_DEPLOY_ROLE_ARN` with the `DeployRoleArn` output.

3. Push the first image: Actions → **Deploy** → **Run workflow**. It builds and pushes the image,
   runs the migrations and registers a task definition for that commit (the service still has 0
   tasks).

4. Scale up: run the same `npx cdk deploy --all` command again **without** `-c desiredCount=0`.
   The service starts 2 tasks from the image the workflow pushed.

## Every deploy after that

Every green push to `main` runs `.github/workflows/deploy.yml`: it builds the image, tags it with
the commit SHA, runs the migrations once as a one-off task, registers a task definition pinned to
that SHA, and rolls the service onto it. A failed migration stops the deploy before the running
service changes, and if new tasks fail their health checks, ECS rolls back to the previous
revision (the previous image, not `latest`).

Running `npx cdk deploy` again later (for infrastructure changes) points the service back at the
CDK task definition, which uses the most recent image (`latest`), so nothing goes backwards.

## Check without deploying

```bash
npm test --workspace @snowsync/infra   # synthesizes every stack and checks the important settings
```
