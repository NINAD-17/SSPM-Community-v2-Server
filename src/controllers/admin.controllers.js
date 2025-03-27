import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import InactiveUserService from "../services/inactiveUsers.service.js";
import SchedulerService from "../services/scheduler.service.js";

/**
 * Controller to get a list of inactive users
 * 
 * @route GET /api/v2/admin/inactive-users
 * @access Admin only
 */
export const getInactiveUsers = asyncHandler(async (req, res) => {
    // Parse pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Get inactivity threshold date
    const inactivityThreshold = new Date();
    inactivityThreshold.setDate(inactivityThreshold.getDate() - InactiveUserService.INACTIVITY_THRESHOLD_DAYS);
    
    // Find inactive users with pagination
    const inactiveUsers = await User.find({
        lastActive: { $lt: inactivityThreshold },
        isAdmin: false // Exclude admins from the list
    })
    .select('_id firstName lastName email lastActive lastNotificationSent')
    .sort({ lastActive: 1 }) // Sort by least recently active first
    .skip(skip)
    .limit(limit);
    
    // Get total count for pagination
    const totalInactiveUsers = await User.countDocuments({
        lastActive: { $lt: inactivityThreshold },
        isAdmin: false
    });
    
    // Calculate pagination data
    const totalPages = Math.ceil(totalInactiveUsers / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    return res.status(200).json(
        new ApiResponse(
            200,
            {
                inactiveUsers,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalItems: totalInactiveUsers,
                    hasNextPage,
                    hasPrevPage
                },
                inactivityThresholdDays: InactiveUserService.INACTIVITY_THRESHOLD_DAYS
            },
            "Inactive users fetched successfully"
        )
    );
});

/**
 * Controller to send notifications to inactive users manually
 * 
 * @route POST /api/v2/admin/inactive-users/notify
 * @access Admin only
 */
export const sendInactiveUserNotifications = asyncHandler(async (req, res) => {
    // If specific user IDs are provided, only notify those users
    const { userIds } = req.body;
    
    let result;
    
    if (userIds && Array.isArray(userIds) && userIds.length > 0) {
        // Get the specified users
        const users = await User.find({
            _id: { $in: userIds },
            isAdmin: false // Ensure we're not notifying admins
        }).select('_id email firstName lastName lastActive');
        
        // Send notifications to the selected users
        if (users.length > 0) {
            await InactiveUserService.sendNotificationsBatch(users);
            result = { notifiedCount: users.length, targetedNotification: true };
        } else {
            throw new ApiError(404, "No valid users found with the provided IDs");
        }
    } else {
        // Trigger the regular inactive user notification process
        result = await SchedulerService.runInactiveUserNotificationsManually();
    }
    
    return res.status(200).json(
        new ApiResponse(
            200,
            result,
            "Inactive user notifications triggered successfully"
        )
    );
});

/**
 * Get statistics about user activity
 * 
 * @route GET /api/v2/admin/user-activity-stats
 * @access Admin only
 */
export const getUserActivityStats = asyncHandler(async (req, res) => {
    // Define time periods for statistics
    const periodsInDays = [7, 14, 30, 90];
    const stats = {};
    const now = new Date();
    
    console.log("stats");
    // Calculate the count for each period
    for (const days of periodsInDays) {
        const date = new Date(now);
        date.setDate(date.getDate() - days);
        
        stats[`inactive${days}Days`] = await User.countDocuments({
            lastActive: { $lt: date },
            isAdmin: false
        });
    }
    
    // Get total user count (excluding admins)
    stats.totalUsers = await User.countDocuments({ isAdmin: false });
    
    // Count users with no activity record
    stats.noActivityRecord = await User.countDocuments({ 
        lastActive: { $exists: false },
        isAdmin: false
    });
    
    // Count users who were notified in the last 30 days
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    stats.recentlyNotified = await User.countDocuments({
        lastNotificationSent: { $gt: thirtyDaysAgo },
        isAdmin: false
    });
    
    return res.status(200).json(
        new ApiResponse(
            200,
            { stats },
            "User activity statistics fetched successfully"
        )
    );
}); 