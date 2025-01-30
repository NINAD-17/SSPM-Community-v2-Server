import { ApiError } from "../utils/apiError.js";
import xss from "xss";
import sanitizeHtml from "sanitize-html";

export const validateAndSanitizeInput = (schema) => {
    return (req, res, next) => {
        try {
            // Sanitize input
            const sanitizedBody = {};
            Object.keys(req.body).forEach((key) => {
                if (typeof req.body[key] === 'object') {
                    sanitizedBody[key] = req.body[key]; // Don't sanitize objects/arrays
                } else {
                    sanitizedBody[key] = xss(String(req.body[key]));
                }
            });
            req.body = sanitizedBody;

            // Validate input
            const { error } = schema.validate(req.body, {
                abortEarly: false,
                allowUnknown: true,
                stripUnknown: false
            });

            if (error) {
                const validationErrors = error.details.map((detail) => ({
                    field: detail.path[0],
                    message: detail.message
                }));

                throw new ApiError(400, "Validation failed", validationErrors);
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

// export const validateAndSanitizePost = (req, res, next) => {
//     const sanitizedBody = { ...req.body };

//     if (sanitizedBody.content) {
//         sanitizedBody.content = sanitizeHtml(sanitizedBody.content, {
//             allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img"]),
//             allowedAttributes: {
//                 "*": ["style", "class"],
//                 a: ["href", "name", "target"],
//                 img: ["src"],
//             },
//         });
//     } 

//     const schema = req.method === "POST" ? createUserPostSchema : updateUserPostSchema;
    
//     // Validate input
//     const { error } = schema.validate(sanitizedBody, {
//         abortEarly: false,
//         allowUnknown: true,
//     });

//     if (error) {
//         const validationErrors = error.details.map((detail) => ({
//             message: detail.message,
//             path: detail.path,
//         }));
//         throw new ApiError(400, "Invalid input", validationErrors);
//     }

//     req.body = sanitizedBody;
//     next();
// };