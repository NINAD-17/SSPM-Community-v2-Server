import mongoose, { Schema } from "mongoose";

const groupPostSchema = new Schema(
    {
        groupId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Group",
            required: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        content: {
            type: String,
            required: true,
        },
        media: [String], // array of media urls
        isEdited: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

const GroupPost = mongoose.model("GroupPost", groupPostSchema);
export default GroupPost;
