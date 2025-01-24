import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import GroupPost from "../models/groupPost.model.js";
import Membership from "../models/groupMembership.model.js";

// create a post
const createPostWithMedia = asyncHandler(async (req, res) => {
    const { groupId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    // Check if the user is an approved group member
    const isGroupMember = await Membership.findOne({
        groupId,
        userId,
        status: "approved",
    });

    if (!isGroupMember) {
        throw new ApiError(403, "You are not a member of this group.");
    }

    // Check if the user joined at least 6 hours ago
    const sixHoursInMillis = 6 * 60 * 60 * 1000;
    if (
        new Date(isGroupMember.joinedAt) >=
        new Date(Date.now() - sixHoursInMillis)
    ) {
        throw new ApiError(
            403,
            "New members need to wait for 6 hours to post anything."
        );
    }

    if (!req.files || req.files.length === 0) {
        throw new ApiError(400, "No files were uploaded!");
    }

    let mediaUrls = [];
    let publicIds = [];
    try {
        // Upload media to Cloudinary
        for (const file of req.files) {
            const response = await uploadOnCloudinary(file.path);
            if (response && response.url) {
                mediaUrls.push(response.url);
                publicIds.push(response.public_id); // Store the public_id
            }
        }

        if (mediaUrls.length === 0) {
            throw new ApiError(500, "Failed to upload media.");
        }

        // Create the group post
        const post = await GroupPost.create({
            userId,
            groupId,
            content,
            media: mediaUrls,
        });

        if (!post) {
            throw new Error("Failed to create post.");
        }

        res.status(201).json(
            new ApiResponse(201, post, "Post created successfully!")
        );
    } catch (error) {
        // Delete uploaded media from Cloudinary if post creation fails
        for (const publicId of publicIds) {
            await deleteFromCloudinary(publicId); // Use public_id for deletion
        }

        throw new ApiError(500, "Failed to create post with media.");
    }
});

const updateGroupPost = asyncHandler(async (req, res) => {
    const { postId, groupId } = req.params;
    const { content } = req.body;

    try {
        const post = await GroupPost.findOne({ _id: postId, groupId });

        if (!post) {
            throw new ApiError(404, "Post not found.");
        }

        if (post.userId.toString() !== req.user._id.toString()) {
            throw new ApiError(403, "Unauthorized to update this post.");
        }

        post.content = content;
        post.isEdited = true;
        await post.save();

        res.status(200).json(
            new ApiResponse(200, post, "Post updated successfully!")
        );
    } catch (error) {
        throw new ApiError(500, "Failed to update post.");
    }
});

const deleteGroupPost = asyncHandler(async (req, res) => {
    const { postId, groupId } = req.params;

    try {
        const post = await GroupPost.findOne({ _id: postId, groupId });

        if (!post) {
            throw new ApiError(404, "Post not found.");
        }

        if (post.userId.toString() !== req.user._id.toString()) {
            throw new ApiError(403, "Unauthorized to delete this post.");
        }

        await post.remove();

        res.status(200).json(
            new ApiResponse(200, null, "Post deleted successfully!")
        );
    } catch (error) {
        throw new ApiError(500, "Failed to delete post.");
    }
});

const getGroupPosts = asyncHandler(async (req, res) => {
    const { groupId } = req.params;
    const {
        lastPostId = "",
        fetchCount = 1,
        limit = 10,
        sortBy = "createdAt",
        sortType = "desc",
    } = req.query;

    const limitInt = parseInt(limit, 10);

    try {
        const posts = await GroupPost.aggregate([
            {
                $match: {
                    groupId: new mongoose.Types.ObjectId(groupId),
                    _id: {
                        [sortType === "desc" ? "$lt" : "$gt"]:
                            new mongoose.Types.ObjectId(lastPostId),
                    },
                },
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
            // Todo: total likes and comments and shares
        ]);

        const totalPosts = await GroupPost.countDocuments({
            groupId: new mongoose.Types.ObjectId(groupId),
        });
        const totalFetchedPosts = lastPostId
            ? posts.length + parseInt(fetchCount) * limitInt
            : posts.length;
        const allPostsFetched = totalPosts <= totalFetchedPosts;

        res.status(200).json(
            new ApiResponse(
                200,
                { posts, totalPosts, allPostsFetched },
                "Group posts fetched successfully!"
            )
        );
    } catch (error) {
        throw new ApiError(500, "Failed to get group posts.");
    }
});

const getGroupPost = asyncHandler(async (req, res) => {
    const { postId, groupId } = req.params;

    try {
        const post = await GroupPost.aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(postId),
                    groupId,
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

        if (!post || post.length === 0) {
            throw new ApiError(404, "Post not found.");
        }

        res.status(200).json(
            new ApiResponse(
                200,
                { post: post[0] },
                "group post fetched successfully!"
            )
        );
    } catch (error) {
        throw new ApiError(500, "Failed to get group post.");
    }
});

export {
    createPostWithMedia,
    updateGroupPost,
    deleteGroupPost,
    getGroupPosts,
    getGroupPost,
};
