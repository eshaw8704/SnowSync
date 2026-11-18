import { Router } from 'express';

/**
 * Member registration on /trips/:tripId/registration. Guards are listed on each
 * route, never with router.use(), because other routers share the /trips prefix.
 */
export const registrationRouter: Router = Router();
