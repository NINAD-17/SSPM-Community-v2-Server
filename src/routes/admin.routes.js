import express from "express";
import { isAdmin, verifyJWT } from "../middlewares/auth.middleware.js";
import { getInactiveUsers, getUserActivityStats, sendInactiveUserNotifications } from "../controllers/admin.controllers.js";

const router = express.Router();

router.route("/inactive-users").get(verifyJWT, isAdmin, getInactiveUsers)
router.route("/inactive-users/notify").post(verifyJWT, isAdmin, sendInactiveUserNotifications)
router.route("/user-activity-stats").get(verifyJWT, isAdmin, getUserActivityStats)

export default router;