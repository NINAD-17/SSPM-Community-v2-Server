import Joi from "joi";

export const emailVerificationSchema = Joi.object({
    email: Joi.string().email().required().messages({
        "string.email": "Invalid email address",
        "any.required": "Email is required",
        "string.empty": "Email cannot be empty",
    }),
});

export const passwordSchema = Joi.object({
    newPassword: Joi.string().min(8).max(40).required()
        // .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
        .messages({
            "string.min": "Password must be at least 8 characters long",
            "string.max": "Password cannot exceed 40 characters",
            "any.required": "Password is required",
            // "string.pattern.base": "Password must contain at least one uppercase letter, one lowercase letter, one number and one special character",
            "string.empty": "Password cannot be empty"
        })
});

export const verifyOTPSchema = Joi.object({
    email: Joi.string().email().required().messages({
        "string.email": "Invalid email address",
        "any.required": "Email is required",
        "string.empty": "Email cannot be empty",
    }),
    otp: Joi.string().required().length(6).messages({
        "any.required": "OTP is required",
        "string.empty": "OTP cannot be empty",
        "string.min": "OTP must be 6 characters long",
        "string.max": "OTP must be 6 characters long",
    }),
});

export const completeRegistrationSchema = Joi.object({
    password: Joi.string().min(6).required().messages({
        "string.min": "Password must be at least 6 characters long",
        "any.required": "Password is required",
        "string.empty": "Password cannot be empty",
    }),
    firstName: Joi.string().trim().not("").required().messages({
        "string.base": "First name must be a string",
        "any.required": "First name is required",
        "string.empty": "First name cannot be empty",
    }),
    lastName: Joi.string().trim().not("").required().messages({
        "string.base": "Last name must be a string",
        "any.required": "Last name is required",
        "string.empty": "Last name cannot be empty",
    }),
    branch: Joi.string().trim().not("").required().messages({
        "any.required": "Branch is required",
        "string.empty": "Branch cannot be empty",
    }),
    graduationYear: Joi.number().required().messages({
        "any.required": "Graduation year is required",
        "number.base": "Graduation year must be a number",
    }),
    role: Joi.string().valid("student", "faculty").default("student").messages({
        "any.only": "Role must be either student or faculty",
    }),
});

export const loginSchema = Joi.object({
    email: Joi.string().email().required().messages({
        "string.email": "Invalid email address",
        "any.required": "Email is required",
        "string.empty": "Email cannot be empty",
    }),
    password: Joi.string().min(8).max(40).required().messages({
        "any.required": "Password is required",
        "string.empty": "Password cannot be empty",
        "string.min": "Password must be at least 8 characters long",
    }),
});

export const changePasswordSchema = Joi.object({
    currentPassword: Joi.string().required().messages({
        "any.required": "Current password is required",
        "string.empty": "Current password cannot be empty"
    }),
    newPassword: Joi.string().min(8).max(40).required()
        // .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
        .messages({
            "string.min": "Password must be at least 8 characters long",
            "string.max": "Password cannot exceed 40 characters",
            "any.required": "Password is required",
            // "string.pattern.base": "Password must contain at least one uppercase letter, one lowercase letter, one number and one special character",
            "string.empty": "Password cannot be empty"
        })
});
