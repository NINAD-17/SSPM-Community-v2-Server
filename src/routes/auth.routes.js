import { Router } from "express";
import {
    initiateRegistration,
    verifyRegistrationOTP,
    completeRegistration,
    initiateLogin,
    verifyLoginOTP,
    userLogout,
    refreshAccessToken,
    getUserOnLoad,
    verifyForgotPasswordRequest,
    completeForgotPassword,
    setNewPassword,
    initiateForgotPasswordRequest,
} from "../controllers/auth.controllers.js";
import { validateAndSanitizeInput } from "../middlewares/validation.middleware.js";
import {
    emailVerificationSchema,
    verifyOTPSchema,
    completeRegistrationSchema,
    loginSchema,
    passwordSchema,
    changePasswordSchema,
} from "../validators/auth.validators.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Registration flow
router
    .route("/register/initiate")
    .post(
        validateAndSanitizeInput(emailVerificationSchema),
        initiateRegistration
    );
router
    .route("/register/verify-otp")
    .post(validateAndSanitizeInput(verifyOTPSchema), verifyRegistrationOTP);
router
    .route("/register/complete")
    .post(
        validateAndSanitizeInput(completeRegistrationSchema),
        completeRegistration
    );

// Login flow
router
    .route("/login/initiate")
    .post(validateAndSanitizeInput(loginSchema), initiateLogin);
router
    .route("/login/verify-otp")
    .post(validateAndSanitizeInput(verifyOTPSchema), verifyLoginOTP);

// Logout
router.route("/logout").post(verifyJWT, userLogout);

// Refresh access token
router.route("/refresh-access-token").post(refreshAccessToken);

// Get user by token details
router.route("/user").get(verifyJWT, getUserOnLoad);

// Forget Password
router
    .route("/forgot-password/initiate")
    .post(
        validateAndSanitizeInput(emailVerificationSchema),
        initiateForgotPasswordRequest
    );
router
    .route("/forgot-password/verify-otp")
    .post(
        validateAndSanitizeInput(verifyOTPSchema),
        verifyForgotPasswordRequest
    );
router.route("/forgot-password/complete").post(validateAndSanitizeInput(passwordSchema), completeForgotPassword);

// Change Password
router.route("/change-password").post(
    verifyJWT, 
    validateAndSanitizeInput(changePasswordSchema), 
    setNewPassword
);

export default router;
