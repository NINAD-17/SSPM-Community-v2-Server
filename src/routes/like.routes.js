import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    getLikedPosts,
    getWhoLikedOnPost,
    togglePostLike,
} from "../controllers/like.controllers.js";

const router = express.Router();

router.route("/toggle/p/:postId").post(verifyJWT, togglePostLike);
router.route("/post/:postId").get(verifyJWT, getWhoLikedOnPost);
router.route("/posts").get(verifyJWT, getLikedPosts);

export default router;
