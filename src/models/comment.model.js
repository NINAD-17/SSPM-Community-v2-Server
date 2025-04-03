import mongoose, { Schema } from "mongoose";

const commentSchema = new Schema(
    {
        postType: {
            type: String,
            enum: ["UserPost", "GroupPost", "EventPost", "Opportunity"],
            required: true,
        },
        postId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        parentCommentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Comment",
            default: null,
        },
        isEdited: {
            type: Boolean,
            default: false,
        },
        content: {
            type: String,
            required: true,
        },
    },
    { timestamps: true }
);

const Comment = mongoose.model("Comment", commentSchema);
export default Comment;
