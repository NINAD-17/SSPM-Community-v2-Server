import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Connection } from "../models/connection.model.js";
import mongoose from "mongoose";

const sendConnectionRequest = asyncHandler(async (req, res, next) => {
    const { recipientId } = req.params;
    const requesterId = req.user._id;

    if(recipientId.toString() === requesterId.toString()) {
        throw new ApiError(400, "Cannot send connection request to yourself!");
    }

    // Check if connection already exists
    const existingConnection = await Connection.findOne({
        requester: requesterId,
        recipient: recipientId,
    });

    if (existingConnection) {
        if(existingConnection.status === "accepted") {
            throw new ApiError(400, "Connection already exists!");
        }
        throw new ApiError(400, "Connection request already sent!");
    }

    const newConnection = await Connection({
        requester: requesterId,
        recipient: recipientId,
        status: "pending",
    });

    try {
        await newConnection.save();

        res.status(201).json(
            new ApiResponse(
                201,
                { connection: newConnection },
                "Connection request sent successfully!"
            )
        );
    } catch (error) {
        if (error instanceof ApiError) {
            next(error);
        } else {
            next(
                new ApiError(
                    500,
                    "Failed to save connection request to the database."
                )
            );
        }
    }
});

const acceptConnectionRequest = asyncHandler(async (req, res, next) => {
    const { connectionId } = req.params;
    const userId = req.user._id;
    console.log({connectionId})

    const connection = await Connection.findById(connectionId);

    if (!connection) {
        throw new ApiError(404, "Connection request not found!");
    }

    if (connection.recipient.toString() !== userId.toString()) {
        throw new ApiError(
            403,
            "You are not authorized to accept this connection request!"
        );
    }

    if (connection.status !== "pending") {
        throw new ApiError(400, "Connection request is not pending!");
    }

    connection.status = "accepted";

    try {
        await connection.save();

        res.status(200).json(
            new ApiResponse(
                200,
                { connection },
                "Connection request accepted successfully!"
            )
        );
    } catch (error) {
        if (error instanceof ApiError) {
            next(error);
        } else {
            next(new ApiError(500, "Failed to accept connection request"));
        }
    }
});

// Delete and Reject Connection request
// Delete: if sender wants to delete (undo) the request
// Reject: if receiver wants to reject the request
const deleteConnectionRequest = asyncHandler(async (req, res, next) => {
    const { connectionId } = req.params;
    const userId = req.user._id;
    console.log({connectionId})

    const connection = await Connection.findById(connectionId);

    if (!connection) {
        throw new ApiError(404, "Connection request not found!");
    }

    if (
        connection.requester.toString() !== userId.toString() &&
        connection.recipient.toString() !== userId.toString()
    ) {
        throw new ApiError(
            403,
            "You are not authorized to delete this connection request!"
        );
    }

    try {
        await Connection.findByIdAndDelete(connectionId);

        res.status(200).json(
            new ApiResponse(
                200,
                { connectionId, isRejected: true },
                "Connection request deleted/rejected successfully!"
            )
        );
    } catch (error) {
        console.log(error)
        if (error instanceof ApiError) {
            next(error);
        } else {
            next(
                new ApiError(500, "Failed to delete/reject connection request!")
            );
        }
    }
});

const removeConnection = asyncHandler(async (req, res, next) => {
    const { connectionId } = req.params;
    const userId = req.user._id;

    const connection = await Connection.findById(connectionId);
    console.log(connectionId, connection);

    if (!connection) {
        throw new ApiError(404, "Connection not found!");
    }

    console.log(userId, connection.requester, connection.recipient);

    if (
        connection.requester.toString() !== userId.toString() &&
        connection.recipient.toString() !== userId.toString()
    ) {
        throw new ApiError(
            403,
            "You are not authorized to delete this connection!"
        );
    }

    try {
        await Connection.findByIdAndDelete(connectionId);

        res.status(200).json(
            new ApiResponse(
                200,
                { connectionId, isRemoved: true },
                "Connection removed successfully!"
            )
        );
    } catch (error) {
        if (error instanceof ApiError) {
            next(error);
        } else {
            next(new ApiError(500, "Failed to remove connection"));
        }
    }
});

