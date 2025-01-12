import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    acceptConnectionRequest,
    checkConnectionStatus,
    deleteConnectionRequest,
    getConnections,
    getPendingConnectionRequests,
    removeConnection,
    sendConnectionRequest,
} from "../controllers/connection.controllers.js";

const router = Router();

// Connection Management
router.route("/request").post(verifyJWT, sendConnectionRequest);
router.route("/:connectionId/accept").patch(verifyJWT, acceptConnectionRequest);
router
    .route("/:connectionId/delete-request")
    .delete(verifyJWT, deleteConnectionRequest); // reject and delete
router.route("/:connectionId/remove").delete(verifyJWT, removeConnection);

// Connection Fetching
router.route("/all").get(verifyJWT, getConnections);
router.route("/pending-requests").get(verifyJWT, getPendingConnectionRequests);
router.route("/status/:targetUserId").get(verifyJWT, checkConnectionStatus);

export default router;
