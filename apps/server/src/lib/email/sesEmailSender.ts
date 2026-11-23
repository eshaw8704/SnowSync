import { SendEmailCommand, SESv2Client } from '@aws-sdk/client-sesv2';
import type { EmailMessage, EmailSender } from './emailSender';

/* The part of the SES client the sender uses, so tests can pass a fake. */
export interface SesClientLike {
  send(command: SendEmailCommand): Promise<unknown>;
}

/* Production sender: delivers through Amazon SES. Credentials come from the ECS task role. */
export function createSesEmailSender(
  options: { from: string; region: string },
  client: SesClientLike = new SESv2Client({ region: options.region }),
): EmailSender {
  return {
    async send(message: EmailMessage) {
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
    },
  };
}
