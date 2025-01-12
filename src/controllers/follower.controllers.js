import ApiError from "../utils/apiError";
import ApiResponse from "../utils/apiResponse";
import asyncHandler from "../utils/asyncHandler";
import { Follower } from "../models/Follower";
import { User } from "../models/user.model";
import mongoose from "mongoose";

const toogleFollow = asyncHandler(async(req, res) => {
    const { targetUserId } = req.params;
    const userId = req.user._id;

    if(targetUserId.toString() === userId.toString()) {
        throw new ApiError(400, "Cannot follow yourself.");
    }

    try {
        // check if the target user with targetUserId is exist or not
        const targetUser = await User.findById(targetUserId);
        if (!targetUser) {
            throw new ApiError(404, "User not found.");
        }

        // toggle following
        const followerDocument = await Follower.findOne({
            follower: userId,
            following: targetUserId
        })

        if(!followerDocument) {
            const follow = await Follower.create({
                follower: userId,
                following: targetUserId
            });

            if(!follow) {
                throw new ApiError(500, "Failed to follow user.");
            }
        } else {
            const unFollow = await Follower.findByIdAndDelete(followerDocument._id);

            if(!unFollow) {
                throw new ApiError(500, "Failed to unfollow user.");
            }
        }

        res.status(200).json(
            new ApiResponse(
                200,
                { message: followerDocument? "Unfollowed" : "Followed" },
                followerDocument? "User unfollowed successfully!" : "User followed successfully!"
            )
        )
    } catch(error) {
        throw new ApiError(500, "Failed to toggle follower.");
    }
});

const getUserFollowers = asyncHandler(async(req, res) => {
    const { userId } = req.params;

    let user;
    if(userId.toString() !== req.user._id.toString()) {
        user = await User.findById(userId);
        if(!user) {
            throw new ApiError(404, "User not found.");
        } 
    } else {
        user = req.user;
    }

    try {
        const followers = await User.aggregate([
            {
                $match: {
                    following: new mongoose.Types.ObjectId(user._id)
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "follower",
                    foreignField: "_id",
                    as: "follower"
                }
            },
            {
                $unwind: "$follower"
            },
            {
                $project: {
                    _id: 1,
                    "firstName": "$follower.firstName",
                    "lastName": "$follower.lastName",
                    "email": "$follower.email",
                    "avatar": "$follower.avatar",
                }
            }
        ]);

        if(!followers.length) {
            res.status(200).json(
                new ApiResponse(200, [], "No followers found.")
            )
        }

        res.status(200).json(
            new ApiResponse(200, followers, "User followers fetched successfully.")
        )
    } catch(error) {
        throw new ApiError(500, "Failed to get user followers.");
    } 
});

const getUserFollowings = asyncHandler(async(req, res) => {
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
        const followings = await User.aggregate([
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
                followings,
                "User followers fetched successfully."
            )
        );
    } catch (error) {
        throw new ApiError(500, "Failed to get user followers.");
    }
});

const followStatus = asyncHandler(async(req, res) => {
    const { targetUserId } = req.params;
    const userId = req.user._id;

    if (targetUserId.toString() === userId.toString()) {
        throw new ApiError(400, "Cannot check follow status with yourself.");
    }

    try {
        const followerDocument = await Follower.findOne({
            follower: userId,
            following: targetUserId
        });

        if(followerDocument) {
            res.status(200).json(
                new ApiResponse(200, { followStatus: true }, "Following")
            )
        } else {
            res.status(200).json(
                new ApiResponse(200, { followStatus: false }, "Not following")
            )
        }
    } catch(error) {
        throw new ApiError(500, "Failed to check follow status.");
    }
})

export { toogleFollow, getUserFollowers, getUserFollowings, followStatus };