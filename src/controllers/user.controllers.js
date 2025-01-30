import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(
            500,
            "Something went wrong while generating tokens."
        );
    }
};

const registerUser = asyncHandler(async (req, res) => {
    const {
        email,
        password,
        firstName,
        lastName,
        role = "student",
        branch,
        graduationYear,
    } = req.body;

    // check if user already exists
    const existedUser = await User.findOne({ email });

    if (existedUser) {
        throw new ApiError(400, "Email already exists!");
    }

    const user = await User.create({
        email,
        password,
        firstName,
        lastName,
        role,
        branch,
        graduationYear,
    });

    if (!user) {
        throw new ApiError(
            500,
            "Something went wrong while registering the user"
        );
    }

    // generate access and refresh tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
        user._id
    );

    const options = {
        httpOnly: true,
        secure: true,
    };

    const createdUser = {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        branch: user.branch,
        graduationYear: user.graduationYear,
    };

    return res
        .status(201)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                201,
                { user: createdUser },
                "User registered successfully!"
            )
        );
});

const userLogin = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
        throw new ApiError(404, "User not found!");
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
        throw new ApiError(401, "Invalid credentials!");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
        user._id
    );

    const options = {
        httpOnly: true,
        secure: true,
    };

    const updatedUser = {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        branch: user.branch,
        graduationYear: user.graduationYear,
    };

    return res
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                { user: updatedUser, accessToken, refreshToken },
                "User logged in successfully!"
            )
        );
});

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

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "No valid refresh token found!");
    }

    try {
        const decodeToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );
        const user = await User.findById(decodeToken._id);

        if (!user) {
            throw new ApiError(401, "Invalid refresh token!");
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used!");
        }

        const options = {
            httpOnly: true,
            secure: true,
        };

        const { accessToken, refreshToken } =
            await generateAccessAndRefreshTokens(user._id);

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    {
                        accessToken,
                        refreshToken,
                    },
                    "Access token refreshed!"
                )
            );
    } catch (error) {
        throw new ApiError(
            500,
            "Something went wrong while refreshing the access token!"
        );
    }
});

const getUser = asyncHandler(async (req, res) => {
    try {
        const user = req.user;
        res.status(200).json(
            new ApiResponse(200, { user }, "User fetched successfully!")
        )
    } catch (error) {
        throw new ApiError(500, "Something went wrong while fetching user!");
    }
});

const updateProfile = asyncHandler(async (req, res) => {
    try {
        const updates = req.body;
        
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: updates },
            { 
                new: true,
                runValidators: true
            }
        ).select("-password -refreshToken");

        if (!user) {
            throw new ApiError(404, "User not found");
        }
        console.log("profile updated successfully");
        return res.status(200).json(
            new ApiResponse(200, { user }, "Profile updated successfully")
        );
    } catch (error) {
        throw new ApiError(500, "Error updating profile");
    }
});

const updateAvatar = asyncHandler(async (req, res) => {
    try {
        const avatarLocalPath = req.file?.path;

        if (!avatarLocalPath) {
            throw new ApiError(400, "No avatar image uploaded!");
        }

        // Get the user's current avatar public_id
        const user = await User.findById(req.user?._id);
        const oldAvatarUrl = user?.avatar;

        // Upload new avatar to avatars folder
        const avatar = await uploadOnCloudinary(avatarLocalPath, 'avatars');

        if (!avatar) {
            throw new ApiError(400, "Error while uploading avatar!");
        }

        // Update user with new avatar
        const updatedUser = await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set: {
                    avatar: avatar.url,
                },
            },
            { new: true }
        ).select("-password -refreshToken");

        // Delete old avatar from cloudinary if it exists
        if (oldAvatarUrl) {
            // Extract public ID from URL
            const publicId = oldAvatarUrl.split('/').slice(-2).join('/').split('.')[0];
            await deleteFromCloudinary(publicId, oldAvatarUrl);
        }

        console.log("avatar updated successfully");
        return res.status(200).json(
            new ApiResponse(200, { user: updatedUser }, "Avatar updated successfully!")
        );
    } catch (error) {
        console.error("Avatar update error:", error);
        throw new ApiError(500, "Error updating avatar");
    }
});

export {
    registerUser,
    userLogin,
    userLogout,
    refreshAccessToken,
    getUser,
    updateProfile,
    updateAvatar,
};
