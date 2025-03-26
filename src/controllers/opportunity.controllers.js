import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import Opportunity from "../models/opportunity.model.js";

const createOpportunity = asyncHandler(async (req, res) => {
    const {
        title,
        description,
        category,
        date,
        location,
        applicationLink,
        contactInfo,
        tags,
    } = req.body;
    const postedBy = req.user._id;

    try {
        const opportunity = new Opportunity({
            title,
            description,
            category,
            date,
            location,
            applicationLink,
            contactInfo,
            tags,
            postedBy,
        });

        await opportunity.save();

        res.status(201).json(
            new ApiResponse(
                201,
                opportunity,
                "Opportunity created successfully!"
            )
        );
    } catch (error) {
        throw new ApiError(500, "Failed to create opportunity!");
    }
});

const editOpportunity = asyncHandler(async (req, res) => {
    const { opportunityId } = req.params;
    const updates = req.body;
    const userId = req.user._id;

    try {
        const opportunity = await Opportunity.findById(opportunityId);
        if (!opportunity) {
            throw new ApiError(404, "Opportunity not found!");
        }

        if (opportunity.postedBy.toString() !== userId.toString()) {
            throw new ApiError(403, "Unauthorized to edit this opportunity!");
        }

        Object.keys(updates).forEach((key) => {
            if (updates[key] !== undefined) {
                opportunity[key] = updates[key];
            }
        });

        await opportunity.save();

        res.status(200).json(
            new ApiResponse(
                200,
                opportunity,
                "Opportunity updated successfully!"
            )
        );
    } catch (error) {
        throw new ApiError(500, "Failed to update opportunity!");
    }
});

const deleteOpportunity = asyncHandler(async (req, res) => {
    const { opportunityId } = req.params;
    const userId = req.user._id;
    const { reason } = req.body; // Optional reason for deletion

    try {
        const opportunity = await Opportunity.findById(opportunityId);
        if (!opportunity) {
            throw new ApiError(404, "Opportunity not found!");
        }

        if (
            opportunity.postedBy.toString() !== userId.toString() &&
            !req.user.isAdmin
        ) {
            throw new ApiError(403, "Unauthorized to delete this opportunity!");
        }

        opportunity.status = "Deleted";
        opportunity.deletedReason =
            reason || "This post has been removed by the admin.";
        await opportunity.save();

        res.status(200).json(
            new ApiResponse(
                200,
                opportunity,
                "Opportunity deleted successfully!"
            )
        );
    } catch (error) {
        throw new ApiError(500, "Failed to delete opportunity!");
    }
});

const getAllOpportunities = asyncHandler(async (req, res) => {
    try {
        const opportunities = await Opportunity.aggregate([
            {
                $match: {
                    status: "Active",
                },
            },
            {
                $sort: {
                    createdAt: -1
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "postedBy",
                    foreignField: "_id",
                    as: "postedBy",
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
                $addFields: {
                    postedBy: { $arrayElemAt: ["$postedBy", 0] },
                },
            },
        ]);

        if (opportunities.length === 0) {
            return res
                .status(200)
                .json(new ApiResponse(200, [], "No opportunities found!"));
        }

        res.status(200).json(
            new ApiResponse(
                200,
                opportunities,
                "All opportunities retrieved successfully!"
            )
        );
    } catch (error) {
        throw new ApiError(500, "Failed to retrieve opportunities");
    }
});

const getOpportunityById = asyncHandler(async (req, res) => {
    const { opportunityId } = req.params;
    const userId = req.user._id;

    try {
        const opportunity = await Opportunity.aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(opportunityId),
                    status: "Active",
                },
            },
            {
                $sort: {
                    createdAt: -1
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "postedBy",
                    foreignField: "_id",
                    as: "postedBy",
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
                $addFields: {
                    postedBy: { $arrayElemAt: ["$postedBy", 0] },
                },
            },
            // TODO: add code to fetch comments and likes
        ]);

        if (!opportunity) {
            throw new ApiError(404, "Opportunity not found!");
        }

        res.status(200).json(
            new ApiResponse(
                200,
                opportunity[0],
                "Opportunity retrieved successfully!"
            )
        );
    } catch (error) {
        throw new ApiError(500, "Failed to retrieve opportunity");
    }
});

const getOpportunitiesByUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    try {
        const opportunities = await Opportunity.aggregate([
            {
                $match: {
                    postedBy: new mongoose.Types.ObjectId(userId),
                    status: "Active",
                },
            },
            {
                $lookup: {
                    from: "users",
                    localField: "postedBy",
                    foreignField: "_id",
                    as: "postedBy",
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
                $addFields: {
                    postedBy: { $arrayElemAt: ["$postedBy", 0] },
                },
            },
        ]);

        if (opportunities.length === 0) {
            return res
                .status(200)
                .json(new ApiResponse(200, [], "No opportunities found!"));
        }

        res.status(200).json(
            new ApiResponse(
                200,
                opportunities,
                "Opportunities retrieved successfully!"
            )
        );
    } catch (error) {
        throw new ApiError(500, "Failed to retrieve opportunities");
    }
});

const getOpportunitiesByCategory = asyncHandler(async (req, res) => {
    const { category } = req.params;

    try {
        const opportunities = await Opportunity.aggregate([
            {
                $match: {
                    category,
                    status: "Active",
                },
            },
            {
                $lookup: {
                    from: "users",
                    localField: "postedBy",
                    foreignField: "_id",
                    as: "postedBy",
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
                $addFields: {
                    postedBy: { $arrayElemAt: ["$postedBy", 0] },
                },
            },
        ]);

        if (opportunities.length === 0) {
            return res
                .status(200)
                .json(
                    new ApiResponse(
                        200,
                        [],
                        "No opportunities found for this category!"
                    )
                );
        }

        res.status(200).json(
            new ApiResponse(
                200,
                opportunities,
                "Opportunities retrieved successfully!"
            )
        );
    } catch (error) {
        throw new ApiError(500, "Failed to fetch opportunities by category");
    }
});

export {
    createOpportunity,
    editOpportunity,
    deleteOpportunity,
    getAllOpportunities,
    getOpportunityById,
    getOpportunitiesByUser,
    getOpportunitiesByCategory,
};
