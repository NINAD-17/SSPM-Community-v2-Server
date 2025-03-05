import { ApiError } from "../utils/apiError.js";
import { Conversation } from "../models/conversation.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const validateConnection = asyncHandler(async (req, res, next) => {
    const currentUserId = req.user._id;
    const { recipientId } = req.body; // For new conversations
    const { conversationId } = req.params; // For existing conversations

    if (conversationId) {
        // If accessing existing conversation
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            throw new ApiError(404, "Conversation not found");
        }

        // For direct messages, check connection status
        if (conversation.conversationType === "direct") {
            const otherParticipant = conversation.participants.find(
                p => p.toString() !== currentUserId.toString()
            );
            
            const canMessage = await Conversation.canUsersMessage(currentUserId, otherParticipant);
            if (!canMessage) {
                throw new ApiError(403, "You can only message users you are connected with");
            }
        }
    } else if (recipientId) {
        // For new conversations
        const canMessage = await Conversation.canUsersMessage(currentUserId, recipientId);
        if (!canMessage) {
            throw new ApiError(403, "You can only message users you are connected with");
        }
    }

    next();
});
