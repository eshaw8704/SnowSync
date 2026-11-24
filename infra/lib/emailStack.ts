import { CfnOutput, Stack, type StackProps } from 'aws-cdk-lib';
import * as ses from 'aws-cdk-lib/aws-ses';
import type { Construct } from 'constructs';
import type { SnowSyncConfig } from './config';

/* The domain part of an address such as `SnowSync <no-reply@snowsync.app>`. */
export function sendingDomain(emailFrom: string): string {
  const match = /@([^>\s]+)/.exec(emailFrom);
  if (!match?.[1]) {
    throw new Error(`emailFrom "${emailFrom}" has no domain`);
  }
  return match[1];
}

export interface EmailStackProps extends StackProps {
  config: SnowSyncConfig;
}

/* SES sending identity for the domain in `emailFrom`, verified with DKIM. Add the three DKIM CNAME outputs at the DNS provider, then request SES production access. */
export class EmailStack extends Stack {
  readonly identity: ses.EmailIdentity;

  constructor(scope: Construct, id: string, props: EmailStackProps) {
    super(scope, id, props);
    const domain = sendingDomain(props.config.emailFrom);
    this.identity = new ses.EmailIdentity(this, 'Domain', {
      identity: ses.Identity.domain(domain),
      dkimSigning: true,
    });
    this.identity.dkimRecords.forEach((record, index) => {
      new CfnOutput(this, `DkimRecord${index + 1}`, {
        value: `${record.name} CNAME ${record.value}`,
        description: `Add at your DNS provider to verify ${domain} for SES`,
      });
    });
  }
}
