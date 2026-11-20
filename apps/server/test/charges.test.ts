import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/db/prisma';
import { createTripCharge, releaseTripCharge } from '../src/modules/charges/chargeService';
import { resetDatabase } from './helpers/db';
import { createUser } from './helpers/factories';
import { createTrip } from './helpers/trips';

async function setup(costCents = 4500) {
  const officer = await createUser({ role: 'OFFICER' });
  const member = await createUser();
  const trip = await createTrip({ createdById: officer.id, costCents });
  return { member, trip };
}

describe('trip charges', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('creates one UNPAID trip charge due when registration closes', async () => {
    const { member, trip } = await setup();
    const charge = await createTripCharge(prisma, member.id, trip);
    expect(charge).toMatchObject({
      kind: 'TRIP',
      status: 'UNPAID',
      amountCents: 4500,
      dueAt: trip.registrationClosesAt,
    });
  });

  it('creates nothing for a free trip', async () => {
    const { member, trip } = await setup(0);
    await expect(createTripCharge(prisma, member.id, trip)).resolves.toBeNull();
    expect(await prisma.charge.count()).toBe(0);
  });

  it('reuses a live charge instead of creating a second one', async () => {
    const { member, trip } = await setup();
    const first = await createTripCharge(prisma, member.id, trip);
    const second = await createTripCharge(prisma, member.id, trip);
    expect(second?.id).toBe(first?.id);
    expect(await prisma.charge.count()).toBe(1);
  });

  it('voids an unpaid charge and sends a paid one to refund review', async () => {
    const { member, trip } = await setup();
    await createTripCharge(prisma, member.id, trip);
    await expect(releaseTripCharge(prisma, member.id, trip.id)).resolves.toBe('VOID');

    await createTripCharge(prisma, member.id, trip);
    await prisma.charge.updateMany({ where: { status: 'UNPAID' }, data: { status: 'PAID' } });
    await expect(releaseTripCharge(prisma, member.id, trip.id)).resolves.toBe('REFUND_REVIEW');
    expect(await prisma.charge.count()).toBe(2);
  });

  it('returns null when there is no charge to release', async () => {
    const { member, trip } = await setup();
    await expect(releaseTripCharge(prisma, member.id, trip.id)).resolves.toBeNull();
  });
});
