import mongoose, { Schema } from "mongoose";

const eventDiscussionSchema = new Schema(
    {
        eventId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Event",
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
        parentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "EventDiscussion",
            default: null,
        },
        isEdited: {
            type: Boolean,
            default: false,
        },
        isPinned: {
            type: Boolean,
            default: false,
        },
        isCoordinatorReply: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

// Create an index for faster queries
eventDiscussionSchema.index({ eventId: 1, parentId: 1 });

const EventDiscussion = mongoose.model("EventDiscussion", eventDiscussionSchema);
export default EventDiscussion; 