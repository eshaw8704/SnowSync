import { env } from '../../config/env';
import { logger } from '../logger';

/** One plain-text email. */
export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

/** Anything that can deliver an email. */
export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}

/**
 * Development sender: writes the whole email to the server log instead of sending it, so you can
 * copy a reset link from the terminal.
 */
export const consoleEmailSender: EmailSender = {
  send(message) {
    logger.info(
      { email: { from: env.EMAIL_FROM, ...message } },
      'Email (development: logged, not sent)',
    );
    return Promise.resolve();
  },
};

let currentSender: EmailSender = consoleEmailSender;

export function getEmailSender(): EmailSender {
  return currentSender;
}

/** Replaces the sender  */
export function setEmailSender(sender: EmailSender): void {
  currentSender = sender;
}
