import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import UserPost from "../models/userpost.model.js";
import Report from "../models/report.model.js";

const reportPost = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const { postType, reason, message } = req.body;
    const userId = req.user._id;

    try {
        const report = await Report.create({
            postId,
            postType,
            reportedBy: userId,
            message,
            reason,
        });

        res.status(200).json(
            new ApiResponse(200, report, "Post reported successfully!")
        );
    } catch (error) {
        throw new ApiError(500, "Failed to report post.");
    }
});

const getReportedPosts = asyncHandler(async (req, res) => {
    const { postType } = req.params;

    const matchedStage = {
        status: "pending",
    };

    if (postType !== "all") {
        matchedStage.postType = postType;
    }

    try {
        const reports = await Report.aggregate([
            {
                $match: matchedStage,
            },
            {
                $lookup: {
                    from: "userposts",
                    localField: "postId",
                    foreignField: "_id",
                    as: "post",
                    pipeline: [
                        {
                            $lookup: {
                                from: "users",
                                localField: "post.userId",
                                foreignField: "_id",
                                as: "user",
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
                                user: { $arrayElemAt: ["$user", 0] },
                            },
                        },
                    ],
                },
            },
            {
                $addFields: {
                    post: { $arrayElemAt: ["$post", 0] },
                },
            },
        ]);

        if (reports.length === 0) {
            res.status(200).json(
                new ApiResponse(200, [], "No reported posts found.")
            );
        }

        res.status(200).json(
            new ApiResponse(
                200,
                reports,
                "Reported posts fetched successfully."
            )
        );
    } catch (error) {
        throw new ApiError(500, "Failed to fetch reported posts!");
    }
});

const reviewReport = asyncHandler(async (req, res) => {
    const { reportId } = req.params;

    try {
        const report = await Report.findById(reportId);

        if (!report) {
            throw new ApiError(404, "Report not found.");
        }

        await UserPost.findByIdAndDelete(report.postId);

        report.status = "reviewed";
        await report.save();

        res.status(200).json(
            new ApiResponse(
                200,
                {},
                "Post deleted and report marked as reviewed"
            )
        );
    } catch (error) {
        throw new ApiError(500, "Failed to review report");
    }
});

export { reportPost, getReportedPosts, reviewReport };
