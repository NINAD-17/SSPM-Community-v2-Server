import mongoose, { Schema } from "mongoose";

const messageSchema = new Schema(
    {
        conversation: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Conversation",
            required: true,
        },
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        content: {
            type: String,
            required: true,
        },
        readReceipts: [
            {
                userId: {
                    type: Schema.Types.ObjectId,
                    ref: "User",
                },
                readAt: {
                    type: Date,
                },
            },
        ],
    },
    { timestamps: true }
);

export const Message = mongoose.model("Message", messageSchema);
