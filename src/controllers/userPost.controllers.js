import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose, { Mongoose } from "mongoose";
import {
    uploadOnCloudinary,
    deleteFromCloudinary,
} from "../utils/cloudinary.js";
import UserPost from "../models/userPost.model.js";

// create a post
const createPost = asyncHandler(async (req, res, next) => {
    const { content, media } = req.body;
    const userId = req.user._id;
    let mediaUrls = [];
    console.log({media});

    try {
        // If media is present, extract URLs from the response
        if (media && media.data) {
            mediaUrls = media.data;
        }

        const post = await UserPost.create({
            userId,
            content,
            media: mediaUrls, // Now passing just the array of URLs
        });

        if (!post) {
            // If post creation fails, delete uploaded media
            await Promise.all(
                mediaUrls.map((url) => {
                    const publicId = url.split("/").pop().split(".")[0];
                    return deleteFromCloudinary(publicId);
                })
            );
            throw new ApiError(500, "Failed to create post.");
        }

        // Fetch the created post with user details
        const postWithDetails = await UserPost.aggregate([
            {
                $match: { _id: post._id },
            },
            {
                $lookup: {
                    from: "users",
                    localField: "userId",
                    foreignField: "_id",
                    as: "userDetails",
                    pipeline: [
                        {
                            $project: {
                                _id: 1,
                                firstName: 1,
                                lastName: 1,
                                avatar: 1,
                                headline: 1,
                                role: 1,
                                isAlumni: 1,
                                isAdmin: 1,
                                graduationYear: 1,
                                branch: 1,
                            },
                        },
                    ],
                },
            },
            {
                // get likes count of the post
                $lookup: {
                    from: "likes",
                    let: { postId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$postId", "$$postId"] },
                                        { $eq: ["$postType", "UserPost"] },
                                    ],
                                },
                            },
                        },
                        {
                            $count: "total",
                        },
                    ],
                    as: "likesCount",
                },
            },
            {
                // get comments count for the post
                $lookup: {
                    from: "comments",
                    let: { postId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$postId", "$$postId"] },
                                        { $eq: ["$postType", "UserPost"] },
                                    ],
                                },
                            },
                        },
                        {
                            $count: "total",
                        },
                    ],
                    as: "commentsCount",
                },
            },
            {
                $lookup: {
                    from: "likes",
                    let: { postId: "$_id" },
                    pipeline: [
                        {
                            // has user liked the post?
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$postId", "$$postId"] },
                                        { $eq: ["$postType", "UserPost"] },
                                        { $eq: ["$likedBy", req.user._id] },
                                    ],
                                },
                            },
                        },
                    ],
                    as: "userLike",
                },
            },
            {
                $project: {
                    _id: 1,
                    content: 1,
                    media: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    userId: 1,
                    userDetails: { $arrayElemAt: ["$userDetails", 0] },
                    likesCount: {
                        $ifNull: [
                            { $arrayElemAt: ["$likesCount.total", 0] },
                            0,
                        ],
                    },
                    commentsCount: {
                        $ifNull: [
                            { $arrayElemAt: ["$commentsCount.total", 0] },
                            0,
                        ],
                    },
                    isLiked: {
                        $cond: [
                            { $gt: [{ $size: "$userLike" }, 0] },
                            true,
                            false,
                        ],
                    },
                },
            },
        ]);

        res.status(201).json(
            new ApiResponse(
                201,
                { post: postWithDetails[0] },
                "Post created successfully!"
            )
        );
    } catch (error) {
        // If any error occurs, delete uploaded media
        if (mediaUrls.length > 0) {
            await Promise.all(
                mediaUrls.map((url) => {
                    const publicId = url.split("/").pop().split(".")[0];
                    return deleteFromCloudinary(publicId);
                })
            );
        }
        next(error);
    }
});

