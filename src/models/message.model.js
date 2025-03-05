import mongoose, { Schema } from "mongoose";

// const MESSAGE_MAX_LENGTH = 1000; // Define max length for regular messages

const messageSchema = new Schema(
    {
        conversation: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Conversation",
            required: true,
            index: true
        },
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        content: {
            type: String,
            required: true,
            trim: true,
            // maxlength: [MESSAGE_MAX_LENGTH, `Message cannot be longer than ${MESSAGE_MAX_LENGTH} characters`]
        },
        messageType: {
            type: String,
            enum: ["text", "system"],  // system messages for group notifications etc.
            default: "text"
        },
        status: {
            type: String,
            enum: ["sent", "delivered", "read"],
            default: "sent"
        },
        readReceipts: [{
            userId: {
                type: Schema.Types.ObjectId,
                ref: "User"
            },
            readAt: {
                type: Date
            }
        }],
        deletedFor: [{ // Users who have deleted this message from their view
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }],
        deletedAt: {
            type: Date,
            default: null
        },
        metadata: {
            edited: {
                type: Boolean,
                default: false
            },
            editedAt: {
                type: Date
            }
        }
    },
    { 
        timestamps: true 
    }
);

// Indexes for better query performance
messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ status: 1 });
messageSchema.index({ "readReceipts.userId": 1 });

// Middleware to validate message length
messageSchema.pre('save', function(next) {
    // if (this.content && this.content.length > MESSAGE_MAX_LENGTH) {
    //     next(new Error(`Message cannot be longer than ${MESSAGE_MAX_LENGTH} characters`));
    // }
    next();
});

// Method to mark message as read by a user
messageSchema.methods.markAsRead = async function(userId) {
    if (!this.readReceipts.some(receipt => receipt.userId.equals(userId))) {
        this.readReceipts.push({
            userId,
            readAt: new Date()
        });
        this.status = "read";
        await this.save();
    }
};

export const Message = mongoose.model("Message", messageSchema);
