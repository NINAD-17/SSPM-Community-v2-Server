import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import getMulterMiddleware from "../middlewares/multer.middleware.js";
import {
    createPostWithMedia,
    deleteGroupPost,
    getGroupPost,
    getGroupPosts,
    updateGroupPost,
} from "../controllers/groupPost.controllers.js";

const router = express.Router();

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
    .route("/group/:groupId/create")
    .post(
        verifyJWT,
        getMulterMiddleware(uploadPostMediaOptions),
        createPostWithMedia
    );
    
router.route("/group/:groupId/post/:postId").get(verifyJWT, getGroupPost);
router.route("/group/:groupId/post/:postId/update").patch(verifyJWT, updateGroupPost);
router.route("/group/:groupId/post/:postId/delete").delete(verifyJWT, deleteGroupPost);

router
    .route("/group/:groupId/all")
    .get(verifyJWT, getGroupPosts);

export default router;