const getConnections = asyncHandler(async (req, res, next) => {
    const userId = req.user._id;

    try {
        const connections = await Connection.aggregate([
            {
                $match: {
                    $or: [
                        { requester: userId, status: "accepted" },
                        { recipient: userId, status: "accepted" },
                    ],
                },
            },
            {
                $lookup: {
                    from: "users",
                    localField: "requester",
                    foreignField: "_id",
                    as: "requesterDetails",
                },
            },
            {
                $lookup: {
                    from: "users",
                    localField: "recipient",
                    foreignField: "_id",
                    as: "recipientDetails",
                },
            },
            {
                $unwind: "$requesterDetails",
            },
            {
                $unwind: "$recipientDetails",
            },
            {
                $project: {
                    _id: 1,
                    status: 1,
                    "user._id": {
                        $cond: {
                            if: { $eq: ["$requester", userId] },
                            then: "$recipientDetails._id",
                            else: "$requesterDetails._id",
                        },
                    },
                    "user.firstName": {
                        $cond: {
                            if: { $eq: ["$requester", userId] },
                            then: "$recipientDetails.firstName",
                            else: "$requesterDetails.firstName",
                        },
                    },
                    "user.lastName": {
                        $cond: {
                            if: { $eq: ["$requester", userId] },
                            then: "$recipientDetails.lastName",
                            else: "$requesterDetails.lastName",
                        },
                    },
                    "user.email": {
                        $cond: {
                            if: { $eq: ["$requester", userId] },
                            then: "$recipientDetails.email",
                            else: "$requesterDetails.email",
                        },
                    },
                    "user.avatar": {
                        $cond: {
                            if: { $eq: ["$requester", userId] },
                            then: "$recipientDetails.avatar",
                            else: "$requesterDetails.avatar",
                        },
                    },
                },
            },
        ]);

        if (!connections.length) {
            res.status(200).json(
                new ApiResponse(
                    200,
                    { connections: [] },
                    "No connections found!"
                )
            );
        }

        res.status(200).json(
            new ApiResponse(
                200,
                { connections },
                "Connections fetched successfully!"
            )
        );
    } catch (error) {
        if (error instanceof ApiError) {
            next(error);
        } else {
            next(
                new ApiError(
                    500,
                    "Something went wrong while fetching connections!"
                )
            );
        }
    }
});

const getPendingConnectionRequests = asyncHandler(async (req, res, next) => {
    const userId = req.user._id;

    try {
        const requests = await Connection.aggregate([
            {
                $match: {
                    recipient: new mongoose.Types.ObjectId(userId),
                    status: "pending",
                },
            },
            {
                $lookup: {
                    from: "users",
                    localField: "requester",
                    foreignField: "_id",
                    as: "requesterDetails",
                },
            },
            {
                $unwind: "$requesterDetails",
            },
            {
                $project: {
                    _id: 1,
                    status: 1,
                    "user.firstName": "$requesterDetails.firstName",
                    "user.lastName": "$requesterDetails.lastName",
                    "user.email": "$requesterDetails.email",
                    "user.avatar": "$requesterDetails.avatar",
                    "user._id": "$requesterDetails._id",
                    "user.headline": "$requesterDetails.headline",
                    "user.currentlyWorkingAt": "$requesterDetails.currentlyWorkingAt"
                },
            },
        ]);

        if (!requests.length) {
            res.status(200).json(
                new ApiResponse(
                    200,
                    { pendingRequests: [] },
                    "No pending connection requests found!"
                )
            );
        }

        res.status(200).json(
            new ApiResponse(
                200,
                { pendingRequests: requests },
                "Pending connections fetched successfully!"
            )
        );
    } catch (error) {
        if (error instanceof ApiError) {
            next(error);
        } else {
            next(
                new ApiError(
                    500,
                    "Something went wrong while fetching connections!"
                )
            );
        }
    }
});

const getInvitationsSentByUser = asyncHandler(async (req, res, next) => {
    const userId = req.user._id;

    try {
        const invitations = await Connection.aggregate([
            {
                $match: {
                    requester: new mongoose.Types.ObjectId(userId),
                    status: "pending",
                },
            },
            {
                $lookup: {
                    from: "users",
                    localField: "recipient",
                    foreignField: "_id",
                    as: "recipientDetails",
                },
            },
            {
                $unwind: "$recipientDetails",
            },
            {
                $project: {
                    _id: 1,
                    status: 1,
                    "user._id": "$recipientDetails._id",
                    "user.firstName": "$recipientDetails.firstName",
                    "user.lastName": "$recipientDetails.lastName",
                    "user.email": "$recipientDetails.email",
                    "user.avatar": "$recipientDetails.avatar",
                },
            },
        ]);

        if (!invitations.length) {
            res.status(200).json(
                new ApiResponse(
                    200,
                    { invitations: [] },
                    "No pending connection invitations found!"
                )
            );
        }

        res.status(200).json(
            new ApiResponse(
                200,
                { invitations },
                "Pending connection invitations fetched successfully!"
            )
        );
    } catch (error) {
        if (error instanceof ApiError) {
            next(error);
        } else {
            next(
                new ApiError(
                    500,
                    "Something went wrong while fetching invitations!"
                )
            );
        }
    }
});

