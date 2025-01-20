import Joi from "joi";
import { Types } from "mongoose";

// Custom validation for ObjectId
const objectId = (value, helpers) => {
    if (!Types.ObjectId.isValid(value)) {
        return helpers.message("Invalid ObjectId format.");
    }
    return value;
};

const reportPostSchema = Joi.object({
    postId: Joi.string().custom(objectId).required().messages({
        "string.base": "Post ID should be a type of text.",
        "string.empty": "Post ID cannot be an empty field.",
        "any.required": "Post ID is a required field.",
        "any.custom": "Invalid ObjectId format.",
    }),
    reason: Joi.string()
        .required()
        .valid("spam", "harassment", "hate speech", "other")
        .messages({
            "string.base": "Reason should be a type of text.",
            "string.empty": "Reason cannot be an empty field.",
            "any.required": "Reason is a required field.",
            "any.only":
                "Reason must be one of spam, harassment, hate speech, other.",
        }),
    message: Joi.string().trim().min(1).required().messages({
        "string.base": "Message should be a type of text.",
        "string.empty": "Message cannot be an empty field.",
        "string.min": "Message must be at least 1 character long.",
        "any.required": "Message is a required field.",
    }),
});

export { reportPostSchema };