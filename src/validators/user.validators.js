import Joi from "joi";

export const registerUserSchema = Joi.object({
    email: Joi.string().email().required().messages({
        "string.email": "Invalid email address",
        "any.required": "Email is required",
    }),
    password: Joi.string().min(6).required().messages({
        "string.min": "Password must be at least 6 characters long",
        "any.required": "Password is required",
    }),
    firstName: Joi.string().trim().required().messages({
        "string.base": "First name must be a string",
        "any.required": "First name is required",
    }),
    lastName: Joi.string().trim().required().messages({
        "string.base": "Last name must be a string",
        "any.required": "Last name is required",
    }),
    role: Joi.string().valid("student", "faculty").required().messages({
        "any.only": "Role must be either student or faculty",
        "any.required": "Role is required",
    }),
    branch: Joi.string().trim().required().messages({
        "any.required": "Branch is required",
    }),
    graduationYear: Joi.number().integer().required().messages({
        "any.required": "Graduation year is required",
    }),
});

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
