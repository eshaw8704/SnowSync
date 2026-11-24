import { SendEmailCommand, SESv2Client } from '@aws-sdk/client-sesv2';
import { logger } from '../logger';
import type { EmailMessage, EmailSender } from './emailSender';

/* The part of the SES client the sender uses, so tests can pass a fake. */
export interface SesClientLike {
  send(command: SendEmailCommand): Promise<unknown>;
}

/* Production sender: delivers through Amazon SES. Credentials come from the ECS task role. */
export function createSesEmailSender(
  options: { from: string; region: string },
  // A stalled SES call fails after about 5 s instead of holding the request open. No retries,
  // so an email SES may have accepted is never sent twice.
  client: SesClientLike = new SESv2Client({
    region: options.region,
    maxAttempts: 1,
    requestHandler: {
      connectionTimeout: 3_000,
      requestTimeout: 5_000,
      throwOnRequestTimeout: true,
    },
  }),
): EmailSender {
  return {
    async send(message: EmailMessage) {
      try {
        await client.send(
          new SendEmailCommand({
            FromEmailAddress: options.from,
            Destination: { ToAddresses: [message.to] },
            Content: {
              Simple: {
                Subject: { Data: message.subject, Charset: 'UTF-8' },
                Body: { Text: { Data: message.text, Charset: 'UTF-8' } },
              },
            },
          }),
        );
      } catch (error) {
        // Name and status only: SES messages can contain the recipient's address.
        const failure = error as { name?: string; $metadata?: { httpStatusCode?: number } };
        logger.error(
          { sesError: failure.name, httpStatus: failure.$metadata?.httpStatusCode },
          'SES send failed',
        );
        throw error;
      }
    },
  };
}
