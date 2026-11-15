/**
 * Generates a version 4 UUID for an officer command.
 * Reuses the same opId on retry to prevent duplicate state changes.
 */
export function newOpId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    return (char === 'x' ? random : (random & 0x3) | 0x8).toString(16);
  });
}
