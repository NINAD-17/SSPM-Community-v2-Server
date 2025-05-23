import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import getMulterMiddleware from "../middlewares/multer.middleware.js";
import {
    createPost,
    deletePost,
    getAllPosts,
    getUserPost,
    getUserPosts,
    updatePost,
    uploadMedia,
} from "../controllers/userPost.controllers.js";
// import { validateAndSanitizePost } from "../middlewares/validation.middleware.js";

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

router.route("/create").post(verifyJWT, createPost);
router
    .route("/upload-media")
    .post(verifyJWT, getMulterMiddleware(uploadPostMediaOptions), uploadMedia);
router
    .route("/:postId")
    .get(verifyJWT, getUserPost)
    .patch(verifyJWT, updatePost)
    .delete(verifyJWT, deletePost);

router.route("/user/:userId/all").get(verifyJWT, getUserPosts);
router.route("/").get(verifyJWT, getAllPosts)

export default router;
