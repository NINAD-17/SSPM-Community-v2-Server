import Joi from "joi";

// Registration Schema
export const registerUserSchema = Joi.object({
    email: Joi.string().email().required().messages({
        "string.email": "Invalid email address",
        "any.required": "Email is required",
        "string.empty": "Email cannot be empty"
    }),
    password: Joi.string().min(6).required().messages({
        "string.min": "Password must be at least 6 characters long",
        "any.required": "Password is required",
        "string.empty": "Password cannot be empty"
    }),
    firstName: Joi.string().trim().not("").required().messages({
        "string.base": "First name must be a string",
        "any.required": "First name is required",
        "string.empty": "First name cannot be empty"
    }),
    lastName: Joi.string().trim().not("").required().messages({
        "string.base": "Last name must be a string",
        "any.required": "Last name is required",
        "string.empty": "Last name cannot be empty"
    }),
    branch: Joi.string().trim().not("").required().messages({
        "any.required": "Branch is required",
        "string.empty": "Branch cannot be empty"
    }),
    graduationYear: Joi.number().required().messages({
        "any.required": "Graduation year is required",
        "number.base": "Graduation year must be a number"
    }),
    role: Joi.string().valid("student", "faculty").default("student").messages({
        "any.only": "Role must be either student or faculty"
    })
});

// Login Schema
export const loginUserSchema = Joi.object({
    email: Joi.string().email().required().messages({
        "string.email": "Invalid email address",
        "any.required": "Email is required",
        "string.empty": "Email cannot be empty"
    }),
    password: Joi.string().required().messages({
        "any.required": "Password is required",
        "string.empty": "Password cannot be empty"
    })
});

// Update Profile Schema
export const updateUserSchema = Joi.object({
    headline: Joi.string().allow("").optional(),
    about: Joi.string().allow("").optional(),
    status: Joi.string().allow("").optional(),
    currentlyWorkingAt: Joi.string().allow("").optional(),
    socialHandles: Joi.array().items(
        Joi.object({
            name: Joi.string().required(),
            url: Joi.string().required()
        })
    ).optional(),
    skills: Joi.array().items(Joi.string().trim()).optional()
}).unknown(true);
