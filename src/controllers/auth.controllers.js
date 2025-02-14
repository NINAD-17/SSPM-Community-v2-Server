import { User } from "../models/user.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
    generateOTP,
    hasOTPSent,
    storeOTP,
    verifyOTP,
} from "../utils/otpUtils.js";
import { sendOTPEmail } from "../services/emailService.js";
import { generateAccessAndRefreshTokens } from "../utils/tokenUtils.js";
import jwt from "jsonwebtoken";

const generateOTPToken = (email) => {
    return jwt.sign({ email, verified: true }, process.env.OTP_TOKEN_SECRET, {
        expiresIn: process.env.OTP_TOKEN_EXPIRY,
    });
};

const decodeOTPToken = (token) => {
    return jwt.verify(token, process.env.OTP_TOKEN_SECRET);
};

// ----- Registration
// Step 1: Initiate Registration
const initiateRegistration = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
        throw new ApiError(400, "Email is required");
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        throw new ApiError(400, "Email already registered");
    }

    // Generate and store OTP
    const otp = generateOTP();
    storeOTP(email, otp);

    // Send OTP email
    const emailSent = await sendOTPEmail(email, otp);
    if (!emailSent) {
        throw new ApiError(500, "Failed to send OTP email");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { email, otpSent: true },
                "OTP sent successfully"
            )
        );
});

// Step 2: Verify Registration OTP
const verifyRegistrationOTP = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;

    // has the OTP sent to this email?
    const otpSent = hasOTPSent(email);
    if (!otpSent) {
        throw new ApiError(400, "OTP has not been sent to this email");
    }

    const isValid = verifyOTP(email, otp);
    if (!isValid) {
        throw new ApiError(400, "Invalid or expired OTP");
    }

    // Store verified email in session or token
    const otpVerificationToken = generateOTPToken(email);

    const options = {
        httpOnly: true,
        secure: true,
    };

    res.status(200)
        .cookie("otpVerificationToken", otpVerificationToken, options)
        .json(new ApiResponse(200, "Email verified successfully"));
});

// Step 3: Complete Registration
const completeRegistration = asyncHandler(async (req, res) => {
    const otpVerificationToken = req.cookies?.otpVerificationToken;

    if (!otpVerificationToken) {
        throw new ApiError(401, "Email is not verified");
    }

    const {
        password,
        firstName,
        lastName,
        role = "student",
        branch,
        graduationYear,
    } = req.body;

    // Verify the token
    const decoded = decodeOTPToken(otpVerificationToken);

    if (!decoded) {
        throw new ApiError(401, "Invalid verification token");
    }

    if (!decoded.verified || !decoded.email) {
        throw new ApiError(400, "Email not verified");
    }

    const user = await User.create({
        email: decoded.email,
        password,
        firstName,
        lastName,
        role,
        branch,
        graduationYear,
    });

    if (!user) {
        throw new ApiError(500, "Failed to register user");
    }

    // Generate access and refresh tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
        user._id
    );

    const options = {
        httpOnly: true,
        secure: true,
    };

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    return res
        .status(201)
        .clearCookie("otpVerificationToken", options)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                201,
                { user: createdUser },
                "User registered successfully"
            )
        );
});

// ----- Login
// Login with OTP verification
const initiateLogin = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid credentials");
    }

    // Generate and send OTP
    const otp = generateOTP();
    storeOTP(email, otp);

    const emailSent = await sendOTPEmail(email, otp);
    if (!emailSent) {
        throw new ApiError(500, "Failed to send OTP email");
    }

    res.status(200).json(
        new ApiResponse(200, { email }, "Login OTP sent successfully")
    );
});

const verifyLoginOTP = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;

    // has the OTP sent to this email?
    const otpSent = hasOTPSent(email);
    if (!otpSent) {
        throw new ApiError(400, "OTP has not been sent to this email");
    }

    const isValid = verifyOTP(email, otp);
    if (!isValid) {
        throw new ApiError(400, "Invalid or expired OTP");
    }

    const user = await User.findOne({ email });
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
        user._id
    );

    const options = {
        httpOnly: true,
        secure: true,
    };

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                { user: loggedInUser },
                "Logged in successfully"
            )
        );
});

