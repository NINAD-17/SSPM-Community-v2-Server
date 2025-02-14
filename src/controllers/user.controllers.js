import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import {
    uploadOnCloudinary,
    deleteFromCloudinary,
} from "../utils/cloudinary.js";

const getUserProfile = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    try {
        const profile = await User.findById(userId);

        if (!profile) {
            throw new ApiError(404, "User not found");
        }

        return res.status(200).json(
            new ApiResponse(
                200,
                { profile }, // data.profile
                "User profile retrieved successfully"
            )
        );
    } catch (error) {
        throw new ApiError(500, "Failed to get user profile.");
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
                runValidators: true, // by default mongoose will doesn't run validators for update - therefore added explicitly
            }
        ).select("-password -refreshToken");

        if (!user) {
            throw new ApiError(404, "User not found");
        }

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    { profile: user },
                    "Profile updated successfully"
                )
            );
    } catch (error) {
        throw new ApiError(500, "Error updating profile");
    }
});

const updateAvatar = asyncHandler(async (req, res) => {
    try {
        const userId = req.user?._id;
        const avatarLocalPath = req.file?.path;

        if (!avatarLocalPath) {
            throw new ApiError(400, "No avatar image uploaded");
        }

        // Get the user's current avatar public_id
        const user = await User.findById(userId);
        const oldAvatarUrl = user?.avatar;

        // Upload new avatar to avatars folder
        const avatar = await uploadOnCloudinary(avatarLocalPath, "avatars");
        if (!avatar) {
            throw new ApiError(400, "Error uploading avatar");
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

        console.log("avatar updated successfully");

        // Delete old avatar from cloudinary if it exists
        if (oldAvatarUrl) {
            // Extract public ID from URL
            const publicId = oldAvatarUrl
                .split("/")
                .slice(-2)
                .join("/")
                .split(".")[0];
            await deleteFromCloudinary(publicId, oldAvatarUrl);
        }

        console.log("Old avatar deleted successfully if any");

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    { profile: updatedUser },
                    "Avatar updated successfully"
                )
            );
    } catch (error) {
        throw new ApiError(500, "Error updating avatar");
    }
});

export { getUserProfile, updateProfile, updateAvatar };
