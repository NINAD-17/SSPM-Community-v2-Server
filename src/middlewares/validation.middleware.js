import { ApiError } from "../utils/apiError";
import { updateUserSchema } from "../validators/user.validators.jsf";
import xss from "xss";

export const validateAndSanitizeInput = (req, res, next) => {
    // Sanitize input
    const sanitizedBody = {};
    Object.keys(req.body).forEach((key) => {
        sanitizedBody[key] = xss(req.body[key]);
    });
    req.body = sanitizedBody;

    // Validate input
    const { error } = updateUserSchema.validate(req.body, {
        abortEarly: false,
        allowUnknown: true,
    });

    if (error) {
        const validationErrors = error.details.map((detail) => ({
            message: detail.message,
            path: detail.path,
        }));

        throw new ApiError(400, "Invalid input", validationErrors);
        // return res.status(400).json({ errors: validationErrors });
    }

    next();
};
