import mongoose, { Schema } from "mongoose";

const eventSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            required: true,
        },
        startDate: {
            type: Date,
            required: true,
        },
        endDate: {
            type: Date,
            required: true,
        },
        location: {
            type: String,
            required: true,
        },
        coordinators: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        }], // Users with full access to manage the event
        volunteers: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        }], // Users with limited access to view attendees, stats, etc.
        attendees: [{
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                required: true,
            },
            registrationDate: {
                type: Date,
                default: Date.now,
            },
            paymentStatus: {
                type: String,
                enum: ["pending", "paid", "free", "failed"],
                default: "pending",
            },
        }], // Enhanced to track registration details
        stats: {
            no: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
            maybe: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
            going: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
        },
        capacity: {
            type: Number,
            default: 0, // 0 means unlimited
        },
        ticketPrice: {
            type: Number,
            default: 0, // 0 means free
        },
        totalRevenue: {
            type: Number,
            default: 0, // Track total revenue from paid tickets
        },
        image: {
            type: String,
            default: "",
        },
        // New fields for file attachments
        attachments: [{
            fileName: String,
            fileUrl: String,
            fileType: String,  // e.g., "pdf", "image", etc.
            uploadDate: {
                type: Date,
                default: Date.now
            }
        }],
        faqs: [{
            question: String,
            answer: String,
        }],
        status: {
            type: String,
            enum: ["upcoming", "ongoing", "completed", "cancelled"],
            default: "upcoming",
        },
        isPrivate: {
            type: Boolean,
            default: true, // Changed to true - private by default until ready to publish
        },
        tags: [{
            type: String,
        }], // For grouping events (e.g., technical fests)
        settings: {
            allowDiscussion: {
                type: Boolean,
                default: true,
            },
            discussionVisibility: {
                type: String,
                enum: ["public", "attendees", "coordinators"],
                default: "public",
            },
            allowFeedback: {
                type: Boolean,
                default: true,
            },
            feedbackVisibility: {
                type: String,
                enum: ["public", "attendees", "coordinators"],
                default: "public",
            },
            // Only coordinators or completed events can receive feedback
            feedbackEligibility: {
                type: String,
                enum: ["anytime", "after_event", "coordinator_choice"],
                default: "after_event",
            },
            // New setting: allow volunteers to edit event details
            allowVolunteerEdit: {
                type: Boolean,
                default: false,
            },
            // New setting: automatically cancel pending registrations
            cancelPendingAfterHours: {
                type: Number,
                default: 24, // Default 24 hours to cancel unpaid registrations
            }
        },
        averageRating: {
            type: Number,
            default: 0,
        },
        totalFeedbacks: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);

// Create indexes for efficient queries
eventSchema.index({ name: "text", description: "text", location: "text" });
eventSchema.index({ tags: 1 });
eventSchema.index({ status: 1 });
eventSchema.index({ startDate: 1 });
eventSchema.index({ isPrivate: 1 });

const Event = mongoose.model("Event", eventSchema);
export { Event };
