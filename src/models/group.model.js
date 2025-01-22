import mongoose, { Schema } from "mongoose";

const groupSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
        },
        description: {
            type: String,
            required: true,
        },
        visibility: {
            type: String,
            enum: ["public", "private"],
            required: true,
            default: "public",
        },
        avatarImg: {
            type: String,
            default: null,
        },
        coverImg: {
            type: String,
            default: null,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    { timestamps: true }
);

const Group = mongoose.model("Group", groupSchema);
export default Group;
