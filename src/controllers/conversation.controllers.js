import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Conversation } from "../models/conversation.model.js";
import { Message } from "../models/message.model.js";
import mongoose from "mongoose";

const getConversations = asyncHandler(async (req, res, next) => {
    const userId = req.user._id;

    try {
        const conversations = await Conversation.aggregate([
            {
                $match: {
                    participants: { $in: [userId] },
                },
            },
            // Get last message details
            {
                // Find last message and sender of that message to show on conversation list
                $lookup: {
                    from: "messages",
                    localField: "lastMessage",
                    foreignField: "_id",
                    as: "lastMessage",
                    pipeline: [
                        {
                            $lookup: {
                                from: "users",
                                localField: "sender",
                                foreignField: "_id",
                                as: "sender",
                                pipeline: [
                                    {
                                        $project: {
                                            firstName: 1,
                                            lastName: 1,
                                            avatar: 1,
                                        },
                                    },
                                ],
                            },
                        },
                    ],
                },
            },
            // Get participant details
            {
                $lookup: {
                    from: "users",
                    localField: "participants",
                    foreignField: "_id",
                    as: "participantDetails",
                    pipeline: [
                        {
                            $project: {
                                firstName: 1,
                                lastName: 1,
                                avatar: 1,
                                headline: 1,
                            },
                        },
                    ],
                },
            },
            // Sort by last activity
            {
                $sort: { updatedAt: -1 }, // -1 for descending order, 1 for ascending order
            },
            {
                $unwind: {
                    path: "$lastMessage",
                    preserveNullAndEmptyArrays: true, // Ensure conversations without messages are included
                },
            },
            // Project final fields
            {
                $project: {
                    _id: 1,
                    conversationType: 1,
                    groupName: 1,
                    lastMessage: {
                        content: 1,
                        createdAt: 1,
                        sender: {
                            _id: {
                                $arrayElemAt: ["$lastMessage.sender._id", 0],
                            },
                            firstName: {
                                $arrayElemAt: [
                                    "$lastMessage.sender.firstName",
                                    0,
                                ],
                            },
                            lastName: {
                                $arrayElemAt: [
                                    "$lastMessage.sender.lastName",
                                    0,
                                ],
                            },
                            avatar: {
                                $arrayElemAt: ["$lastMessage.sender.avatar", 0],
                            },
                        },
                    },
                    participants: {
                        $map: {
                            input: "$participantDetails",
                            as: "participant",
                            in: {
                                _id: "$$participant._id",
                                firstName: "$$participant.firstName",
                                lastName: "$$participant.lastName",
                                avatar: "$$participant.avatar",
                                headline: "$$participant.headline",
                            },
                        },
                    },
                    updatedAt: 1,
                },
            },
        ]);

        // Format conversations for LinkedIn-like display
        const formattedConversations = conversations.map((conversation) => {
            let title = "";
            let subtitle = "";

            if (conversation.conversationType === "group") {
                title = conversation.groupName;
                subtitle = `${conversation.participants.length} members`;
            } else {
                const otherParticipant = conversation.participants.find(
                    (p) => p._id.toString() !== userId.toString()
                );
                title = `${otherParticipant.firstName} ${otherParticipant.lastName}`;
                subtitle = otherParticipant.headline || "Member";
            }

            return {
                _id: conversation._id,
                title,
                subtitle,
                conversationType: conversation.conversationType,
                lastMessage: conversation.lastMessage,
                participants: conversation.participants,
                updatedAt: conversation.updatedAt,
            };
        });

        res.status(200).json(
            new ApiResponse(
                200,
                { conversations: formattedConversations },
                "Conversations retrieved successfully"
            )
        );
    } catch (error) {
        console.log(error);
        next(new ApiError(500, "Failed to get conversations"));
    }
});

