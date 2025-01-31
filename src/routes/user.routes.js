import { Router } from "express";
import {
    updateAvatar,
    updateProfile,
} from "../controllers/user.controllers.js";
import { validateAndSanitizeInput } from "../middlewares/validation.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import getMulterMiddleware from "../middlewares/multer.middleware.js";
import { updateUserSchema } from "../validators/user.validators.js";

const router = Router();

// Profile Updates
router
    .route("/user/user-profile")
    .patch(
        verifyJWT,
        validateAndSanitizeInput(updateUserSchema),
        updateProfile
    );

// Avatar Upload
const avatarMulterOptions = { singleName: "avatar" };
const avatarUpload = getMulterMiddleware(avatarMulterOptions);
router.route("/user/update-avatar").post(verifyJWT, avatarUpload, updateAvatar);

export default router;
