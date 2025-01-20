import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
    {
        postId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "UserPost",
        },
        reportedBy: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "User",
        },
        reason: {
            type: String,
            required: true,
            enum: ["spam", "harassment", "hate speech", "other"],
        },
        message: {
            type: String,
            min: 50,
            max: 500,
        },
        status: {
            type: String,
            required: true,
            enum: ["pending", "reviewed"],
            default: "pending",
        },
    },
    { timestamps: true }
);

export const Report = mongoose.model("Report", reportSchema);
