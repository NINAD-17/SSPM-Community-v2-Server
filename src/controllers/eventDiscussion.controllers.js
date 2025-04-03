import EventDiscussion from "../models/eventDiscussion.model.js";
import Event from "../models/event.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import mongoose from "mongoose";

// Create a new discussion or reply
export const createDiscussion = async (req, res, next) => {
    try {
        const { eventId } = req.params;
        const { content, parentId } = req.body;
        const userId = req.user._id;

        // Validate required fields
        if (!content || content.trim() === "") {
            throw new ApiError(400, "Content is required");
        }

        // Check if event exists
        const event = await Event.findById(eventId);
        if (!event) {
            throw new ApiError(404, "Event not found");
        }

        // Check if discussions are allowed for this event
        if (!event.settings.allowDiscussion) {
            throw new ApiError(403, "Discussions are not allowed for this event");
        }

        // Check visibility permissions
        const isCoordinator = event.coordinators.some(
            coordinator => coordinator.toString() === userId.toString()
        );
        const isVolunteer = event.volunteers.some(
            volunteer => volunteer.toString() === userId.toString()
        );
        const isAttendee = event.attendees.some(
            attendee => attendee.userId.toString() === userId.toString()
        ) || event.stats.going.includes(userId);

        if (event.settings.discussionVisibility === "coordinators" && !isCoordinator && req.user.role !== "admin") {
            throw new ApiError(403, "Only coordinators can participate in discussions for this event");
        }

        if (event.settings.discussionVisibility === "attendees" && !isAttendee && !isCoordinator && !isVolunteer && req.user.role !== "admin") {
            throw new ApiError(403, "Only attendees can participate in discussions for this event");
        }

        // If it's a reply, check if parent discussion exists
        if (parentId) {
            const parentDiscussion = await EventDiscussion.findOne({
                _id: parentId,
                eventId
            });
            
            if (!parentDiscussion) {
                throw new ApiError(404, "Parent discussion not found");
            }
            
            // If parent is already a reply, make this a reply to the original discussion instead
            if (parentDiscussion.parentId) {
                throw new ApiError(400, "Nested replies are not allowed. Please reply to the original discussion");
            }
        }

        // Create the discussion entry
        const discussion = await EventDiscussion.create({
            eventId,
            userId,
            content,
            parentId: parentId || null,
            isCoordinatorReply: isCoordinator
        });

        // Populate user details
        await discussion.populate("userId", "firstName lastName username profilePicture");

        // Return the created discussion
        return res.status(201).json(
            new ApiResponse(201, discussion, parentId ? "Reply added successfully" : "Discussion created successfully")
        );
    } catch (error) {
        next(error);
    }
};

// Get all discussions for an event
export const getEventDiscussions = async (req, res, next) => {
    try {
        const { eventId } = req.params;
        const { page = 1, limit = 20 } = req.query;
        const userId = req.user._id;

        // Find the event
        const event = await Event.findById(eventId);
        if (!event) {
            throw new ApiError(404, "Event not found");
        }

        // Check visibility permissions
        const isCoordinator = event.coordinators.some(
            coordinator => coordinator.toString() === userId.toString()
        );
        const isVolunteer = event.volunteers.some(
            volunteer => volunteer.toString() === userId.toString()
        );
        const isAttendee = event.attendees.some(
            attendee => attendee.userId.toString() === userId.toString()
        ) || event.stats.going.includes(userId);

        if (event.settings.discussionVisibility === "coordinators" && !isCoordinator && req.user.role !== "admin") {
            throw new ApiError(403, "Only coordinators can view discussions for this event");
        }

        if (event.settings.discussionVisibility === "attendees" && !isAttendee && !isCoordinator && !isVolunteer && req.user.role !== "admin") {
            throw new ApiError(403, "Only attendees can view discussions for this event");
        }

        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Get top-level discussions (not replies)
        const discussions = await EventDiscussion.find({
            eventId,
            parentId: null
        })
        .populate("userId", "firstName lastName username profilePicture")
        .sort({ isPinned: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

        // Get total count
        const totalDiscussions = await EventDiscussion.countDocuments({
            eventId,
            parentId: null
        });

        // Get replies for each discussion
        const discussionsWithReplies = await Promise.all(
            discussions.map(async (discussion) => {
                const replies = await EventDiscussion.find({
                    eventId,
                    parentId: discussion._id
                })
                .populate("userId", "firstName lastName username profilePicture")
                .sort({ createdAt: 1 });

                return {
                    ...discussion.toObject(),
                    replies
                };
            })
        );

        // Return the discussions with pagination info
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    discussions: discussionsWithReplies,
                    pagination: {
                        total: totalDiscussions,
                        page: parseInt(page),
                        limit: parseInt(limit),
                        totalPages: Math.ceil(totalDiscussions / parseInt(limit))
                    }
                },
                "Discussions fetched successfully"
            )
        );
    } catch (error) {
        next(error);
    }
};

