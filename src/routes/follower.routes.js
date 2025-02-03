import express from "express";
import {
    toggleFollow,
    getUserFollowers,
    getUserFollowings,
    followStatus,
    removeFollower,
} from "../controllers/follower.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Route to toggle follow/unfollow
router.route("/follow/:targetUserId").post(verifyJWT, toggleFollow);

// Route to remove a follower
router.route("/follower/:targetUserId/remove").delete(verifyJWT, removeFollower);

// Route to get followers of a user
router.route("/:userId").get(verifyJWT, getUserFollowers);

// Route to get followings of a user
router.route("/followings/:userId").get(verifyJWT, getUserFollowings);

// Route to check follow status
router.route("/follow/status/:targetUserId").get(verifyJWT, followStatus);

export default router;
