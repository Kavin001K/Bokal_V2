import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import bookingsRouter from "./bookings.js";
import venuesRouter from "./venues.js";
import settingsRouter from "./settings.js";
import usersRouter from "./users.js";
import reportsRouter from "./reports.js";
import customersRouter from "./customers.js";
import verifyRouter from "./verify-pdf.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(bookingsRouter);
router.use(venuesRouter);
router.use(settingsRouter);
router.use(usersRouter);
router.use(reportsRouter);
router.use(customersRouter);
router.use("/verify", verifyRouter);

export default router;
