import mongoose, { Schema } from "mongoose";
import { ApiError } from "../utils/apiError.js";

const userPostSchema = new Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        content: {
            type: String,
        },
        media: [String], // array of media urls
    },
    { timestamps: true }
);

// custom validations to ensure either content or media is provided
userPostSchema.pre("validate", function (next) {
    if (!this.content && (!this.media || this.media.length === 0)) {
        next(new ApiError(400, "Either content or media must be provided."));
    } else {
        next();
    }
});

// indexes
userPostSchema.index({ userId: 1 });
userPostSchema.index({ content: "text" });

const UserPost = mongoose.model("UserPost", userPostSchema);
export default UserPost;
