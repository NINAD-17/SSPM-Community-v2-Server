import Comment from "../models/comment.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import UserPost from "../models/userPost.model.js";
import mongoose from "mongoose";

const addCommentOnUserPost = asyncHandler(async (req, res, next) => {
    const { postId, postType = "UserPost", content } = req.body;
    const userId = req.user._id;

    // Verify if the post exists
    try {
        const post = await UserPost.findById(postId);
        if (!post) {
            throw new ApiError(404, "Post not found!");
        }

        const newComment = await Comment.create({
            postId,
            postType,
            userId,
            content,
        });

        res.status(200).json(
            new ApiResponse(
                200,
                { comment: newComment },
                "Comment added successfully!"
            )
        );
    } catch (error) {
        console.log(error);
        if (error instanceof ApiError) {
            next(error);
        } else {
            next(new ApiError(500, "Failed to add comment!"));
        }
    }
});

const updateComment = asyncHandler(async (req, res, next) => {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    try {
        const comment = await Comment.findById(commentId);

        if (!comment) {
            throw new ApiError(404, "Comment not found!");
        }

        if (comment.userId.toString() !== userId.toString()) {
            throw new ApiError(
                403,
                "You are not authorized to edit this comment!"
            );
        }

        comment.content = content;
        comment.isEdited = true;
        await comment.save();

        res.status(200).json(
            new ApiResponse(200, comment, "Comment updated successfully!")
        );
    } catch (error) {
        if(error instanceof ApiError) {
            next(error);
        } else {
            next(new ApiError(500, "Failed to update comment!"));
        }
    }
});

const deleteComment = asyncHandler(async (req, res, next) => {
    const { commentId } = req.params;
    const userId = req.user._id;

    try {
        const comment = await Comment.findById(commentId);

        if (!comment) {
            throw new ApiError(404, "Comment not found!");
        }

        if (comment.userId.toString() !== userId.toString()) {
            throw new ApiError(
                403,
                "You are not authorized to delete this comment!"
            );
        }

        await Comment.findByIdAndDelete(commentId);

        res.status(200).json(
            new ApiResponse(200, {}, "Comment deleted successfully!")
        );
    } catch (error) {
        console.log(error);
        if(error instanceof ApiError) {
            next(error);
        } else {
            next(new ApiError(500, "Failed to delete comment!"));
        }
    }
});

// Get comments from all types of posts (user, group, event)
const getCommentsOfPost = asyncHandler(async (req, res, next) => {
    const { postId } = req.params;
    const {
        postType = "UserPost",
        lastCommentId = null,
        limit = 10,
        fetchCount = 0,
    } = req.query;

    const limitInt = parseInt(limit, 10);

    const matchCondition = {
        postId: new mongoose.Types.ObjectId(postId),
        postType,
    };
    if (lastCommentId) {
        matchCondition._id = {
            $lt: new mongoose.Types.ObjectId(lastCommentId),
        };
    }

    try {
        const comments = await Comment.aggregate([
            {
                $match: matchCondition,
            },
            {
                $sort: { createdAt: -1 },
            },
            {
                $limit: limitInt,
            },
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
            { $addFields: { user: { $arrayElemAt: ["$user", 0] } } },
        ]);

        if (comments.length === 0) {
            res.status(200).json(
                new ApiResponse(200, [], "No comments found.")
            );
        }

        const totalComments = await Comment.countDocuments({
            postId,
            postType,
        });
        const totalFetchedComments = lastCommentId
            ? comments.length + parseInt(fetchCount, 10) * limitInt
            : comments.length;
        const allCommentsFetched = totalComments <= totalFetchedComments;

        res.status(200).json(
            new ApiResponse(
                200,
                {
                    comments,
                    totalComments,
                    totalFetchedComments,
                    allCommentsFetched,
                },
                "Comments fetched successfully!"
            )
        );
    } catch (error) {
        if(error instanceof ApiError) {
            next(error);
        } else {
            next(new ApiError(500, "Failed to get comments!"));
        }
    }
});

export {
    addCommentOnUserPost,
    updateComment,
    deleteComment,
    getCommentsOfPost,
};