const checkConnectionStatus = asyncHandler(async (req, res, next) => {
    const currentUserId = req.user._id;
    const { targetUserId } = req.params;

    if(currentUserId.toString() === targetUserId.toString()) {
        throw new ApiError(400, "Cannot check connection status with yourself!");
    }

    try {
        const connection = await Connection.findOne({
            $or: [
                { requester: currentUserId, recipient: targetUserId },
                { requester: targetUserId, recipient: currentUserId },
            ],
        });

        if (!connection) {
            return res
                .status(200)
                .json(
                    new ApiResponse(
                        200,
                        { isConnected: false, status: null },
                        "Not connected"
                    )
                );
        }

        // check if,
        //  1) user is connected
        //  2) user has pending connection request ( target user has not responded yet on the request )
        //  3) user has not responded to the target user's request ( accept or reject the request )
        let statusDetail = {
            isConnected: false,
            status: connection.status,
            isRequester: false,
            isRecipient: false,
        };

        if (connection.status === "accepted") {
            statusDetail.isConnected = true;
        } else if (connection.status === "pending") {
            if (connection.requester.toString() === currentUserId.toString()) {
                statusDetail.isRequester = true; // Current user sent the request
            } else {
                statusDetail.isRecipient = true; // Current user received the request
            }
        }

        res.status(200).json(
            new ApiResponse(
                200,
                statusDetail,
                "Connection status retrieved successfully!"
            )
        );
    } catch (error) {
        if(error instanceof ApiError) {
            next(error);
        } else {
            next(new ApiError(
                500,
                "Something went wrong while checking connection status!"
            ));
        }
    }
});

// const getMutualConnection = asyncHandler(async(req, res) => {
//     const currentUserId = req.user._id;
//     const { targetUserId } = req.params;

//     try {
//         const mutualConnections = await Connection.aggregate([
//             {
//                 $match: {
//                     $or: [
//                         { requester: currentUserId, status: "accepted" },
//                         { recipient: currentUserId, status: "accepted" },
//                     ],
//                 },
//             },
//             {
//                 $lookup: {
//                     from: "connections",
//                     let: { userId: targetUserId },
//                     pipeline: [
//                         {
//                             $match: {
//                                 $expr: {
//                                     $and: [
//                                         {
//                                             $or: [
//                                                 { requester: "$$userId" },
//                                                 { recipient: "$$userId" },
//                                             ],
//                                         },
//                                         { status: "accepted" },
//                                     ],
//                                 },
//                             },
//                         },
//                     ],
//                     as: "mutualConnections",
//                 },
//             },
//             {
//                 $unwind: "$mutualConnections",
//             },
//             {
//                 $lookup: {
//                     from: "users",
//                     localField: "mutualConnections.requester",
//                     foreignField: "_id",
//                     as: "requesterDetails",
//                 },
//             },
//             {
//                 $lookup: {
//                     from: "users",
//                     localField: "mutualConnections.recipient",
//                     foreignField: "_id",
//                     as: "recipientDetails",
//                 },
//             },
//             {
//                 $unwind: "$requesterDetails",
//             },
//             {
//                 $unwind: "$recipientDetails",
//             },
//             {
//                 $project: {
//                     _id: 1,
//                     status: 1,
//                     "user.firstName": {
//                         $cond: {
//                             if: { $eq: ["$requester", currentUserId] },
//                             then: "$recipientDetails.firstName",
//                             else: "$requesterDetails.firstName",
//                         },
//                     },
//                     "user.lastName": {
//                         $cond: {
//                             if: { $eq: ["$requester", currentUserId] },
//                             then: "$recipientDetails.lastName",
//                             else: "$requesterDetails.lastName",
//                         },
//                     },
//                     "user.email": {
//                         $cond: {
//                             if: { $eq: ["$requester", currentUserId] },
//                             then: "$recipientDetails.email",
//                             else: "$requesterDetails.email",
//                         },
//                     },
//                     "user.avatar": {
//                         $cond: {
//                             if: { $eq: ["$requester", currentUserId] },
//                             then: "$recipientDetails.avatar",
//                             else: "$requesterDetails.avatar",
//                         },
//                     },
//                 },
//             },
//             {
//                 $count: "totalCount",
//             },
//         ]);

