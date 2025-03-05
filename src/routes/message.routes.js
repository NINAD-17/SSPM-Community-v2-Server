// routes/message.routes.js
import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { validateConnection } from "../middlewares/connection.middleware.js";
import { validateAndSanitizeInput } from "../middlewares/validation.middleware.js";
import {
    getConversationMessages,
    sendMessage,
    deleteMessage,
    updateMessage,
    markMessagesAsRead
} from "../controllers/message.controllers.js";
import { messageValidationSchema } from "../validators/message.validators.js";

const router = Router();

// Apply authentication middleware to all routes
router.use(verifyJWT);

// Get messages of a conversation
router.get("/conversation/:conversationId", 
    validateConnection,
    getConversationMessages
);

// Send a message
router.post("/conversation/:conversationId",
    validateConnection,
    // validateAndSanitizeInput(messageValidationSchema),
    sendMessage
);

// Update a message
router.route("/:messageId")
    .patch(validateConnection, updateMessage)
    .delete(validateConnection, deleteMessage);

// Mark messages as read
router.post("/conversation/:conversationId/read",
    validateConnection,
    markMessagesAsRead
);

export default router;