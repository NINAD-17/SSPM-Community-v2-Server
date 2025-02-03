import mongoose from "mongoose";

const groupSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            required: true
        },
        category: {
            type: String,
            required: true
        },
        skills: [{
            type: String,
            required: true
        }],
        members: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }],
        admins: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        }],
        isPrivate: {
            type: Boolean,
            default: false
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
