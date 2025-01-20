import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import UserPost from "../models/userpost.model.js";

// create a post
const createPost = asyncHandler(async (req, res) => {
    const { content } = req.body;
    const userId = req.user._id;

    const post = new UserPost.create({
        userId,
        content,
        media: media || []
    });

    if(!post) {
        throw new ApiError(500, "Failed to create post.");
    }

    res.status(201).json(
        new ApiResponse(201, post, "Post created successfully!")
    )
});

const uploadMedia = asyncHandler(async(req, res) => {
    if(!req.files || req.files.length === 0) {
        throw new ApiError(400, "No files were uploaded!");
    }

    const mediaUrls = [];
    for(const file of req.files) {
        const response = await uploadOnCloudinary(file.path);
        if(response && response.url) {
            mediaUrls.push(response.url);
        }
    }

    if(mediaUrls.length === 0) {
        throw new ApiError(500, "Failed to upload media.");
    }

    req.status(200).json(
        new ApiResponse(200, mediaUrls, "Media uploaded successfully!")
    )
});

const updatePost = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const { content } = req.body;

    try {
        const post = await UserPost.findById(postId);
    
        if(post.userId.toString() !== req.user._id.toString()) {
            throw new ApiError(403, "Unauthorized to update this post.");
        }
    
        post.content = content;
        await post.save();
    
        res.status(200).json(
            new ApiResponse(200, post, "Post updated successfully!")
        );
    } catch (error) {
        throw new ApiError(500, "Failed to update post.");
    }
});

const deletePost = asyncHandler(async (req, res) => {
    const { postId } = req.params;

    try {
        const post = await UserPost.findById(postId);

        if(post.userId.toString() !== req.user._id.toString()) {
            throw new ApiError(403, "Unauthorized to delete this post.");
        }

        await post.remove();

        res.status(200).json(
            new ApiResponse(200, null, "Post deleted successfully!")
        );
    } catch(error) {
        throw new ApiError(500, "Failed to delete post.");
    }
});

export { createPost, uploadMedia, updatePost, deletePost };