//         if (!mutualConnections.length) {
//             return res.status(200).json(
//                 new ApiResponse(200, { connections: [], totalCount: 0 }, "No mutual connections found!")
//             );
//         }

//         res.status(200).json(
//             new ApiResponse(
//                 200,
//                 { connections: mutualConnections, totalCount: mutualConnections.length },
//                 "Mutual connections fetched successfully!"
//             )
//         );
//     } catch (error) {
//         throw new ApiError(500, "Failed to get mutual connections.");

//     }
// })

const getMutualConnection = asyncHandler(async (req, res) => {
    const currentUserId = req.user._id;
    const { targetUserId } = req.params;

    try {
        const mutualConnections = await Connection.aggregate([
            // Match the current user's accepted connections
            {
                $match: {
                    $or: [
                        { requester: currentUserId, status: "accepted" },
                        { recipient: currentUserId, status: "accepted" },
                    ],
                },
            },
            // Lookup target user's accepted connections
            {
                $lookup: {
                    from: "connections",
                    let: { currentUserId: "$_id", targetUserId: targetUserId },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$status", "accepted"] },
                                        {
                                            $or: [
                                                {
                                                    $eq: [
                                                        "$requester",
                                                        "$$targetUserId",
                                                    ],
                                                },
                                                {
                                                    $eq: [
                                                        "$recipient",
                                                        "$$targetUserId",
                                                    ],
                                                },
                                            ],
                                        },
                                    ],
                                },
                            },
                        },
                    ],
                    as: "mutualConnections",
                },
            },
            // Filter connections that are common between both users
            {
                $match: {
                    $expr: {
                        $gt: [{ $size: "$mutualConnections" }, 0],
                    },
                },
            },
            // Unwind the mutualConnections array
            {
                $unwind: "$mutualConnections",
            },
            // Lookup user details
            {
                $lookup: {
                    from: "users",
                    localField: "mutualConnections.requester",
                    foreignField: "_id",
                    as: "requesterDetails",
                },
            },
            {
                $lookup: {
                    from: "users",
                    localField: "mutualConnections.recipient",
                    foreignField: "_id",
                    as: "recipientDetails",
                },
            },
            {
                $unwind: "$requesterDetails",
            },
            {
                $unwind: "$recipientDetails",
            },
            // Project the required fields
            {
                $project: {
                    _id: 1,
                    status: 1,
                    "user.firstName": {
                        $cond: {
                            if: { $eq: ["$requester", currentUserId] },
                            then: "$recipientDetails.firstName",
                            else: "$requesterDetails.firstName",
                        },
                    },
                    "user.lastName": {
                        $cond: {
                            if: { $eq: ["$requester", currentUserId] },
                            then: "$recipientDetails.lastName",
                            else: "$requesterDetails.lastName",
                        },
                    },
                    "user.email": {
                        $cond: {
                            if: { $eq: ["$requester", currentUserId] },
                            then: "$recipientDetails.email",
                            else: "$requesterDetails.email",
                        },
                    },
                    "user.avatar": {
                        $cond: {
                            if: { $eq: ["$requester", currentUserId] },
                            then: "$recipientDetails.avatar",
                            else: "$requesterDetails.avatar",
                        },
                    },
                },
            },
        ]);

        if (!mutualConnections.length) {
            return res
                .status(200)
                .json(
                    new ApiResponse(
                        200,
                        { mutualConnections: [], totalCount: 0 },
                        "No mutual connections found!"
                    )
                );
        }

        res.status(200).json(
            new ApiResponse(
                200,
                {
                    mutualConnections,
                    totalCount: mutualConnections.length,
                },
                "Mutual connections fetched successfully!"
            )
        );
    } catch (error) {
        if(error instanceof ApiError) {
            next(error);
        } else {
            next(new ApiError(500, "Failed to get mutual connections."));
        }
    }
});

export {
    sendConnectionRequest,
    acceptConnectionRequest,
    deleteConnectionRequest,
    removeConnection,
    getConnections,
    getMutualConnection,
    getPendingConnectionRequests,
    getInvitationsSentByUser,
    checkConnectionStatus,
};
