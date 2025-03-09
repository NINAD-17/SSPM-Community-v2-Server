import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { validateConnection } from "../middlewares/connection.middleware.js";
import { validateAndSanitizeInput } from "../middlewares/validation.middleware.js";
import {
    getConversations,
    getConversationDetails,
    startConversation,
    updateGroupDetails
} from "../controllers/conversation.controllers.js";
import {
    startConversationSchema,
    updateGroupDetailsSchema
} from "../validators/conversation.validators.js";
import { getConnections } from "../controllers/connection.controllers.js"

const router = Router();

// Apply authentication middleware to all routes
router.use(verifyJWT);

// Get all conversations (chat list)
router.get("/", getConversations);

// Start new conversation
router.post("/new",
    validateConnection,
    // validateAndSanitizeInput(startConversationSchema),
    startConversation
);

// Fetch connected users to start/see the conversation
router.get("/connection-list", getConnections);

// Get conversation details
router.get("/:conversationId",
    validateConnection,
    getConversationDetails
);

// Update group details
router.patch("/:conversationId/group",
    validateConnection,
    validateAndSanitizeInput(updateGroupDetailsSchema),
    updateGroupDetails
);

export default router;
