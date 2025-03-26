import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import recommendationService from "../services/recommendationService.js";
import {User} from "../models/user.model.js";
import Group from "../models/group.model.js";
import mongoose from "mongoose";
import Membership from "../models/groupMembership.model.js";

const getRecommendedGroups = asyncHandler(async (req, res) => {
    try {
        // Get user's skills and interests from their profile
        const userId = req.user._id;
        const user = await User.findById(userId).select('skills');
        
        // Get groups the user is already a member of
        const userMemberships = await Membership.find({
            userId: userId,
            status: "approved"
        }).select("groupId");
        
        const userGroupIds = userMemberships.map(membership => 
            new mongoose.Types.ObjectId(membership.groupId)
        );
        
        // Safely construct the match condition
        const matchStage = {};
        
        // Only add the $nin condition if there are groups to exclude
        if (userGroupIds.length > 0) {
            matchStage._id = { $nin: userGroupIds };
        }
        
        // Add skills/interests match only if user has any
        const userSkills = user.skills || [];
        const userInterests = user.interests || [];
        
        if (userSkills.length > 0 || userInterests.length > 0) {
            const orConditions = [];
            
            if (userSkills.length > 0) {
                orConditions.push({ skills: { $in: userSkills } });
            }
            
            if (userInterests.length > 0) {
                orConditions.push({ category: { $in: userInterests } });
            }
            
            if (orConditions.length > 0) {
                matchStage.$or = orConditions;
            }
        }
        
        // Perform the aggregation with safer match conditions
        const recommendedGroups = await Group.aggregate([
            {
                $match: matchStage
            },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    avatarImg: 1,
                    category: 1,
                    skills: 1,
                    description: 1,
                    visibility: 1
                }
            },
            {
                $sort: { createdAt: -1 } // Sort by newest first as a fallback
            },
            {
                $limit: 5 // Limit to 5 recommendations
            }
        ]);

        // If not enough recommendations, add some popular groups
        if (recommendedGroups.length < 5) {
            // Safely prepare IDs to exclude
            const idsToExclude = [
                ...userGroupIds,
                ...recommendedGroups.map(g => new mongoose.Types.ObjectId(g._id))
            ];
            
            // Create a safe match condition for popular groups
            const popularMatchStage = {};
            
            if (idsToExclude.length > 0) {
                popularMatchStage._id = { $nin: idsToExclude };
            }
            
            const popularGroups = await Group.aggregate([
                {
                    $match: popularMatchStage
                },
                {
                    $project: {
                        _id: 1,
                        name: 1,
                        avatarImg: 1,
                        category: 1,
                        skills: 1,
                        description: 1,
                        visibility: 1
                    }
                },
                {
                    $sort: { createdAt: -1 }
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
        console.error("Error in getRecommendedGroups:", error);
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

    try {
        const recommendations = await recommendationService.getRecommendationsBySkills(skills);
        console.log('Controller received recommendations:', recommendations);

        res.status(200).json(
            new ApiResponse(
                200,
                recommendations,
                "Recommendations by skills fetched successfully"
            )
        );
    } catch (error) {
        console.error("Error in getRecommendationsBySkills:", error);
        throw new ApiError(500, `Failed to get skill recommendations: ${error.message}`);
    }
});

export {
    getRecommendedGroups,
    getRecommendationsBySkills
}; 