const uploadMedia = asyncHandler(async (req, res, next) => {
    if (!req.files?.media || req.files.media.length === 0) {
        throw new ApiError(400, "No files to upload");
    }

    const mediaUrls = [];
    try {
        for (const file of req.files.media) {
            const response = await uploadOnCloudinary(file.path);
            if (response && response.url) {
                mediaUrls.push(response.url);
            }
        }

        if (mediaUrls.length === 0) {
            throw new ApiError(500, "Failed to upload media");
        }

        res.status(200).json(
            new ApiResponse(200, mediaUrls, "Media uploaded successfully!")
        );
    } catch (error) {
        // If error occurs, delete any uploaded files
        await Promise.all(
            mediaUrls.map((url) => {
                const publicId = url.split("/").pop().split(".")[0];
                return deleteFromCloudinary(publicId);
            })
        );
        next(error);
    }
});

const updatePost = asyncHandler(async (req, res, next) => {
    const { postId } = req.params;
    const { content } = req.body;

    // After creating a post users can only update the content and not the media
    try {
        const post = await UserPost.findById(postId);

        if(!post) {
            throw new ApiError(404, "Post not found");
        }

        if (post.userId.toString() !== req.user._id.toString()) {
            throw new ApiError(403, "Unauthorized to update this post.");
        }

        post.content = content;
        console.log("post content: ", post.content);
        await post.save();
        console.log("hey");

        res.status(200).json(
            new ApiResponse(200, post, "Post updated successfully!")
        );
    } catch (error) {
        if (error instanceof ApiError) {
            next(error);
        } else {
            next(new ApiError(500, "Failed to update post"));
        }
    }
});

const deletePost = asyncHandler(async (req, res, next) => {
    const { postId } = req.params;

    try {
        const post = await UserPost.findById(postId);

        if(!post) {
            throw new ApiError(404, "Post not found");
        }

        if (post.userId.toString() !== req.user._id.toString()) {
            throw new ApiError(403, "Unauthorized to delete this post.");
        }
        
        await UserPost.findByIdAndDelete(postId);

        res.status(200).json(
            new ApiResponse(200, null, "Post deleted successfully!")
        );
    } catch (error) {
        if (error instanceof ApiError) {
            next(error);
        } else {
            next(new ApiError(500, "Failed to delete post."));
        }
    }
});

const getUserPost = asyncHandler(async (req, res) => {
    const { postId } = req.params;

    try {
        const post = await UserPost.aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(postId),
                },
            },
            {
                $lookup: {
                    from: "users",
                    localField: "userId",
                    foreignField: "_id",
                    as: "userDetails",
                    pipeline: [
                        {
                            $project: {
                                _id: 1,
                                firstName: 1,
                                lastName: 1,
                                avatar: 1,
                                headline: 1,
                                role: 1,
                                isAlumni: 1,
                                isAdmin: 1,
                                graduationYear: 1,
                                branch: 1,
                            },
                        },
                    ],
                },
            },
            {
                $addFields: {
                    userDetails: { $arrayElemAt: ["$userDetails", 0] },
                },
            },
        ]);

        if (!post) {
            throw new ApiError(404, "Post not found.");
        }

        res.status(200).json(
            new ApiResponse(200, { post }, "User post fetched successfully!")
        );
    } catch (error) {
        throw new ApiError(500, "Failed to get user post.");
    }
});

