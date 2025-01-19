import { Router } from "express";
import { registerUser, updateAvatar, updateProfile, userLogin } from "../controllers/user.controllers.js";
import { validateAndSanitizeInput } from "../middlewares/validation.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import getMulterMiddleware from "../middlewares/multer.middleware.js";

const router = Router();

// User Authentication
router.route("/register").post(validateAndSanitizeInput, registerUser);
router.route("/login").post(userLogin);

// Profile Updates
router.route("/user-profile").patch(verifyJWT, validateAndSanitizeInput, updateProfile);

// Multer middleware for avatar upload
const avatarMulterOptions = { singleName: "avatar" };
const avatarUpload = getMulterMiddleware(avatarMulterOptions);
router.route("/update-avatar").patch(verifyJWT, avatarUpload, updateAvatar);


export default router;