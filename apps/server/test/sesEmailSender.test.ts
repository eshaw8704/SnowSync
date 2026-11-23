import type { SendEmailCommand } from '@aws-sdk/client-sesv2';
import { describe, expect, it, vi } from 'vitest';
import { parseEnv } from '../src/config/env';
import { chooseEmailSender, consoleEmailSender } from '../src/lib/email/emailSender';
import { createSesEmailSender } from '../src/lib/email/sesEmailSender';

const BASE = {
  NODE_ENV: 'test',
  PORT: '3000',
  LOG_LEVEL: 'silent',
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  JWT_ACCESS_SECRET: 'x'.repeat(32),
};

describe('Amazon SES email', () => {
  it('sends a plain-text email from the configured address', async () => {
    const send = vi.fn((_command: SendEmailCommand) => Promise.resolve({}));
    const sender = createSesEmailSender(
      { from: 'SnowSync <no-reply@snowsync.app>', region: 'us-west-2' },
      { send },
    );
    await sender.send({ to: 'maya@csus.edu', subject: 'Hello', text: 'Body' });

    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0]![0].input).toEqual({
      FromEmailAddress: 'SnowSync <no-reply@snowsync.app>',
      Destination: { ToAddresses: ['maya@csus.edu'] },
      Content: {
        Simple: {
          Subject: { Data: 'Hello', Charset: 'UTF-8' },
          Body: { Text: { Data: 'Body', Charset: 'UTF-8' } },
        },
      },
    });
  });

  it('passes SES failures to the caller so it can log them', async () => {
    const sender = createSesEmailSender(
      { from: 'a@b.c', region: 'us-west-2' },
      { send: () => Promise.reject(new Error('MessageRejected')) },
    );
    await expect(sender.send({ to: 'x@csus.edu', subject: 's', text: 't' })).rejects.toThrow(
      'MessageRejected',
    );
  });

  it('keeps logging emails in development and only uses SES when asked', () => {
    const dev = parseEnv({ ...BASE, NODE_ENV: 'development' });
    expect(dev.EMAIL_TRANSPORT).toBe('console');
    expect(chooseEmailSender(dev)).toBe(consoleEmailSender);

    const prod = parseEnv({ ...BASE, NODE_ENV: 'production', EMAIL_TRANSPORT: 'ses' });
    expect(chooseEmailSender(prod)).not.toBe(consoleEmailSender);
  });

  it('refuses to send in production without SES instead of logging real emails', async () => {
    const prod = parseEnv({ ...BASE, NODE_ENV: 'production' });
    await expect(
      chooseEmailSender(prod).send({ to: 'x@csus.edu', subject: 's', text: 't' }),
    ).rejects.toThrow('not configured');
  });

  it('rejects an unknown transport', () => {
    expect(() => parseEnv({ ...BASE, EMAIL_TRANSPORT: 'smtp' })).toThrow('EMAIL_TRANSPORT');
  });
});
