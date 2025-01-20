import Joi from "joi";
import { Types } from "mongoose";

// Custom validation for ObjectId
const objectId = (value, helpers) => {
    if (!Types.ObjectId.isValid(value)) {
        return helpers.message("Invalid ObjectId format.");
    }
    return value;
};

const baseUserPostSchema = Joi.object({
    content: Joi.string().trim().min(1).required().messages({
        "string.base": "Content should be a type of text.",
        "string.empty": "Content cannot be an empty field.",
        "string.min": "Content must be at least 1 character long.",
        "any.required": "Content is a required field.",
    }),
    media: Joi.array().items(Joi.string().uri()).max(5).messages({
        "array.base": "Media should be an array of URIs.",
        "array.max": "You can upload a maximum of 5 media files.",
        "string.uri": "Each media item should be a valid URI.",
    }),
});

const createUserPostSchema = baseUserPostSchema.keys({
    userId: Joi.string().custom(objectId).required().messages({
        "string.base": "User ID should be a type of text.",
        "string.empty": "User ID cannot be an empty field.",
        "any.required": "User ID is a required field.",
        "any.custom": "Invalid ObjectId format.",
    }),
});

const updateUserPostSchema = baseUserPostSchema;

export { createUserPostSchema, updateUserPostSchema };