const getUserPosts = asyncHandler(async (req, res, next) => {
    const loggedInUserId = req.user._id;
    const { userId } = req.params;
    const {
        lastPostId = "",
        fetchCount = 0,
        limit = 10,
        sortBy = "createdAt",
        sortType = "desc",
    } = req.query;

    const limitInt = parseInt(limit, 10);
    const matchStage = {
        userId: new mongoose.Types.ObjectId(userId),
    };

    // Include the $match stage for lastPostId only if it's provided
    if (lastPostId) {
        matchStage._id = {
            [sortType === "desc" ? "$lt" : "$gt"]: new mongoose.Types.ObjectId(
                lastPostId
            ),
        };
    }

    try {
        const posts = await UserPost.aggregate([
            {
                $match: matchStage,
            },
            {
                $sort: {
                    [sortBy]: sortType === "desc" ? -1 : 1,
                },
            },
            {
                $limit: limitInt,
            },
            {
                $lookup: {
                    from: "users",
                    localField: "userId",
                    foreignField: "_id",
                    as: "userDetails",
                    pipeline: [
                        {
                            $lookup: {
                                from: "followers",
                                let: { postUserId: "$userId" },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $and: [
                                                    { $eq: ["$follower", new mongoose.Types.ObjectId(loggedInUserId)] },
                                                    { $eq: ["$following", "$$postUserId"] }
                                                ]
                                            }
                                        },
                                    },
                                    {
                                        $count: "isFollowing"
                                    }
                                ],
                                as: "followStatus"
                            }
                        },
                        {
                            $addFields: {
                                isFollowing: {
                                    $arrayElemAt: ["$followStatus.isFollowing", 0]
                                }
                            }
                        },
                        {
                            $project: {
                                _id: 1,
                                firstName: 1,
                                lastName: 1,
                                avatar: 1,
                                headline: 1,
                                role: 1,
                                isAlumni: 1,
                                isAdmin: 1,
                                graduationYear: 1,
                                branch: 1,
                                isFollowing: {
                                    $cond: {
                                        if: {$gt: ["$isFollowing", 0]},
                                        then: true,
                                        else: false
                                    }
                                }
                            },
                        },
                    ],
                },
            },
            // Get likes count
            {
                $lookup: {
                    from: "likes",
                    let: { postId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$postId", "$$postId"] },
                                        { $eq: ["$postType", "UserPost"] },
                                    ],
                                },
                            },
                        },
                        {
                            $count: "total",
                        },
                    ],
                    as: "likesCount",
                },
            },
            // Get comments count
            {
                $lookup: {
                    from: "comments",
                    let: { postId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$postId", "$$postId"] },
                                        { $eq: ["$postType", "UserPost"] },
                                    ],
                                },
                            },
                        },
                        {
                            $count: "total",
                        },
                    ],
                    as: "commentsCount",
                },
            },
            // Check if current user has liked the post
            {
                $lookup: {
                    from: "likes",
                    let: { postId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$postId", "$$postId"] },
                                        { $eq: ["$postType", "UserPost"] },
                                        { $eq: ["$likedBy", req.user._id] },
                                    ],
                                },
                            },
                        },
                    ],
                    as: "userLike",
                },
            },
            // Final projection
            {
                $project: {
                    _id: 1,
                    content: 1,
                    media: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    userId: 1,
                    userDetails: { $arrayElemAt: ["$userDetails", 0] },
                    likesCount: {
                        $ifNull: [
                            { $arrayElemAt: ["$likesCount.total", 0] },
                            0,
                        ],
                    },
                    commentsCount: {
                        $ifNull: [
                            { $arrayElemAt: ["$commentsCount.total", 0] },
                            0,
                        ],
                    },
                    isLiked: {
                        $cond: [
                            { $gt: [{ $size: "$userLike" }, 0] },
                            true,
                            false,
                        ],
                    },
                },
            },
        ]);

        const totalPosts = await UserPost.countDocuments({
            userId: new mongoose.Types.ObjectId(userId),
        });

        const totalFetchedPosts = lastPostId
            ? posts.length + parseInt(fetchCount, 10) * limitInt
            : posts.length;

        const allPostsFetched = totalPosts <= totalFetchedPosts;

        res.status(200).json(
            new ApiResponse(
                200,
                {
                    posts,
                    totalPosts,
                    totalFetchedPosts,
                    lastPostId: posts[posts.length - 1]?._id || null,
                    allPostsFetched,
                },
                "User posts fetched successfully!"
            )
        );
    } catch (error) {
        console.log(error)
        if (error instanceof ApiError) {
            next(error);
        } else {
            next(new ApiError(500, "Failed to fetch user posts."));
            throw new ApiError(500, "");
        }
    }
});

