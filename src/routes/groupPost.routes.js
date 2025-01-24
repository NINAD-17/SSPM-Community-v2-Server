import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import getMulterMiddleware from "../middlewares/multer.middleware.js";
import {
    createPostWithMedia,
    deleteGroupPost,
    getGroupPost,
    getGroupPosts,
    updateGroupPost,
} from "../controllers/groupPost.controllers.js";

const router = new Router();

// create, update, delete group post
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

router
    .route("/:groupId/create")
    .post(
        verifyJWT,
        getMulterMiddleware(uploadPostMediaOptions),
        createPostWithMedia
    );
router.route("/:groupId/:postId/update").patch(verifyJWT, updateGroupPost);
router.route("/:groupId/:postId/delete").delete(verifyJWT, deleteGroupPost);

// Get group post with postId
router.route("/:groupId/:postId/").get(verifyJWT, getGroupPost);

// Get all posts of a group
router.route("/:groupId/posts").get(verifyJWT, getGroupPosts);

export default router;
