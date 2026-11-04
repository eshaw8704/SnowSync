import { describe, expect, it, vi } from 'vitest';
import { domainEvents, type TripStateChanged } from '../src/lib/domainEvents';

const event: TripStateChanged = {
  tripId: 'trip-1',
  fromState: 'CREATED',
  toState: 'OPEN_FOR_REGISTRATION',
  version: 2,
  actorType: 'SCHEDULER',
};

describe('domainEvents', () => {
  it('delivers events to listeners until they unsubscribe', () => {
    const listener = vi.fn();
    const off = domainEvents.on('TripStateChanged', listener);
    domainEvents.emit('TripStateChanged', event);
    off();
    domainEvents.emit('TripStateChanged', event);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(event);
  });

  it('keeps delivering to other listeners when one throws', () => {
    const broken = domainEvents.on('TripStateChanged', () => {
      throw new Error('listener bug');
    });
    const healthy = vi.fn();
    const off = domainEvents.on('TripStateChanged', healthy);
    expect(() => domainEvents.emit('TripStateChanged', event)).not.toThrow();
    expect(healthy).toHaveBeenCalledTimes(1);
    broken();
    off();
  });
});
