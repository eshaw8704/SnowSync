import { env } from '../../config/env';
import { logger } from '../logger';
import { createSesEmailSender } from './sesEmailSender';

/* One plain-text email. */
export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

/* Anything that can deliver an email. */
export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}

/* Development sender: logs the email instead of sending it, so you can copy a reset link. */
export const consoleEmailSender: EmailSender = {
  send(message) {
    logger.info(
      { email: { from: env.EMAIL_FROM, ...message } },
      'Email (development: logged, not sent)',
    );
    return Promise.resolve();
  },
};

const unavailableEmailSender: EmailSender = {
  send() {
    return Promise.reject(new Error('Production email sender is not configured'));
  },
};

/* `ses` sends through Amazon SES, otherwise emails are logged. Production without SES refuses to send instead of logging emails meant for real people. */

export function chooseEmailSender(
  config: Pick<typeof env, 'NODE_ENV' | 'EMAIL_TRANSPORT' | 'EMAIL_FROM' | 'AWS_REGION'>,
): EmailSender {
  if (config.EMAIL_TRANSPORT === 'ses') {
    return createSesEmailSender({ from: config.EMAIL_FROM, region: config.AWS_REGION });
  }
  return config.NODE_ENV === 'production' ? unavailableEmailSender : consoleEmailSender;
}

let currentSender: EmailSender = chooseEmailSender(env);

export function getEmailSender(): EmailSender {
  return currentSender;
}

// Replaces the sender (tests use this to capture emails).
export function setEmailSender(sender: EmailSender): void {
  currentSender = sender;
}
