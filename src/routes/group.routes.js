import express from "express";
import { isAdmin, verifyJWT } from "../middlewares/auth.middleware.js";
import { approveMembership, createGroup, getAllGroups, getGroup, getGroupAdmins, getGroupMembers, joinGroup, leaveGroup, makeAdmin, rejectMembership, removeAdmin, updateGroupDetails, uploadAvatarImg, uploadCoverImg } from "../controllers/group.controllers.js";
import getMulterMiddleware from "../middlewares/multer.middleware.js";

const router = express.Router();

// Group admin and Platform Admin routes
router.route("/create").post(verifyJWT, isAdmin, createGroup);

const avatarOptions = {
    allowedTypes: ["image/jpeg", "image/png", "image/jpg"],
    fileSizeLimit: 10 * 1024 * 1024, // 10 MB
    singleName: "avatar"
}
router.route("/:groupId/avatar").patch(verifyJWT, getMulterMiddleware(avatarOptions), uploadAvatarImg);

const coverImgOptions = {
    allowedTypes: ["image/jpeg", "image/png", "image/jpg"],
    fileSizeLimit: 10 * 1024 * 1024, // 10 MB
    singleName: "cover"
}
router.route("/:groupId/cover").patch(verifyJWT, getMulterMiddleware(coverImgOptions), uploadCoverImg);

// Group update and member management routes
router.route("/:groupId/update").patch(verifyJWT, updateGroupDetails);
router.route("/:groupId/approve/:userId").patch(verifyJWT, approveMembership);
router.route("/:groupId/reject/:userId").delete(verifyJWT, rejectMembership);

// Group admin management routes
router.route("/:groupId/make-admin/:memberId").patch(verifyJWT, makeAdmin);
router.route("/:groupId/remove-admin/:memberId").patch(verifyJWT, removeAdmin);

// Group member routes
router.route("/:groupId/join").post(verifyJWT, joinGroup);
router.route("/:groupId/leave").delete(verifyJWT, leaveGroup);

// Group information routes
router.route("/:groupId").get(verifyJWT, getGroup);
router.route("/:groupId/members").get(verifyJWT, getGroupMembers);
router.route("/:groupId/admins").get(verifyJWT, getGroupAdmins);

// Get all groups
router.route("/groups", getAllGroups);

// Get all user joined groups

export default router;
