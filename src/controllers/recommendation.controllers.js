import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import recommendationService from "../services/recommendationService.js";

const getRecommendedGroups = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    console.log('Getting recommendations for user:', userId);

    const recommendations = await recommendationService.getGroupRecommendations(userId);
    console.log('Controller received recommendations:', recommendations);
    
    if (!recommendations || recommendations.length === 0) {
        console.log('No recommendations found');
        return res.status(200).json(
            new ApiResponse(200, [], "No recommendations found")
        );
    }

    res.status(200).json(
        new ApiResponse(
            200,
            recommendations,
            "Group recommendations fetched successfully"
        )
    );
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