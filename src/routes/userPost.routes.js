import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import getMulterMiddleware from "../middlewares/multer.middleware.js";
import { createPost, uploadMedia } from "../controllers/userPost.controllers.js";
import { validateAndSanitizePost } from "../middlewares/validation.middleware.js";

const router = new Router();

// create user post
const uploadPostMediaOptions = {
    allowedTypes: [
        "image/jpeg",
        "image/png",
        "image/gif",
        "video/mp4",
        "application/pdf",
    ],
    fileSizeLimit: 50 * 1024 * 1024, // 50 MB
    maxCount: 5,
    fields: [{ name: "media", maxCount: 5 }],
};

router.route("/create").post(verifyJWT, validateAndSanitizePost, createPost);
router.route("/upload-media").post(verifyJWT,getMulterMiddleware(uploadPostMediaOptions), uploadMedia);

export default router;
