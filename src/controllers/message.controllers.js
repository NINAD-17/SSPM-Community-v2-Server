import {ApiError} from "../utils/apiError.js";
import {ApiResponse} from "../utils/apiResponse.js";
import {asyncHandler} from "../utils/asyncHandler.js";
import { Message } from "../models/message.model.js";
import { Conversation } from "../models/conversation.model.js";
import mongoose from "mongoose";

// Get messages of a conversation with pagination
const getConversationMessages = asyncHandler(async (req, res, next) => {
    const { conversationId } = req.params;
    const { cursor, pageSize = 20 } = req.query;
    const userId = req.user._id;

    try {
        const conversation = await Conversation.findById(conversationId).select("participants");
        if (!conversation) {
            throw new ApiError(404, "Conversation not found!");
        }

        if (!conversation.participants.includes(userId)) {
            throw new ApiError(403, "You are not authorized to access this conversation!");
        }

        const baseQuery = {
            conversation: new mongoose.Types.ObjectId(conversationId),
            deletedAt: null
        };

        // Get total message count
        const totalCount = await Message.countDocuments(baseQuery);

        // Add cursor condition if provided
        const query = { ...baseQuery };
        if (cursor) {
            query.createdAt = { $lt: new Date(parseInt(cursor)) };
        }

        const messages = await Message.aggregate([
            { $match: query },
            { $sort: { createdAt: -1 } },
            { $limit: Number(pageSize) },
            {
                $lookup: {
                    from: "users",
                    localField: "sender",
                    foreignField: "_id",
                    as: "sender",
                    pipeline: [
                        {
                            $project: {
                                _id: 1,
                                firstName: 1,
                                lastName: 1,
                                avatar: 1
                            }
                        }
                    ]
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "readReceipts.userId",
                    foreignField: "_id",
                    as: "readBy",
                    pipeline: [
                        {
                            $project: {
                                _id: 1,
                                firstName: 1,
                                lastName: 1,
                                avatar: 1
                            }
                        }
                    ]
                }
            },
            { $unwind: "$sender" }
        ]);

        // Calculate remaining messages
        // total fetched messages
        const fetchedCount = cursor 
            ? await Message.countDocuments({
                ...baseQuery,
                createdAt: { $gte: new Date(parseInt(cursor)) }
              })
            : 0;
        
        // remaining messages
        const remainingCount = totalCount - (fetchedCount + messages.length);

        res.status(200).json(
            new ApiResponse(200, {
                messages,
                cursor: messages[messages.length - 1]?.createdAt,
                pagination: {
                    totalCount,
                    fetchedCount: fetchedCount + messages.length,
                    remainingCount,
                    hasMore: remainingCount > 0
                }
            }, 
            "Messages retrieved successfully")
        );
    } catch (error) {
        next(error instanceof ApiError ? error : new ApiError(500, "Failed to get messages"));
    }
});

// Send a message
const sendMessage = asyncHandler(async (req, res, next) => {
    const { content } = req.body;
    const { conversationId } = req.params;
    const userId = req.user._id;

    try {
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            throw new ApiError(404, "Conversation not found");
        }

        if (!conversation.participants.includes(userId)) {
            throw new ApiError(403, "You are not authorized to send messages in this conversation");
        }

        const message = await Message.create({
            content,
            sender: userId,
            conversation: conversationId,
            status: "sent"
        });

        // Update conversation's last message and metadata
        conversation.lastMessage = message._id;
        conversation.metadata.messagesCount += 1;
        conversation.metadata.lastActivity = new Date();
        await conversation.save();

        // Populate sender details
        await message.populate("sender", "firstName lastName avatar");

        res.status(201).json(
            new ApiResponse(201, { message }, "Message sent successfully")
        );
    } catch (error) {
        next(error instanceof ApiError ? error : new ApiError(500, "Failed to send message"));
    }
});

// Delete a message (soft delete)
const deleteMessage = asyncHandler(async (req, res, next) => {
    const { messageId } = req.params;
    const userId = req.user._id;

    try {
        const message = await Message.findById(messageId);
        if (!message) {
            throw new ApiError(404, "Message not found");
        }

        if (message.sender.toString() !== userId.toString()) {
            throw new ApiError(403, "You can only delete your own messages");
        }

        if(message.deletedFor.includes(userId)) {
            throw new ApiError(400, "You have already deleted this message");
        }

        // Soft delete the message
        message.deletedFor.push(userId);
        message.deletedAt = new Date();
        message.content = "This message was deleted";
        await message.save();

        res.status(200).json(
            new ApiResponse(200, {isDeleted: true, message}, "Message deleted successfully")
        );
    } catch (error) {
        next(error instanceof ApiError ? error : new ApiError(500, "Failed to delete message"));
    }
});

// Update a message
const updateMessage = asyncHandler(async (req, res, next) => {
    const { messageId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    try {
        const message = await Message.findById(messageId);
        if (!message) {
            throw new ApiError(404, "Message not found");
        }

        if (message.sender.toString() !== userId.toString()) {
            throw new ApiError(403, "You can only edit your own messages");
        }

        message.content = content;
        message.metadata.edited = true;
        message.metadata.editedAt = new Date();
        await message.save();

        res.status(200).json(
            new ApiResponse(200, {updatedMessage: message}, "Message updated successfully")
        );
    } catch (error) {
        next(error instanceof ApiError ? error : new ApiError(500, "Failed to update message"));
    }
});

// Mark messages as read
const markMessagesAsRead = asyncHandler(async (req, res, next) => {
    const { conversationId } = req.params;
    const { messageIds } = req.body; // Array of message IDs that are visible to user
    const userId = req.user._id;

    try {
        // Verify conversation access
        const conversation = await Conversation.findById(conversationId);
        if (!conversation || !conversation.participants.includes(userId)) {
            throw new ApiError(403, "Unauthorized access to conversation");
        }

        // Mark specific messages as read
        const result = await Message.updateMany(
            {
                _id: { $in: messageIds },
                conversation: conversationId,
                sender: { $ne: userId },
                "readReceipts.userId": { $ne: userId },
                status: { $in: ["sent", "delivered"] }
            },
            {
                $push: {
                    readReceipts: {
                        userId,
                        readAt: new Date()
                    }
                },
                $set: { status: "read" }
            }
        );

        res.status(200).json(
            new ApiResponse(
                200, 
                { modifiedCount: result.modifiedCount }, 
                "Messages marked as read"
            )
        );
    } catch (error) {
        next(error instanceof ApiError ? error : new ApiError(500, "Failed to mark messages as read"));
    }
});

export {
    getConversationMessages,
    sendMessage,
    deleteMessage,
    updateMessage,
    markMessagesAsRead
};