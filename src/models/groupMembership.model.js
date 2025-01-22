import mongoose, { Schema } from "mongoose";

const membershipSchema = new Schema(
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
        role: {
            type: String,
            enum: ["member", "admin"],
            required: true,
            default: "member",
        },
        status: {
            type: String,
            enum: ["pending", "approved"],
            required: true,
            default: "pending",
        },
        joinedAt: { 
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);

const Membership = mongoose.model("Membership", membershipSchema);
export default Membership;
