import MLService from '../ml/service.js';
import { User } from '../models/user.model.js';
import Group from '../models/group.model.js';
import { ApiError } from '../utils/apiError.js';

class RecommendationService {
    async getGroupRecommendations(userId) {
        try {
            // Get user skills from database
            const user = await User.findById(userId).select('skills');
            console.log('User Skills:', user?.skills);
            
            if (!user || !user.skills || user.skills.length === 0) {
                throw new ApiError(400, "User has no skills defined");
            }
            
            return await this.getRecommendationsBySkills(user.skills);
        } catch (error) {
            console.error('Recommendation error:', error);
            throw error;
        }
    }

    async getRecommendationsBySkills(skills) {
        try {
            console.log('Getting recommendations for skills:', skills);
            
            // Get recommendations from ML model
            const recommendations = await MLService.getRecommendations(skills);
            console.log('ML Model Recommendations:', recommendations);
            
            // Get categories from recommendations
            const categories = recommendations.map(rec => rec.category);
            console.log('Categories to search for:', categories);
            
            // Find groups matching these categories
            const groups = await Group.find({ 
                category: { $in: categories },
                visibility: "public"
            })
            .populate('admins', 'username avatar')
            .select('-members')
            .limit(5);
            
            console.log('Found Groups:', groups);
            
            if (groups.length === 0) {
                console.log('No groups found for categories:', categories);
                return [];
            }
            
            // Combine group details with prediction probabilities
            const recommendedGroups = groups.map(group => {
                const recommendation = recommendations.find(rec => rec.category === group.category);
                return {
                    ...group.toObject(),
                    matchProbability: recommendation ? recommendation.probability : 0
                };
            });

            console.log('Final Recommendations:', recommendedGroups);
            return recommendedGroups;
        } catch (error) {
            console.error('Recommendation by skills error:', error);
            throw error;
        }
    }
}

export default new RecommendationService(); 