const getConversationDetails = asyncHandler(async (req, res, next) => {
    const { conversationId } = req.params;
    const userId = req.user._id;

    try {
        const conversation = await Conversation.aggregate([
            {
                $match: { _id: new mongoose.Types.ObjectId(conversationId) },
            },
            {
                $lookup: {
                    from: "users",
                    localField: "participants",
                    foreignField: "_id",
                    as: "participants",
                    pipeline: [
                        {
                            $project: {
                                firstName: 1,
                                lastName: 1,
                                avatar: 1,
                                headline: 1,
                                currentlyWorkingAt: 1,
                                role: 1,
                            },
                        },
                    ],
                },
            },
            {
                $lookup: {
                    from: "users",
                    localField: "admins",
                    foreignField: "_id",
                    as: "admins",
                    pipeline: [
                        {
                            $project: {
                                firstName: 1,
                                lastName: 1,
                                avatar: 1,
                            },
                        },
                    ],
                },
            },
            {
                $project: {
                    _id: 1,
                    conversationType: 1,
                    groupName: 1,
                    groupDescription: 1,
                    participants: {
                        $map: {
                            input: "$participants",
                            as: "participant",
                            in: {
                                _id: "$$participant._id",
                                firstName: "$$participant.firstName",
                                lastName: "$$participant.lastName",
                                avatar: "$$participant.avatar",
                                headline: "$$participant.headline",
                                currentlyWorkingAt:
                                    "$$participant.currentlyWorkingAt",
                                role: "$$participant.role",
                            },
                        },
                    },
                    admins: {
                        $cond: {
                            if: { $eq: ["$conversationType", "group"] },
                            then: "$admins",
                            else: "$$REMOVE",
                        },
                    },
                    status: 1,
                    metadata: 1,
                    updatedAt: 1,
                },
            },
        ]);

        if (!conversation.length) {
            throw new ApiError(404, "Conversation not found");
        }

        const conversationData = conversation[0];

        // Check if user is a participant
        if (!conversationData.participants.some((p) => p._id.equals(userId))) {
            throw new ApiError(
                403,
                "You are not authorized to access this conversation"
            );
        }

        if (conversationData.conversationType === "group") {
            conversationData.title = conversationData.groupName;
            conversationData.subtitle = `${conversationData.participants.length} members`;
        } else {
            const otherParticipant = conversationData.participants.find(
                (p) => p._id.toString() !== userId.toString()
            );
            conversationData.title = `${otherParticipant.firstName} ${otherParticipant.lastName}`;
            conversationData.subtitle = otherParticipant.headline || "Member";
        }

        res.status(200).json(
            new ApiResponse(
                200,
                { conversation: conversationData },
                "Conversation details retrieved successfully"
            )
        );
    } catch (error) {
        console.log(error);
        next(
            error instanceof ApiError
                ? error
                : new ApiError(500, "Failed to get conversation details")
        );
    }
});

const getConversationMessages = asyncHandler(async (req, res, next) => {
    const { conversationId } = req.params;
    const { cursor, pageSize = 20 } = req.query; // cursor is the last message's timestamp (createdAt). By this we can fetch messages before this time.
    const userId = req.user._id;

    try {
        const conversation =
            await Conversation.findById(conversationId).select("participants");
        if (!conversation) {
            throw new ApiError(404, "Conversation not found!");
        }

        const isParticipant = conversation.participants.some((participant) =>
            participant.equals(userId)
        );

        if (!isParticipant) {
            throw new ApiError(
                403,
                "You are not authorized to access this conversation!"
            );
        }

        const query = {
            conversation: new mongoose.Types.ObjectId(conversationId),
        }; // It's reffering to the conversation that this message belongs to.
        if (cursor) {
            query.createdAt = { $lt: new Date(parseInt(cursor)) };
        }

        const messages = await Message.aggregate([
            {
                $match: query,
            },
            {
                $sort: {
                    createdAt: -1,
                },
            },
            {
                $limit: Number(pageSize),
            },
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
                                avatar: 1,
                            },
                        },
                    ],
                },
            },
            {
                $unwind: "$sender",
            },
        ]);

        if (!messages.length) {
            res.status(200).json(
                new ApiResponse(200, [], "No messages found!")
            );
        }

        res.status(200).json(
            new ApiResponse(
                200,
                messages,
                "Conversation messages retrieved successfully."
            )
        );
    } catch (error) {
        if (error instanceof ApiError) {
            next(error);
        } else {
            next(new ApiError(500, "Failed to get conversation messages!"));
        }
    }
});

