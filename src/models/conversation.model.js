import mongoose, { Schema } from "mongoose";

const conversationSchema = new Schema(
    {
        participants: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                required: true,
            },
        ],
        conversationType: {
            type: String,
            enum: ["direct", "group"],
            required: true
        },
        groupName: {
            type: String,
            required: function () {
                return this.conversationType === "group";
            },
            trim: true
        },
        groupDescription: {
            type: String,
            trim: true
        },
        admins: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        lastMessage: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Message",
        },
        status: {
            type: String,
            enum: ["active", "archived", "blocked"],
            default: "active"
        },
        metadata: {
            participantsCount: {
                type: Number,
                default: 2
            },
            messagesCount: {
                type: Number,
                default: 0
            },
            lastActivity: {
                type: Date,
                default: Date.now
            }
        }
    },
    { timestamps: true }
);

conversationSchema.index({ participants: 1 });
conversationSchema.index({ status: 1 });
conversationSchema.index({ "metadata.lastActivity": -1 });

conversationSchema.pre('save', function(next) {
    if (this.isNew || this.isModified('participants')) {
        this.metadata.participantsCount = this.participants.length;
    }
    next();
});

conversationSchema.statics.canUsersMessage = async function(userId1, userId2) {
    const Connection = mongoose.model('Connection');
    
    const connection = await Connection.findOne({
        $or: [
            { requester: userId1, recipient: userId2 },
            { requester: userId2, recipient: userId1 }
        ]
    });

    return connection?.status === "accepted";
};

conversationSchema.statics.findDirectConversation = async function(userId1, userId2) {
    return this.findOne({
        conversationType: "direct",
        participants: { 
            $all: [userId1, userId2],
            $size: 2
        }
    });
};

export const Conversation = mongoose.model("Conversation", conversationSchema);
