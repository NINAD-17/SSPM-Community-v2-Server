import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { validateAndSanitizeInput } from "../middlewares/validation.middleware.js";
import {
    deleteMessage,
    sendMessage,
    updateMessage,
} from "../controllers/message.controllers.js";
import { messageValidationSchema } from "../validators/message.validators.js";

const router = Router();

router
    .route("/conversation/:conversationId/send")
    .post(verifyJWT, messageValidationSchema, sendMessage);
router
    .route("/conversation/:conversationId/msg/:messageId")
    .patch(verifyJWT, messageValidationSchema, updateMessage)
    .delete(verifyJWT, deleteMessage);

export default router;