const startConversation = asyncHandler(async (req, res, next) => {
    const { participants, conversationType, groupName, groupDescription } =
        req.body;
    const currentUserId = req.user._id;

    if (!(participants?.length > 0)) {
        throw new ApiError(400, "At least one participant is required");
    }

    try {
        let conversation;

        if (conversationType === "direct") {
            // Validate only two participants for direct messages
            if (participants.length !== 1) {
                throw new ApiError(
                    400,
                    "Direct messages must have exactly one recipient"
                );
            }

            const recipientId = participants[0];

            // Check if users are connected
            const canMessage = await Conversation.canUsersMessage(
                currentUserId,
                recipientId
            );
            if (!canMessage) {
                throw new ApiError(
                    403,
                    "You can only message users you are connected with"
                );
            }

            // Check for existing conversation
            conversation = await Conversation.findDirectConversation(
                currentUserId,
                recipientId
            );

            if (conversation) {
                if (conversation.status === "blocked") {
                    throw new ApiError(
                        403,
                        "This conversation has been blocked"
                    );
                }
                return res
                    .status(200)
                    .json(
                        new ApiResponse(
                            200,
                            { conversation },
                            "Existing conversation retrieved"
                        )
                    );
            }

            // Create new conversation
            conversation = new Conversation({
                participants: [currentUserId, recipientId],
                conversationType: "direct",
                status: "active",
            });
        } else if (conversationType === "group") {
            // Handle group conversation creation
            if (!groupName) {
                throw new ApiError(
                    400,
                    "Group name is required for group conversations"
                );
            }

            conversation = new Conversation({
                participants: [currentUserId, ...participants],
                conversationType: "group",
                groupName,
                groupDescription,
                admins: [currentUserId],
                status: "active",
            });
        }

        await conversation.save();

        res.status(201).json(
            new ApiResponse(
                201,
                { conversation },
                "Conversation created successfully"
            )
        );
    } catch (error) {
        console.log(error);
        if (error instanceof ApiError) {
            next(error);
        } else {
            next(new ApiError(500, "Failed to start conversation"));
        }
    }
});

// modify group details and participants and admins
const updateGroupDetails = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const userId = req.user._id;
    const { groupName, groupDescription, participants, admins } = req.body;

    try {
        const conversation = await Conversation.findById(conversationId);

        if (!conversation.isGroupChat) {
            throw new ApiError(400, "This is not a group chat!");
        }

        if (!conversation.admins.includes(userId)) {
            throw new ApiError(403, "You are not an admin of this group!");
        }

        // groupName ? conversation.groupName = groupName : conversation.groupName;
        // participants ? conversation.participants = [...conversation.participants, ...participants] : conversation.participants;

        // Instead of ternary operator, for good readability used Object.assign()
        Object.assign(conversation, {
            groupName: groupName || conversation.groupName,
            groupDescription: groupDescription || conversation.groupDescription,
            participants: participants.length
                ? [...new Set([...conversation.participants, ...participants])]
                : conversation.participants, // set used to remove duplicates value. It gives {} as output so we used spread operator to put those values in an array
            admins: admins.length
                ? [...new Set([...conversation.admins, ...admins])]
                : conversation.admins,
        });

        await conversation.save();

        res.status(200).json(
            new ApiResponse(
                200,
                conversation,
                "Group details updated successfully!"
            )
        );
    } catch (error) {
        throw new ApiError(500, "Failed to update group details!");
    }
});

export {
    getConversations,
    getConversationDetails,
    getConversationMessages,
    startConversation,
    updateGroupDetails,
};
