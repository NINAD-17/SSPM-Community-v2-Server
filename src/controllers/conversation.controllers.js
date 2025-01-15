import ApiError from "../utils/apiError";
import ApiResponse from "../utils/apiResponse";
import asyncHandler from "../utils/asyncHandler";
import { Conversation } from "../models/conversation.model.js";
import { Message } from "../models/message.model.js";

const getConversations = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    try {
        const conversations = await Conversation.aggregate([
            {
                $match: {
                    participants: { $in: [userId] },
                },
            },
            {
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
                            },
                        },
                    ],
                },
            },
            // Sort conversations by updatedAt field in descending order (most recent first)
            {
                $sort: {
                    updatedAt: -1, // -1 for descending order, 1 for ascending order
                },
            },
            {
                $unwind: {
                    path: "$lastMessage",
                    preserveNullAndEmptyArrays: true, // Ensure conversations without messages are included
                },
            },
            {
                $project: {
                    _id: 1,
                    isGroupChat: 1,
                    groupName: 1,
                    participants: {
                        firstName: 1,
                        lastName: 1,
                        avatar: 1,
                    },
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
                    updatedAt: 1,
                },
            },
        ]);

        if (!conversations) {
            res.status(200).json(
                new ApiResponse(200, [], "No conversations found.")
            );
        }

        // format the conversations
        const formattedConversations = conversations.map((conversation) => {
            let title = "";
            if (conversation.isGroupChat) {
                title = conversation.groupName;
            } else {
                const otherParticipant = conversation.participants.find(
                    (participant) =>
                        participant._id.toString() !== userId.toString()
                );
                title = `${otherParticipant.firstName} ${otherParticipant.lastName}`;
            }

            return {
                _id: conversation._id,
                title,
                isGroupChat: conversation.isGroupChat,
                groupName: conversation.groupName,
                lastMessage: conversation.lastMessage,
                updatedAt: conversation.updatedAt,
            };
        });

        res.status(200).json(
            new ApiResponse(
                200,
                formattedConversations,
                "Conversations retrieved successfully."
            )
        );
    } catch (error) {
        throw new ApiError(500, "Failed to get conversations!");
    }
});

const getConversationDetails = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const userId = req.user._id;

    try {
        const conversation = await Conversation.aggregate([
            {
                $match: conversationId,
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
                    isGroupChat: 1,
                    groupName: {
                        $cond: {
                            if: "$isGroupChat",
                            then: "$groupName",
                            else: "$$REMOVE",
                        },
                    },
                    groupDescription: {
                        $cond: {
                            if: "$isGroupChat",
                            then: "$groupDescription",
                            else: "$$REMOVE",
                        },
                    },
                    participants: 1,
                    admins: {
                        $cond: {
                            if: "$isGroupChat",
                            then: "$admins",
                            else: "$$REMOVE",
                        },
                    },
                },
            },
        ]);

        if (!conversation.length) {
            throw new ApiError(404, "Conversation not found!");
        }

        if (
            !conversation.participants.some((participant) =>
                participant._id.equals(userId)
            )
        ) {
            throw new ApiError(
                403,
                "You are not authorized to access this conversation!"
            );
        }

        res.status(200).json(
            new ApiResponse(
                200,
                conversation[0],
                "Conversation details retrieved successfully."
            )
        );
    } catch (error) {
        throw new ApiError(500, "Failed to get conversation!");
    }
});

const getConversationMessages = asyncHandler(async (req, res) => {
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
        throw new ApiError(500, "Failed to get conversation messages!");
    }
});

const startConversation = asyncHandler(async (req, res) => {
    const { participants, isGroupChat, groupName, groupDescription } = req.body;

    let conversation;

    if (!(participants.length > 1)) {
        throw new ApiError(
            400,
            "At least two participants are required for a chat."
        );
    }

    if (isGroupChat) {
        // create new group conversation
        conversation = new Conversation({
            participants,
            isGroupChat,
            groupName,
            groupDescription,
        });
    } else {
        // check if one to one conversation already exists
        conversation = await Conversation.findOne({
            participants: { $all: participants, $size: 2 },
        });

        if (!conversation) {
            // create new one to one conversation
            conversation = new Conversation({
                participants,
                isGroupChat: false,
            });
        }
    }

    try {
        await conversation.save();
    } catch (error) {
        throw new ApiError(500, "Failed to start conversation!");
    }
});

// modify group details and participants and admins
const updateGroupDetails = asyncHandler(async(req, res) => {
    const { conversationId } = req.params;
    const userId = req.user._id;
    const { groupName, groupDescription, participants, admins } = req.body;

    try {
        const conversation = await Conversation.findById(conversationId);

        if(!conversation.isGroupChat) {
            throw new ApiError(400, "This is not a group chat!");
        }

        if(!conversation.admins.includes(userId)) {
            throw new ApiError(403, "You are not an admin of this group!");
        }

        // groupName ? conversation.groupName = groupName : conversation.groupName;
        // participants ? conversation.participants = [...conversation.participants, ...participants] : conversation.participants;
        
        // Instead of ternary operator, for good readability used Object.assign()
        Object.assign(conversation, {
            groupName: groupName || conversation.groupName,
            groupDescription: groupDescription || conversation.groupDescription,
            participants: participants.length ? [...new Set([...conversation.participants, ...participants])] : conversation.participants, // set used to remove duplicates value. It gives {} as output so we used spread operator to put those values in an array
            admins: admins.length ? [...new Set([...conversation.admins, ...admins])] : conversation.admins
        })

        await conversation.save();

        res.status(200).json(
            new ApiResponse(200, conversation, "Group details updated successfully!")
        );
    } catch(error) {
        throw new ApiError(500, "Failed to update group details!");
    }
})

export {
    getConversations,
    getConversationDetails,
    getConversationMessages,
    startConversation,
    updateGroupDetails
};
