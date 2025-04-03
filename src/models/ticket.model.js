import mongoose, { Schema } from "mongoose";

const ticketSchema = new Schema(
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
        qrCode: {
            type: String,
            required: true,
        },
        verified: { // whether the ticket has been verified/used when a user attends the event.
            type: Boolean,
            default: false,
        },
        verificationDetails: {
            verifiedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
            verificationTime: Date,
            verificationLocation: String,
        },
        purchaseDate: {
            type: Date,
            default: Date.now,
        },
        price: {
            type: Number,
            required: true,
        },
        paymentId: {
            type: String,
            default: "",
        },
        ticketNumber: {
            type: String,
            required: true,
            unique: true,
        },
        status: {
            type: String,
            enum: ["active", "used", "cancelled", "expired"],
            default: "active",
        },
    },
    { timestamps: true }
);

// Create a compound index to ensure a user can only have one ticket per event
ticketSchema.index({ eventId: 1, userId: 1 }, { unique: true });

// Create indexes for queries
ticketSchema.index({ ticketNumber: 1 });
ticketSchema.index({ status: 1 });
ticketSchema.index({ eventId: 1, status: 1 });

const Ticket = mongoose.model("Ticket", ticketSchema);
export { Ticket }; 