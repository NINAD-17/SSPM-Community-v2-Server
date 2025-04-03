import mongoose, { Schema } from "mongoose";

const eventFeedbackSchema = new Schema(
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
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
        },
        content: {
            type: String,
            required: true,
        },
        isAnonymous: {
            type: Boolean,
            default: false,
        },
        isVisible: {
            type: Boolean,
            default: true, // Coordinators can toggle visibility
        },
        isEdited: {
            type: Boolean,
            default: false,
        },
        tags: [{
            type: String, // e.g., "helpful", "insightful", etc.
        }],
    },
    { timestamps: true }
);

// One user can leave only one feedback per event
eventFeedbackSchema.index({ eventId: 1, userId: 1 }, { unique: true });

const EventFeedback = mongoose.model("EventFeedback", eventFeedbackSchema);
export default EventFeedback; 