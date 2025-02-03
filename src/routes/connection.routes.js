import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    acceptConnectionRequest,
    checkConnectionStatus,
    deleteConnectionRequest,
    getConnections,
    getInvitationsSentByUser,
    getMutualConnection,
    getPendingConnectionRequests,
    removeConnection,
    sendConnectionRequest,
} from "../controllers/connection.controllers.js";

const router = Router();

// Connection Management
router.route("/request/:recipientId").post(verifyJWT, sendConnectionRequest);
router.route("/:connectionId/accept").patch(verifyJWT, acceptConnectionRequest);
router
    .route("/:connectionId/decline")
    .delete(verifyJWT, deleteConnectionRequest); // reject and delete
router.route("/:connectionId/remove").delete(verifyJWT, removeConnection);

// Connection Fetching
router.route("/all").get(verifyJWT, getConnections);
router.route("/invititions").get(verifyJWT, getInvitationsSentByUser);
router.route("/pending-requests").get(verifyJWT, getPendingConnectionRequests);
router.route("/status/:targetUserId").get(verifyJWT, checkConnectionStatus);
router.route("/:targetUserId/mutual").get(verifyJWT, getMutualConnection);

export default router;
