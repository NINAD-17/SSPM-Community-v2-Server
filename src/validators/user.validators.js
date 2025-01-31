import Joi from "joi";

// Update Profile Schema
export const updateUserSchema = Joi.object({
    headline: Joi.string().allow("").optional(),
    about: Joi.string().allow("").optional(),
    status: Joi.string().allow("").optional(),
    currentlyWorkingAt: Joi.string().allow("").optional(),
    socialHandles: Joi.array()
        .items(
            Joi.object({
                name: Joi.string().required(),
                url: Joi.string().required(),
            })
        )
        .optional(),
    skills: Joi.array().items(Joi.string().trim()).optional(),
}).unknown(true);
