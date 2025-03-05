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