// ----- Logout
const userLogout = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user._id, {
        $set: {
            refreshToken: undefined,
        },
        new: true,
    });

    const options = {
        httpOnly: true,
        secure: true,
    };

    res.status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out successfully!"));
});

// ----- Refresh Access Token
const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "No refresh token found");
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );

        const user = await User.findById(decodedToken._id);
        if (!user) {
            throw new ApiError(401, "Invalid refresh token");
        }

        // Check if the incoming refresh token matches the stored one
        if (
            !user.refreshToken ||
            incomingRefreshToken.toString() !== user.refreshToken
        ) {
            throw new ApiError(401, "Refresh token is expired or used");
        }

        const { accessToken, refreshToken } =
            await generateAccessAndRefreshTokens(user._id);

        const options = {
            httpOnly: true,
            secure: true,
        };

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { refreshed: true },
                    "Access token refreshed"
                )
            );
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token");
    }
});

// ----- Get User by validating token on first load of application in client side
const getUserOnLoad = asyncHandler(async (req, res) => {
    try {
        const user = req.user;
        res.status(200).json(
            new ApiResponse(200, { user }, "User fetched successfully!")
        );
    } catch (error) {
        throw new ApiError(500, "Something went wrong while fetching user!");
    }
});

// ----- Forgot password
const initiateForgotPasswordRequest = asyncHandler(async (req, res) => {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // Generate and store OTP
    const otp = generateOTP();
    storeOTP(email, otp);

    // Send OTP email
    const emailSent = await sendOTPEmail(email, otp);

    if (!emailSent) {
        throw new ApiError(500, "Failed to send OTP email");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, { email }, "OTP sent successfully"));
});

const verifyForgotPasswordRequest = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;

    // has the OTP sent to this email?
    const otpSent = hasOTPSent(email);
    if (!otpSent) {
        throw new ApiError(400, "OTP has not been sent to this email");
    }

    const isValid = verifyOTP(email, otp);
    if (!isValid) {
        throw new ApiError(400, "Invalid or expired OTP");
    }

    // Store verified email in session or token
    const otpVerificationToken = generateOTPToken(email);
    const options = {
        httpOnly: true,
        secure: true,
    };

    res.status(200)
        .cookie("otpVerificationToken", otpVerificationToken, options)
        .json(new ApiResponse(200, "Email verified successfully"));
});

const completeForgotPassword = asyncHandler(async (req, res) => {
    const { newPassword } = req.body;
    const otpVerificationToken = req.cookies?.otpVerificationToken;

    if (!otpVerificationToken) {
        throw new ApiError(401, "Email is not verified");
    }

    // Verify the token
    const decoded = decodeOTPToken(otpVerificationToken);
    if (!decoded) {
        throw new ApiError(401, "Invalid verification token");
    }

    if (!decoded.verified || !decoded.email) {
        throw new ApiError(400, "Email not verified");
    }

    const user = await User.findOne({ email: decoded.email });
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // Update password and clear refresh token
    user.password = newPassword; // This will trigger the pre-save hook to hash the password
    user.refreshToken = undefined;
    await user.save();

    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .clearCookie("otpVerificationToken", options)
        .json(
            new ApiResponse(
                200,
                {},
                "Password reset successfully. You can now log in with your new password."
            )
        );
});

// ----- Set new password (for logged in user)
const setNewPassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
        throw new ApiError(401, "Current password is incorrect");
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Generate new tokens
    const { accessToken, refreshToken } =
        await generateAccessAndRefreshTokens(userId);

    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(200, {}, "Password updated successfully"));
});

export {
    initiateRegistration,
    verifyRegistrationOTP,
    completeRegistration,
    initiateLogin,
    verifyLoginOTP,
    userLogout,
    refreshAccessToken,
    getUserOnLoad,
    initiateForgotPasswordRequest,
    verifyForgotPasswordRequest,
    completeForgotPassword,
    setNewPassword,
};
