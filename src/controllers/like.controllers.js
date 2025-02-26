import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose from "mongoose";
import Like from "../models/like.model.js";

const togglePostLike = asyncHandler(async (req, res, next) => {
    const { postId } = req.params;
    const { postType = "UserPost", commentId } = req.body;
    // If commentId is included then it's a like of comment and not the like of post

    try {
        const like = await Like.findOne({
            postId,
            postType,
            commentId,
            likedBy: req.user._id,
        });

        if (like) {
            await Like.findByIdAndDelete(like._id);
            res.status(200).json(
                new ApiResponse(200, { liked: false }, "Disliked post")
            );
        } else {
            const newLike = await Like.create({
                postId,
                postType,
                commentId,
                likedBy: req.user._id,
            });

            res.status(201).json(
                new ApiResponse(
                    201,
                    { liked: true, like: newLike },
                    "Liked post"
                )
            );
        }
    } catch (error) {
        if (error instanceof ApiError) {
            next(error);
        } else {
            next(new ApiError(500, "Failed to toggle post like."));
        }
    }
});

const getWhoLikedOnPost = asyncHandler(async (req, res, next) => {
    const { postId } = req.params;
    const { postType = "UserPost" } = req.body;

    try {
        const likedBy = await Like.aggregate([
            {
                $match: {
                    postId: new mongoose.Types.ObjectId(postId),
                    postType,
                },
            },
            {
                $lookup: {
                    from: "users",
                    localField: "likedBy",
                    foreignField: "_id",
                    as: "userDetails",
                    pipeline: [
                        {
                            $project: {
                                _id: 1,
                                firstName: 1,
                                lastName: 1,
                                avatar: 1,
                            },
                        },
                    ],
                },
            },
            {
                $addFields: {
                    userDetails: {
                        $arrayElemAt: ["$userDetails", 0],
                    },
                },
            },
            {
                $project: {
                    userId: "$userDetails._id",
                    firstName: "$userDetails.firstName",
                    lastName: "$userDetails.lastName",
                    avatar: "$userDetails.avatar",
                }
            }
        ]);

        if (likedBy.length === 0) {
            res.status(200).json(
                new ApiResponse(200, { likedBy: [] }, "No one liked on post.")
            );
        }

        res.status(200).json(
            new ApiResponse(
                200,
                { likedBy },
                "Who liked on post fetched successfully."
            )
        );
    } catch (error) {
        console.log(error);
        if (error instanceof ApiError) {
            next(error);
        } else {
            next(new ApiError(500, "Failed to get who liked on post."));
        }
    }
});

// Only fetching liked posts from user posts.
const getLikedPosts = asyncHandler(async (req, res, next) => {
    const userId = req.user._id;

    try {
        const likedPosts = await Like.aggregate([
            {
                $match: {
                    postId: { $exists: true },
                    commentId: { $exists: false },
                    likedBy: new mongoose.Types.ObjectId(userId),
                },
            },
            {
                $lookup: {
                    from: "userposts",
                    localField: "postId",
                    foreignField: "_id",
                    as: "post",
                    pipeline: [
                        {
                            $lookup: {
                                from: "users",
                                localField: "userId",
                                foreignField: "_id",
                                as: "user",
                                pipeline: [
                                    {
                                        $project: {
                                            _id: 1,
                                            firstName: 1,
                                            lastName: 1,
                                            avatar: 1,
                                        },
                                    },
                                ],
                            },
                        },
                        {
                            $addFields: {
                                user: {
                                    $arrayElemAt: ["$user", 0],
                                },
                            },
                        },
                    ],
                },
            },
            {
                $unwind: "$post",
            },
            {
                $project: {
                    _id: 0,
                    postId: "$post._id",
                    content: "$post.content",
                    createdAt: "$post.createdAt",
                    updatedAt: "$post.updatedAt",
                    postedBy: "$post.user",
                    isLiked: true,
                },
            },
        ]);

        if (likedPosts.length === 0) {
            res.status(200).json(
                new ApiResponse(
                    200,
                    { likedPosts: [] },
                    "No liked posts found."
                )
            );
        }

        res.status(200).json(
            new ApiResponse(
                200,
                { likedPosts },
                "Liked posts fetched successfully."
            )
        );
    } catch (error) {
        console.log({ error });
        if (error instanceof ApiError) {
            next(error);
        } else {
            next(new ApiError(500, "Failed to get liked posts."));
        }
    }
});

export { togglePostLike, getWhoLikedOnPost, getLikedPosts };
