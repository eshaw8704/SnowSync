import { Router } from 'express';

/** Member waitlist on /trips/:tripId/waitlist. Guards are listed on each route. */
export const memberWaitlistRouter: Router = Router();

/** Officer waitlist on /admin/trips/:tripId/waitlist. */
export const adminWaitlistRouter: Router = Router();
