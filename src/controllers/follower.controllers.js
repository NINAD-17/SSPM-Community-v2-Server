import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Follower } from "../models/follower.model.js";
import { User } from "../models/user.model.js";
import mongoose, { trusted } from "mongoose";

const toggleFollow = asyncHandler(async (req, res, next) => {
    const { targetUserId } = req.params;
    const userId = req.user._id;
    console.log({targetUserId})

    if (targetUserId.toString() === userId.toString()) {
        throw new ApiError(400, "Cannot follow yourself.");
    }

    try {
        // check if the target user with targetUserId is exist or not
        const targetUser = await User.findById(targetUserId);
        if (!targetUser) {
            console.log("hit: ", targetUser);
            throw new ApiError(404, "User not found.");
        }

        // toggle following
        const followerDocument = await Follower.findOne({
            follower: userId,
            following: targetUserId,
        });

        if (!followerDocument) {
            const follow = await Follower.create({
                follower: userId,
                following: targetUserId,
            });

            if (!follow) {
                throw new ApiError(500, "Failed to follow user.");
            }
        } else {
            const unFollow = await Follower.findByIdAndDelete(
                followerDocument._id
            );

            if (!unFollow) {
                throw new ApiError(500, "Failed to unfollow user.");
            }
        }

        let responseDocument;
        if(followerDocument) {
            // successfully unfollowed
            responseDocument = {
                userId: targetUserId,
                isFollowing: false
            }
        } else {
            responseDocument = {
                userId: targetUserId,
                user: {
                    firstName: targetUser.firstName,
                    lastName: targetUser.lastName,
                    email: targetUser.email,
                    avatar: targetUser.avatar,
                    _id: targetUser._id
                },
                isFollowing: true
            }
        }

        res.status(200).json(
            new ApiResponse(
                200,
                responseDocument,
                followerDocument
                    ? "User unfollowed successfully!"
                    : "User followed successfully!"
            )
        );
    } catch (error) {
        if (error instanceof ApiError) {
            next(error);
        } else {
            next(new ApiError(500, "Failed to toggle follower."));
        }
    }
});

const removeFollower = asyncHandler(async (req, res, next) => {
    const { targetUserId } = req.params;
    const userId = req.user._id;
    console.log({targetUserId})

    if (targetUserId.toString() === userId.toString()) {
        throw new ApiError(400, "Cannot remove yourself as a follower");
    }

    try {
        const targetUser = await User.findById(targetUserId);
        if (!targetUser) {
            throw new ApiError(404, "User not found.");
        }

        const followerDocument = await Follower.findOneAndDelete({
            follower: new mongoose.Types.ObjectId(targetUserId),
            following: new mongoose.Types.ObjectId(userId),
        });

        if (!followerDocument) {
            throw new ApiError(404, "Target user isn't following you");
        }

        res.status(200).json(
            new ApiResponse(
                200,
                { followerId: targetUserId },
                "Follower removed successfully!"
            )
        );
    } catch (error) {
        console.log(error);
        if (error instanceof ApiError) {
            next(error);
        } else {
            next(new ApiError(500, "Failed to remove a follower"));
        }
    }
});

const getUserFollowers = asyncHandler(async (req, res, next) => {
    const { userId } = req.params;

    let user;
    if (userId.toString() !== req.user._id.toString()) {
        user = await User.findById(userId);
        if (!user) {
            throw new ApiError(404, "User not found.");
        }
    } else {
        user = req.user;
    }

    try {
        const followers = await Follower.aggregate([
            {
                $match: {
                    following: new mongoose.Types.ObjectId(user._id),
                },
            },
            {
                $lookup: {
                    from: "users",
                    localField: "follower",
                    foreignField: "_id",
                    as: "follower",
                },
            },
            {
                $unwind: "$follower",
            },
            {
                $project: {
                    _id: 1,
                    firstName: "$follower.firstName",
                    lastName: "$follower.lastName",
                    email: "$follower.email",
                    avatar: "$follower.avatar",
                },
            },
        ]);

        if (followers.length === 0) {
            res.status(200).json(
                new ApiResponse(200, [], "No followers found.")
            );
        }

        res.status(200).json(
            new ApiResponse(
                200,
                { followers },
                "User followers fetched successfully."
            )
        );
    } catch (error) {
        if (error instanceof ApiError) {
            next(error);
        } else {
            next(new ApiError(500, "Failed to get user followers."));
        }
    }
});

const getUserFollowings = asyncHandler(async (req, res, next) => {
    const { userId } = req.params;

    let user;
    if (userId.toString() !== req.user._id.toString()) {
        user = await User.findById(userId);
        if (!user) {
            throw new ApiError(404, "User not found.");
        }
    } else {
        user = req.user;
    }

    try {
        const followings = await Follower.aggregate([
            {
                $match: {
                    follower: new mongoose.Types.ObjectId(user._id),
                },
            },
            {
                $lookup: {
                    from: "users",
                    localField: "following",
                    foreignField: "_id",
                    as: "following",
                },
            },
            {
                $unwind: "$following",
            },
            {
                $project: {
                    _id: 1,
                    firstName: "$following.firstName",
                    lastName: "$following.lastName",
                    email: "$following.email",
                    avatar: "$following.avatar",
                },
            },
        ]);

        if (!followings.length) {
            res.status(200).json(
                new ApiResponse(200, [], "No followings found.")
            );
        }

        res.status(200).json(
            new ApiResponse(
                200,
                { followings },
                "User followings fetched successfully."
            )
        );
    } catch (error) {
        if (error instanceof ApiError) {
            next(error);
        } else {
            next(new ApiError(500, "Failed to get user followers"));
        }
    }
});

const followStatus = asyncHandler(async (req, res, next) => {
    const { targetUserId } = req.params;
    const userId = req.user._id;

    if (targetUserId.toString() === userId.toString()) {
        throw new ApiError(400, "Cannot check follow status with yourself.");
    }

    try {
        const followerDocument = await Follower.findOne({
            follower: userId,
            following: targetUserId,
        });

        if (followerDocument) {
            res.status(200).json(
                new ApiResponse(200, { followStatus: true }, "Following")
            );
        } else {
            res.status(200).json(
                new ApiResponse(200, { followStatus: false }, "Not following")
            );
        }
    } catch (error) {
        if (error instanceof ApiError) {
            next(error);
        } else {
            next(new ApiError(500, "Failed to check follow status."));
        }
    }
});

export {
    toggleFollow,
    removeFollower,
    getUserFollowers,
    getUserFollowings,
    followStatus,
};
