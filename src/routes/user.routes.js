import { Router } from "express";
import {
    getUser,
    refreshAccessToken,
    registerUser,
    updateAvatar,
    updateProfile,
    userLogin,
    userLogout,
} from "../controllers/user.controllers.js";
import { validateAndSanitizeInput } from "../middlewares/validation.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import getMulterMiddleware from "../middlewares/multer.middleware.js";
import { registerUserSchema, loginUserSchema, updateUserSchema } from "../validators/user.validators.js";

const router = Router();

// Auth routes with specific schemas
router.route("/register").post(validateAndSanitizeInput(registerUserSchema), registerUser);
router.route("/login").post(validateAndSanitizeInput(loginUserSchema), userLogin);
router.route("/logout").post(verifyJWT, userLogout);
router.route("/refresh-access-token").post(refreshAccessToken);
router.route("/user").get(verifyJWT, getUser);

// Profile Updates
router.route("/user/user-profile")
    .patch(verifyJWT, validateAndSanitizeInput(updateUserSchema), updateProfile);

// Avatar Upload
const avatarMulterOptions = { singleName: "avatar" };
const avatarUpload = getMulterMiddleware(avatarMulterOptions);
router.route("/user/update-avatar")
    .post(verifyJWT, avatarUpload, updateAvatar);

export default router;
