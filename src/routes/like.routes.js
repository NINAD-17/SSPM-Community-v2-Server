import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { getLikedPosts, togglePostLike } from "../controllers/like.controllers.js";

const router = express.Router();

router.route("/toggle/p/:postId").post(verifyJWT, togglePostLike);
router.route("/posts").get(verifyJWT, getLikedPosts);

export default router;