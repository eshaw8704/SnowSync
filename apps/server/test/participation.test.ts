import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../src/db/prisma';
import { domainEvents } from '../src/lib/domainEvents';
import {
  participationTransaction,
  type ParticipationChange,
} from '../src/modules/participation/participationService';
import { resetDatabase } from './helpers/db';
import { createUser } from './helpers/factories';
import { createTrip } from './helpers/trips';

async function setup(participation?: 'REGISTERED' | 'CHECKED_IN') {
  const officer = await createUser({ role: 'OFFICER' });
  const member = await createUser();
  const trip = await createTrip({
    createdById: officer.id,
    state: 'OPEN_FOR_REGISTRATION',
    roster: participation ? [{ userId: member.id, participation }] : [],
  });
  return { officer, member, trip };
}

function change(
  base: { tripId: string; userId: string },
  overrides: Partial<ParticipationChange>,
): ParticipationChange {
  return {
    ...base,
    from: 'NOT_REGISTERED',
    to: 'REGISTERED',
    method: 'SELF',
    actorId: base.userId,
    opId: randomUUID(),
    ...overrides,
  };
}

describe('applyParticipationChange()', () => {
  const events = vi.fn();
  let off: () => void;

  beforeEach(async () => {
    await resetDatabase();
    events.mockReset();
    off = domainEvents.on('ParticipationChanged', events);
  });

  afterEach(() => {
    off();
  });

  it('creates the membership for a first registration and records the event', async () => {
    const { member, trip } = await setup();
    const result = await participationTransaction((_tx, apply) =>
      apply(change({ tripId: trip.id, userId: member.id }, {})),
    );
    expect(result).toMatchObject({ applied: true, replayed: false, participation: 'REGISTERED' });
    const event = await prisma.attendanceEvent.findFirstOrThrow();
    expect(event).toMatchObject({
      fromState: 'NOT_REGISTERED',
      toState: 'REGISTERED',
      method: 'SELF',
      actorId: member.id,
    });
    expect(events).toHaveBeenCalledWith({
      tripId: trip.id,
      userId: member.id,
      fromState: 'NOT_REGISTERED',
      toState: 'REGISTERED',
      method: 'SELF',
      version: 1,
    });
  });

  it('moves an existing row only from the expected state and bumps its version', async () => {
    const { officer, member, trip } = await setup('REGISTERED');
    const result = await participationTransaction((_tx, apply) =>
      apply(
        change(
          { tripId: trip.id, userId: member.id },
          {
            from: 'REGISTERED',
            to: 'CHECKED_IN',
            method: 'OFFICER',
            actorId: officer.id,
            reason: 'At the bus',
            lateMinutes: 12,
            set: { checkedInAt: new Date(), checkInMethod: 'OFFICER', lateMinutes: 12 },
          },
        ),
      ),
    );
    expect(result).toMatchObject({ applied: true, participation: 'CHECKED_IN', version: 2 });
    await expect(prisma.tripMembership.findFirstOrThrow()).resolves.toMatchObject({
      participation: 'CHECKED_IN',
      checkInMethod: 'OFFICER',
      lateMinutes: 12,
      version: 2,
    });
    await expect(prisma.attendanceEvent.findFirstOrThrow()).resolves.toMatchObject({
      reason: 'At the bus',
      lateMinutes: 12,
    });
  });

  it('changes nothing when the member is no longer in the expected state', async () => {
    const { member, trip } = await setup('CHECKED_IN');
    const result = await participationTransaction((_tx, apply) =>
      apply(change({ tripId: trip.id, userId: member.id }, { from: 'REGISTERED', to: 'NO_SHOW' })),
    );
    expect(result).toMatchObject({ applied: false, participation: 'CHECKED_IN', version: 1 });
    expect(await prisma.attendanceEvent.count()).toBe(0);
    expect(events).not.toHaveBeenCalled();
  });

  it('applies the same opId only once', async () => {
    const { member, trip } = await setup();
    const opId = randomUUID();
    const first = change({ tripId: trip.id, userId: member.id }, { opId });
    await participationTransaction((_tx, apply) => apply(first));
    const again = await participationTransaction((_tx, apply) => apply(first));
    expect(again).toMatchObject({ applied: true, replayed: true, participation: 'REGISTERED' });
    expect(await prisma.attendanceEvent.count()).toBe(1);
    expect(events).toHaveBeenCalledTimes(1);
  });

  it('rejects a change the participation state machine does not allow', async () => {
    const { member, trip } = await setup('REGISTERED');
    await expect(
      participationTransaction((_tx, apply) =>
        apply(change({ tripId: trip.id, userId: member.id }, { from: 'REGISTERED', to: 'ACTIVE' })),
      ),
    ).rejects.toMatchObject({ code: 'CONFLICT', details: { reason: 'PARTICIPATION_NOT_ALLOWED' } });
  });

  it('rejects an opId reused for a different member', async () => {
    const { member, trip } = await setup();
    const anotherMember = await createUser();
    const opId = randomUUID();

    await participationTransaction((_tx, apply) =>
      apply(change({ tripId: trip.id, userId: member.id }, { opId })),
    );

    await expect(
      participationTransaction((_tx, apply) =>
        apply(change({ tripId: trip.id, userId: anotherMember.id }, { opId })),
      ),
    ).rejects.toMatchObject({ code: 'CONFLICT' });

    expect(await prisma.attendanceEvent.count()).toBe(1);
    expect(await prisma.tripMembership.count()).toBe(1);
  });

  it('handles concurrent retries of the same participation change', async () => {
    const { officer, member, trip } = await setup('REGISTERED');

    const request = change(
      { tripId: trip.id, userId: member.id },
      {
        from: 'REGISTERED',
        to: 'CHECKED_IN',
        method: 'OFFICER',
        actorId: officer.id,
      },
    );

    const results = await Promise.all([
      participationTransaction((_tx, apply) => apply(request)),
      participationTransaction((_tx, apply) => apply(request)),
    ]);

    expect(results.every((result) => result.applied)).toBe(true);
    expect(results.some((result) => result.replayed)).toBe(true);
    expect(await prisma.attendanceEvent.count()).toBe(1);
  });

  it('rejects mismatched late-minute values', async () => {
    const { officer, member, trip } = await setup('REGISTERED');

    await expect(
      participationTransaction((_tx, apply) =>
        apply(
          change(
            { tripId: trip.id, userId: member.id },
            {
              from: 'REGISTERED',
              to: 'CHECKED_IN',
              method: 'OFFICER',
              actorId: officer.id,
              lateMinutes: 12,
              set: { lateMinutes: 5 },
            },
          ),
        ),
      ),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });

    const membership = await prisma.tripMembership.findFirstOrThrow();
    expect(membership.participation).toBe('REGISTERED');
    expect(await prisma.attendanceEvent.count()).toBe(0);
  });

  it('records check-in metadata when optional fields are omitted', async () => {
    const { officer, member, trip } = await setup('REGISTERED');

    await participationTransaction((_tx, apply) =>
      apply(
        change(
          { tripId: trip.id, userId: member.id },
          {
            from: 'REGISTERED',
            to: 'CHECKED_IN',
            method: 'OFFICER',
            actorId: officer.id,
          },
        ),
      ),
    );

    const membership = await prisma.tripMembership.findFirstOrThrow();

    expect(membership.participation).toBe('CHECKED_IN');
    expect(membership.checkedInAt).toBeInstanceOf(Date);
    expect(membership.checkInMethod).toBe('OFFICER');
    expect(membership.checkedInById).toBe(officer.id);
  });

  it('emits nothing and keeps nothing when the transaction rolls back', async () => {
    const { member, trip } = await setup();
    await expect(
      participationTransaction(async (_tx, apply) => {
        await apply(change({ tripId: trip.id, userId: member.id }, {}));
        throw new Error('later step failed');
      }),
    ).rejects.toThrow('later step failed');
    expect(await prisma.tripMembership.count()).toBe(0);
    expect(events).not.toHaveBeenCalled();
  });
});
