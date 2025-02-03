import mongoose, { Schema } from "mongoose";

const userPostSchema = new Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        content: {
            type: String,
            required: true,
        },
        contentType: {
            type: String,
            enum: ["text", "richText"],
            default: "text"
        },
        media: [String], // array of media urls
    },
    { timestamps: true }
);

const UserPost = mongoose.model("UserPost", userPostSchema);
export default UserPost;
