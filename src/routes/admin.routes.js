import express from "express";
import { isAdmin, verifyJWT } from "../middlewares/auth.middleware.js";
import { getInactiveUsers, sendInactiveUserNotifications } from "../controllers/admin.controllers.js";

const router = express.Router();

router.route("/inactive-users").get(verifyJWT, isAdmin, getInactiveUsers)
router.route("/inactive-users/notify").post(verifyJWT, isAdmin, sendInactiveUserNotifications)

export default router;