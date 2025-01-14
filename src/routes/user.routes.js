import { Router } from "express";
import { registerUser, updateAvatar, updateProfile, userLogin } from "../controllers/user.controllers.js";
import { validateAndSanitizeInput } from "../middlewares/validation.middleware.js";
import { updateUserSchema, registerUserSchema } from "../validators/user.validators.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// User Authentication
router.route("/register").post(validateAndSanitizeInput(registerUserSchema), registerUser);
router.route("/login").post(userLogin);

// Profile Updates
router.route("/user-profile").patch(verifyJWT, validateAndSanitizeInput(updateUserSchema), updateProfile);
router.route("/update-avatar").patch(verifyJWT, updateAvatar);


export default router;