// Update a discussion
export const updateDiscussion = async (req, res, next) => {
    try {
        const { eventId, discussionId } = req.params;
        const { content, isPinned } = req.body;
        const userId = req.user._id;

        // Validate content if provided
        if (content !== undefined && content.trim() === "") {
            throw new ApiError(400, "Content cannot be empty");
        }

        // Find the discussion
        const discussion = await EventDiscussion.findOne({
            _id: discussionId,
            eventId
        });
        
        if (!discussion) {
            throw new ApiError(404, "Discussion not found");
        }

        // Find the event
        const event = await Event.findById(eventId);
        if (!event) {
            throw new ApiError(404, "Event not found");
        }

        // Check authorization
        const isCoordinator = event.coordinators.some(
            coordinator => coordinator.toString() === userId.toString()
        );
        const isAuthor = discussion.userId.toString() === userId.toString();

        // Only author, coordinator or admin can update content
        if (content !== undefined && !isAuthor && !isCoordinator && req.user.role !== "admin") {
            throw new ApiError(403, "You are not authorized to update this discussion");
        }

        // Only coordinators or admins can pin/unpin discussions
        if (isPinned !== undefined && !isCoordinator && req.user.role !== "admin") {
            throw new ApiError(403, "Only coordinators can pin or unpin discussions");
        }

        // Update the discussion
        if (content !== undefined) {
            discussion.content = content;
            discussion.isEdited = true;
        }
        
        if (isPinned !== undefined) {
            discussion.isPinned = isPinned;
        }
        
        await discussion.save();

        // Populate user details
        await discussion.populate("userId", "firstName lastName username profilePicture");
        
        // If it's a reply, populate parent
        if (discussion.parentId) {
            await discussion.populate("parentId");
        }

        // Return the updated discussion
        return res.status(200).json(
            new ApiResponse(200, discussion, "Discussion updated successfully")
        );
    } catch (error) {
        next(error);
    }
};

// Delete a discussion
export const deleteDiscussion = async (req, res, next) => {
    try {
        const { eventId, discussionId } = req.params;
        const userId = req.user._id;

        // Find the discussion
        const discussion = await EventDiscussion.findOne({
            _id: discussionId,
            eventId
        });
        
        if (!discussion) {
            throw new ApiError(404, "Discussion not found");
        }

        // Find the event
        const event = await Event.findById(eventId);
        if (!event) {
            throw new ApiError(404, "Event not found");
        }

        // Check authorization
        const isCoordinator = event.coordinators.some(
            coordinator => coordinator.toString() === userId.toString()
        );
        const isAuthor = discussion.userId.toString() === userId.toString();

        if (!isAuthor && !isCoordinator && req.user.role !== "admin") {
            throw new ApiError(403, "You are not authorized to delete this discussion");
        }

        // If it's a parent discussion, also delete all replies
        if (!discussion.parentId) {
            await EventDiscussion.deleteMany({
                parentId: discussionId
            });
        }

        // Delete the discussion
        await discussion.deleteOne();

        // Return success response
        return res.status(200).json(
            new ApiResponse(200, null, "Discussion deleted successfully")
        );
    } catch (error) {
        next(error);
    }
}; 