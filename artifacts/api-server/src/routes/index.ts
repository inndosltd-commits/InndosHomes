import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import propertiesRouter from "./properties";
import bookingsRouter from "./bookings";
import adminRouter from "./admin";
import storageRouter from "./storage";
import notificationsRouter from "./notifications";
import favoritesRouter from "./favorites";
import subscriptionsRouter from "./subscriptions";
import verifyIdRouter from "./verifyId";
import contactsRouter from "./contacts";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/properties", propertiesRouter);
router.use("/bookings", bookingsRouter);
router.use("/admin", adminRouter);
router.use(storageRouter);
router.use("/notifications", notificationsRouter);
router.use("/favorites", favoritesRouter);
router.use("/subscriptions", subscriptionsRouter);
router.use(verifyIdRouter);
router.use(contactsRouter);

export default router;
