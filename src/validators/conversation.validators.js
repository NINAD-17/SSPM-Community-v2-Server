import Joi from "joi";

export const startConversationSchema = Joi.object({
    participants: Joi.array()
        .items(Joi.string().required())
        .min(2)
        .required()
        .messages({
            "array.min": "At least two participants are required",
            "any.required": "Participants array is required",
        }),
    isGroupChat: Joi.boolean().required(),
    groupName: Joi.string()
        .when("isGroupChat", {
            is: true,
            then: Joi.required(),
            otherwise: Joi.optional(),
        })
        .messages({
            "any.required": "Group name is required for group chats",
        }),
    groupDescription: Joi.string().optional(),
});

export const updateGroupDetailsSchema = Joi.object({
    groupName: Joi.string().trim().optional(),
    groupDescription: Joi.string().trim().optional(),
    participants: Joi.array().items(Joi.string().trim()).optional(),
    admins: Joi.array().items(Joi.string().trim()).optional(),
});