const getAllPosts = asyncHandler(async (req, res) => {
    const loggedInUserId = req.user._id;
    const {
        lastPostId = "",
        fetchCount = 0,
        limit = 10,
        sortBy = "createdAt",
        sortType = "desc",
    } = req.query;

    const limitInt = parseInt(limit, 10);
    const matchStage = {};

    // Include the $match stage only if lastPostId is provided
    if (lastPostId) {
        matchStage._id = {
            [sortType === "desc" ? "$lt" : "$gt"]: new mongoose.Types.ObjectId(
                lastPostId
            ),
        };
    }

    try {
        const posts = await UserPost.aggregate([
            {
                $match: matchStage,
            },
            {
                $sort: {
                    [sortBy]: sortType === "desc" ? -1 : 1,
                },
            },
            {
                $limit: limitInt,
            },
            // Lookup user details
            {
                $lookup: {
                    from: "users",
                    localField: "userId",
                    foreignField: "_id",
                    as: "userDetails",
                    pipeline: [
                        {
                            $lookup: {
                                from: "followers",
                                let: { postUserId: "$userId" },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $and: [
                                                    { $eq: ["$follower", new mongoose.Types.ObjectId(loggedInUserId)] },
                                                    { $eq: ["$following", "$$postUserId"] }
                                                ]
                                            }
                                        },
                                    },
                                    {
                                        $count: "isFollowing"
                                    }
                                ],
                                as: "followStatus"
                            }
                        },
                        {
                            $addFields: {
                                isFollowing: {
                                    $arrayElemAt: ["$followStatus.isFollowing", 0]
                                }
                            }
                        },
                        {
                            $project: {
                                _id: 1,
                                firstName: 1,
                                lastName: 1,
                                avatar: 1,
                                headline: 1,
                                role: 1,
                                isAlumni: 1,
                                isAdmin: 1,
                                graduationYear: 1,
                                branch: 1,
                                isFollowing: {
                                    $cond: {
                                        if: {$gt: ["$isFollowing", 0]},
                                        then: true,
                                        else: false
                                    }
                                }
                            },
                        },
                    ],
                },
            },
            // Get likes count
            {
                $lookup: {
                    from: "likes",
                    let: { postId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$postId", "$$postId"] },
                                        { $eq: ["$postType", "UserPost"] },
                                    ],
                                },
                            },
                        },
                        {
                            $count: "total",
                        },
                    ],
                    as: "likesCount",
                },
            },
            // Get comments count
            {
                $lookup: {
                    from: "comments",
                    let: { postId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$postId", "$$postId"] },
                                        { $eq: ["$postType", "UserPost"] },
                                    ],
                                },
                            },
                        },
                        {
                            $count: "total",
                        },
                    ],
                    as: "commentsCount",
                },
            },
            // Check if current user has liked the post
            {
                $lookup: {
                    from: "likes",
                    let: { postId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$postId", "$$postId"] },
                                        { $eq: ["$postType", "UserPost"] },
                                        { $eq: ["$likedBy", req.user._id] },
                                    ],
                                },
                            },
                        },
                    ],
                    as: "userLike",
                },
            },
            // Final projection
            {
                $project: {
                    _id: 1,
                    content: 1,
                    media: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    userId: 1,
                    userDetails: { $arrayElemAt: ["$userDetails", 0] },
                    likesCount: {
                        $ifNull: [
                            { $arrayElemAt: ["$likesCount.total", 0] },
                            0,
                        ],
                    },
                    commentsCount: {
                        $ifNull: [
                            { $arrayElemAt: ["$commentsCount.total", 0] },
                            0,
                        ],
                    },
                    isLiked: {
                        $cond: [
                            { $gt: [{ $size: "$userLike" }, 0] },
                            true,
                            false,
                        ],
                    },
                },
            },
        ]);

        const totalPosts = await UserPost.countDocuments();
        const totalFetchedPosts = lastPostId
            ? posts.length + parseInt(fetchCount, 10) * limitInt
            : posts.length;
        const allPostsFetched = totalPosts <= totalFetchedPosts;

        res.status(200).json(
            new ApiResponse(
                200,
                {
                    posts,
                    totalPosts,
                    totalFetchedPosts,
                    lastPostId: posts[posts.length - 1]?._id || null,
                    allPostsFetched,
                },
                "Posts fetched successfully!"
            )
        );
    } catch (error) {
        throw new ApiError(500, "Failed to get posts.");
    }
});

export {
    createPost,
    uploadMedia,
    updatePost,
    deletePost,
    getUserPosts,
    getUserPost,
    getAllPosts,
};
