import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    getConversationDetails,
    getConversationMessages,
    getConversations,
    startConversation,
    updateGroupDetails,
} from "../controllers/conversation.controllers.js";
import { validateAndSanitizeInput } from "../middlewares/validation.middleware.js";
import {
    startConversationSchema,
    updateGroupDetailsSchema,
} from "../validators/conversation.validators.js";

const router = Router();

// get conversations and information
router.route("/all").get(verifyJWT, getConversations);
router.route("/:conversationId/details").get(verifyJWT, getConversationDetails);
router
    .route("/:conversationId/messages")
    .get(verifyJWT, getConversationMessages);

// start conversation
router
    .route("/new")
    .post(
        verifyJWT,
        validateAndSanitizeInput(startConversationSchema),
        startConversation
    );
router
    .route("/:conversationId/update")
    .patch(
        verifyJWT,
        validateAndSanitizeInput(updateGroupDetailsSchema),
        updateGroupDetails
    );

export default router;
