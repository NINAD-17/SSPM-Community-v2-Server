import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import {
    uploadOnCloudinary,
    deleteFromCloudinary,
} from "../utils/cloudinary.js";
import mongoose from "mongoose";

const getUserProfile = asyncHandler(async (req, res, next) => {
    const { userId } = req.params;
    const loggedInUserId = req.user?._id;

    try {
        const profile = await User.aggregate([
            // Match the requested user
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(userId)
                }
            },

            // Add follow status
            {
                $lookup: {
                    from: "followers",
                    let: { profileId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$follower", new mongoose.Types.ObjectId(loggedInUserId)] },
                                        { $eq: ["$following", "$$profileId"] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: "followStatus"
                }
            },

            // Add connection status
            {
                $lookup: {
                    from: "connections",
                    let: { profileId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $or: [
                                        // Check if logged in user sent request
                                        {
                                            $and: [
                                                { $eq: ["$requester", new mongoose.Types.ObjectId(loggedInUserId)] },
                                                { $eq: ["$recipient", "$$profileId"] }
                                            ]
                                        },
                                        // Check if profile user sent request
                                        {
                                            $and: [
                                                { $eq: ["$requester", "$$profileId"] },
                                                { $eq: ["$recipient", new mongoose.Types.ObjectId(loggedInUserId)] }
                                            ]
                                        }
                                    ]
                                }
                            }
                        }
                    ],
                    as: "connectionStatus"
                }
            },

            // Project final fields based on user.model.js
            {
                $project: {
                    _id: 1,
                    email: 1,
                    firstName: 1,
                    lastName: 1,
                    avatar: 1,
                    headline: 1,
                    about: 1,
                    socialHandles: 1,
                    role: 1,
                    isAlumni: 1,
                    enrollmentYear: 1,
                    graduationYear: 1,
                    branch: 1,
                    currentlyWorkingAt: 1,
                    skills: 1,
                    isFollowing: {
                        $cond: {
                            if: { $gt: [{ $size: "$followStatus" }, 0] },
                            then: true,
                            else: false
                        }
                    },
                    connectionStatus: {
                        $cond: {
                            if: { $gt: [{ $size: "$connectionStatus" }, 0] },
                            then: {
                                $let: {
                                    vars: {
                                        connection: { $arrayElemAt: ["$connectionStatus", 0] }
                                    },
                                    in: {
                                        status: "$$connection.status",
                                        // Add who initiated the connection
                                        initiatedByMe: { 
                                            $eq: ["$$connection.requester", new mongoose.Types.ObjectId(loggedInUserId)]
                                        },
                                        connectionId: "$$connection._id"
                                    }
                                }
                            },
                            else: null
                        }
                    }
                }
            }
        ]);

        if (!profile.length) {
            throw new ApiError(404, "User not found");
        }

        return res.status(200).json(
            new ApiResponse(
                200,
                { profile: profile[0] },
                "User profile retrieved successfully"
            )
        );
    } catch (error) {
        if(error instanceof ApiError) {
            next(error);
        } else {
            next(new ApiError(500, "Failed to get user profile"));
        }
    }
});

const updateProfile = asyncHandler(async (req, res, next) => {
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
        if(error instanceof ApiError) {
            next(error);
        } else {
            next(new ApiError(500, "Error updating profile"));
        }
    }
});

const updateAvatar = asyncHandler(async (req, res, next) => {
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
        if(error instanceof ApiError) {
            next(error);
        } else {
            next(new ApiError(500, "Error updating avatar"));
        }
    }
});

export { getUserProfile, updateProfile, updateAvatar };
