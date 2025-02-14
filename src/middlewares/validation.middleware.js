import { ApiError } from "../utils/apiError.js";
import xss from "xss";
import sanitizeHtml from "sanitize-html";

// Recursively sanitize input so that objects and arrays can be sanitized
const sanitizeInput = (input) => {
    if (typeof input === "object" && input !== null) {
        Object.keys(input).forEach((key) => {
            input[key] = sanitizeInput(input[key]);
        });
        return input;
    }
    return xss(String(input));
};

// For non-formatted texual data
export const validateAndSanitizeInput = (schema) => {
    return (req, res, next) => {
        try {
            // Sanitize input for xss
            req.body = sanitizeInput(req.body);

            // Validate input by joi validate comes from the schema that we've defined in validators/
            const { error } = schema.validate(req.body, {
                abortEarly: false,
                allowUnknown: true,
                stripUnknown: false,
            });

            if (error) {
                const validationErrors = error.details.map((detail) => ({
                    field: detail.path[0],
                    message: detail.message,
                }));

                throw new ApiError(
                    400,
                    "Validation failed",
                    null,
                    validationErrors
                );
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

// For formatted data such as text with html tags by quill editor
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
