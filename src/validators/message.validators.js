import Joi from "joi";

export const messageValidationSchema = Joi.object({
    conversationId: Joi.string().required().messages({
        "any.required": "Conversation ID is required",
    }),
    senderId: Joi.string().required().messages({
        "any.required": "Sender ID is required",
    }),
    content: Joi.string().trim().required().messages({
        "string.empty": "Message content cannot be empty",
        "any.required": "Message content is required",
    }),
});
