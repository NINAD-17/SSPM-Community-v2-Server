import Joi from "joi";

export const updateUserSchema = Joi.object({
    email: Joi.string().email().messages({
        "string.email": "Invalid email address",
    }),
    password: Joi.string().min(6).messages({
        "string.min": "Password must be at least 6 characters long",
    }),
    firstName: Joi.string().trim().messages({
        "string.base": "First name must be a string",
    }),
    lastName: Joi.string().trim().messages({
        "string.base": "Last name must be a string",
    }),
    headline: Joi.string().trim(),
    about: Joi.string().trim(),
    socialHandles: Joi.object().pattern(Joi.string(), Joi.string()),
    role: Joi.string().valid("student", "faculty").messages({
        "any.only": "Role must be either student or faculty",
    }),
    isAlumni: Joi.boolean(),
    isAdmin: Joi.boolean(),
    enrollmentYear: Joi.number().integer(),
    graduationYear: Joi.number().integer(),
    branch: Joi.string().trim(),
    currentlyWorkingAt: Joi.string().trim(),
    skills: Joi.array().items(Joi.string().trim()),
});
