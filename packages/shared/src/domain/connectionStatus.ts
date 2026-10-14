/**
 * Phone connection status shown to the user (System Map §12, catalog 30).
 * Connection is never the same thing as delivery.
 */
export const ConnectionStatus = {
  ONLINE: 'ONLINE',
  WEAK: 'WEAK',
  OFFLINE: 'OFFLINE',
  RECONNECTING: 'RECONNECTING',
  SYNCHRONIZING: 'SYNCHRONIZING',
  SYNC_FAILED: 'SYNC_FAILED',
} as const;

/** One of the {@link ConnectionStatus} values. */
export type ConnectionStatus = (typeof ConnectionStatus)[keyof typeof ConnectionStatus];
