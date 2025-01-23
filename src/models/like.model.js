import mongoose, { Schema } from "mongoose";

const likeSchema = new Schema(
    {
        postType: {
            type: String,
            enum: ["UserPost", "GroupPost", "EventPost", "Opportunity"], // Polymorphic relationships: enable a model to belong to more than one other model on a single association
            required: true,
        },
        postId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },
        commentId: {
            type: mongoose.Schema.Types.ObjectId,
            required: false,
        },
        likedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    { timestamps: true }
);

const Like = mongoose.model("Like", likeSchema);
export default Like;
