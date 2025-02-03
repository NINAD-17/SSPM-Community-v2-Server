import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import recommendationService from "../services/recommendationService.js";
import {User} from "../models/user.model.js";
import Group from "../models/group.model.js";

const getRecommendedGroups = asyncHandler(async (req, res) => {
    try {
        // Get user's skills and interests from their profile
        const userId = req.user._id;
        const user = await User.findById(userId).select('skills interests');
        
        // Aggregate pipeline to find matching groups
        const recommendedGroups = await Group.aggregate([
            {
                $match: {
                    // Exclude groups user is already a member of
                    members: { $ne: userId },
                    // Match groups with similar skills/category
                    $or: [
                        { skills: { $in: user.skills || [] } },
                        { category: { $in: user.interests || [] } }
                    ]
                }
            },
            {
                $project: {
                    name: 1,
                    avatarImg: 1,
                    category: 1,
                    skills: 1,
                    membersCount: { $size: "$members" }
                }
            },
            {
                $sort: { membersCount: -1 } // Sort by most members first
            },
            {
                $limit: 5 // Limit to 5 recommendations
            }
        ]);

        // If not enough recommendations, add some popular groups
        if (recommendedGroups.length < 5) {
            const popularGroups = await Group.aggregate([
                {
                    $match: {
                        members: { $ne: userId },
                        _id: { $nin: recommendedGroups.map(g => g._id) }
                    }
                },
                {
                    $project: {
                        name: 1,
                        avatarImg: 1,
                        category: 1,
                        skills: 1,
                        membersCount: { $size: "$members" }
                    }
                },
                {
                    $sort: { membersCount: -1 }
                },
                {
                    $limit: 5 - recommendedGroups.length
                }
            ]);

            recommendedGroups.push(...popularGroups);
        }

        return res.status(200).json(
            new ApiResponse(
                200,
                { recommendations: recommendedGroups },
                "Group recommendations fetched successfully"
            )
        );
    } catch (error) {
        throw new ApiError(500, "Failed to get group recommendations");
    }
});

// Get recommendations based on specific skills
const getRecommendationsBySkills = asyncHandler(async (req, res) => {
    const { skills } = req.body;
    console.log('Getting recommendations for skills:', skills);

    if (!skills || !Array.isArray(skills) || skills.length === 0) {
        throw new ApiError(400, "Skills array is required");
    }

    const recommendations = await recommendationService.getRecommendationsBySkills(skills);
    console.log('Controller received recommendations:', recommendations);

    res.status(200).json(
        new ApiResponse(
            200,
            recommendations,
            "Recommendations by skills fetched successfully"
        )
    );
});

export {
    getRecommendedGroups,
    getRecommendationsBySkills
}; 