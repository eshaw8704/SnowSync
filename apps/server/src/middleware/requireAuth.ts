import type { RequestHandler } from 'express';
import { prisma } from '../db/prisma';
import { HttpError } from '../lib/httpError';
import { verifyAccessToken } from '../modules/auth/tokenService';

//Requires a bearer access token, then loads the person's current role and membership from the database into req.auth.
export const requireAuth: RequestHandler = async (req, _res, next) => {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    throw new HttpError('UNAUTHORIZED', 'Sign in to continue.');
  }

  const { userId } = await verifyAccessToken(header.slice('Bearer '.length));

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, membershipStatus: true },
  });

  if (!user || user.membershipStatus === 'DEACTIVATED') {
    throw new HttpError('UNAUTHORIZED', 'Your session has expired. Sign in again.');
  }

  req.auth = {
    userId: user.id,
    role: user.role,
    membershipStatus: user.membershipStatus,
  };

  next();
};

//Use after requireAuth on club features. Only approved members pass.
export const requireApprovedMember: RequestHandler = (req, _res, next) => {
  if (req.auth?.membershipStatus !== 'APPROVED') {
    throw new HttpError('FORBIDDEN', 'Your club membership is not approved yet.', {
      reason: 'MEMBERSHIP_NOT_APPROVED',
    });
  }

  next();
};
