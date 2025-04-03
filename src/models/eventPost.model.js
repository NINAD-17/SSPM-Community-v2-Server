import mongoose, { Schema } from "mongoose";

const eventPostSchema = new Schema(
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
        media: [{
            type: String, // URL to media file
        }],
        isEdited: {
            type: Boolean,
            default: false,
        },
        isPinned: {
            type: Boolean,
            default: false,
        },
        isCoordinatorPost: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

const EventPost = mongoose.model("EventPost", eventPostSchema);
export default EventPost; 