import { ApiError } from "../utils/apiError";
import { updateUserSchema } from "../validators/user.validators.js";
import { createUserPostSchema, updateUserPostSchema } from "../validators/userPost.validators.js";
import xss from "xss";
import sanitizeHtml from "sanitize-html";

export const validateAndSanitizeInput = (schema) => {
    return (req, res, next) => {
        // Sanitize input
        const sanitizedBody = {};
        Object.keys(req.body).forEach((key) => {
            sanitizedBody[key] = xss(req.body[key]);
        });
        req.body = sanitizedBody;

        // Validate input
        const { error } = schema.validate(req.body, {
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