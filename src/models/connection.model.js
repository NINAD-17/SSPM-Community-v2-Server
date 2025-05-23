import mongoose from "mongoose";

const connectionSchema = new mongoose.Schema(
    {
        requester: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        status: {
            type: String,
            enum: ["pending", "accepted", "rejected"],
            default: "pending",
        },
    },
    { timestamps: true }
);

connectionSchema.index({ requester: 1, recipient: 1 }, { unique: true });

export const Connection = mongoose.model("Connection", connectionSchema);
