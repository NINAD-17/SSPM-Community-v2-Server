import ApiError from "../utils/apiError";
import ApiResponse from "../utils/apiResponse";
import asyncHandler from "../utils/asyncHandler";
import { Message } from "../models/message.model.js";
import { Conversation } from "../models/conversation.model.js";

const sendMessage = asyncHandler(async (req, res) => {
    const { content } = req.body;
    const { conversationId } = req.params;
    const userId = req.user._id;

    try {
        const conversation = await Conversation.findById(conversationId);

        if (!conversation) {
            throw new ApiError(404, "Conversation not found.");
        }

        if (!conversation.participants.includes(userId)) {
            throw new ApiError(
                403,
                "You are not a participant in this conversation."
            );
        }

        const message = await Message.create({
            content,
            sender: userId,
            conversation: conversationId,
        });

        // update the lastMessage in conversation
        conversation.lastMessage = message._id;
        await conversation.save();

        res.status(200).json(
            new ApiResponse(201, message, "Message sent successfully.")
        );
    } catch (error) {
        throw new ApiError(500, "Failed to send message.");
    }
});

const deleteMessage = asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const { conversationId } = req.params;
    const userId = req.user._id;

    try {
        const message = await Message.findById(messageId);

        if (!message) {
            throw new ApiError(404, "Message not found.");
        }

        const conversation = await Conversation.findById(conversationId);

        if (!conversation) {
            throw new ApiError(404, "Conversation not found.");
        }

        const isParticipant = conversation.participants.includes(userId);
        const isAdmin = conversation.admins.includes(userId);

        if (!isParticipant && !isAdmin) {
            throw new ApiError(
                403,
                "You are not authorized to delete this message."
            );
        }

        const deleteAllowed =
            isAdmin ||
            new Date() - message.createdAt <= 7 * 24 * 60 * 60 * 1000; // users can delete message within 7 days only. After that it's not allowed.

        if(message.deletedAt || !deleteAllowed) {
            throw new ApiError(403, "This message can't be deleted!");
        }

        message.deletedAt = new Date();
        message.content = "This message was deleted.";

        await message.save();

        res.status(200).json(
            new ApiResponse(200, message, "Message deleted successfully.")
        );
    } catch (error) {
        throw new ApiError(500, "Failed to delete message.");
    }
});

const updateMessage = asyncHandler(async(req, res) => {
    const { messageId } = req.params;
    const { conversationId } = req.params;
    const userId = req.user._id;
    const { content } = req.body;

    try {
        const message = await Message.findById(messageId);

        if(!message) {
            throw new ApiError(404, "Message not found.");
        }

        const conversation = await Conversation.findById(conversationId);

        if(!conversation) {
            throw new ApiError(404, "Conversation not found.");
        }

        if(!conversation.participants.includes(userId) || message.sender.toString() !== userId.toString()) {
            throw new ApiError(403, "You are not authorized to update this message.");
        }

        message.content = content;
        await message.save();

        res.status(200).json(
            new ApiResponse(200, message, "Message updated successfully.")
        )
    } catch(error) {
        throw new ApiError(500, "Failed to update the message");
    }
})

export { sendMessage, deleteMessage, updateMessage };
