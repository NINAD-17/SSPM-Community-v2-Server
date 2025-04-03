import EventFeedback from "../models/eventFeedback.model.js";
import Event from "../models/event.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import mongoose from "mongoose";

// Submit feedback for an event
export const submitFeedback = async (req, res, next) => {
    try {
        const { eventId } = req.params;
        const { rating, content, isAnonymous, tags } = req.body;
        const userId = req.user._id;

        // Validate required fields
        if (!rating || rating < 1 || rating > 5) {
            throw new ApiError(400, "Rating is required and must be between 1 and 5");
        }

        if (!content || content.trim() === "") {
            throw new ApiError(400, "Content is required");
        }

        // Check if event exists
        const event = await Event.findById(eventId);
        if (!event) {
            throw new ApiError(404, "Event not found");
        }

        // Check if feedback is allowed for this event
        if (!event.settings.allowFeedback) {
            throw new ApiError(403, "Feedback is not allowed for this event");
        }

        // Check if user is an attendee or has "going" status
        const isAttendee = event.attendees.some(
            attendee => attendee.userId.toString() === userId.toString()
        ) || event.stats.going.includes(userId);

        if (!isAttendee && req.user.role !== "admin") {
            throw new ApiError(403, "Only attendees can submit feedback for this event");
        }

        // Check feedback eligibility based on event settings
        if (event.settings.feedbackEligibility === "after_event" && event.status !== "completed") {
            throw new ApiError(403, "Feedback can only be submitted after the event is completed");
        }

        if (event.settings.feedbackEligibility === "coordinator_choice") {
            const isCoordinator = event.coordinators.some(
                coordinator => coordinator.toString() === userId.toString()
            );
            if (!isCoordinator && req.user.role !== "admin") {
                throw new ApiError(403, "Feedback is currently restricted by the event coordinators");
            }
        }

        // Check if user has already submitted feedback
        const existingFeedback = await EventFeedback.findOne({
            eventId,
            userId
        });

        if (existingFeedback) {
            throw new ApiError(400, "You have already submitted feedback for this event");
        }

        // Create the feedback
        const feedback = await EventFeedback.create({
            eventId,
            userId,
            rating,
            content,
            isAnonymous: isAnonymous || false,
            tags: tags || []
        });

        // Update event's average rating and total feedbacks
        const allFeedbacks = await EventFeedback.find({ eventId });
        const totalRating = allFeedbacks.reduce((sum, fb) => sum + fb.rating, 0);
        const averageRating = totalRating / allFeedbacks.length;

        event.averageRating = parseFloat(averageRating.toFixed(1));
        event.totalFeedbacks = allFeedbacks.length;
        await event.save();

        // Populate user details unless anonymous
        if (!feedback.isAnonymous) {
            await feedback.populate("userId", "firstName lastName username profilePicture");
        } else {
            // Remove user details for anonymous feedback
            feedback.userId = undefined;
        }

        // Return the created feedback
        return res.status(201).json(
            new ApiResponse(201, feedback, "Feedback submitted successfully")
        );
    } catch (error) {
        next(error);
    }
};

// Get all feedback for an event
export const getEventFeedback = async (req, res, next) => {
    try {
        const { eventId } = req.params;
        const { page = 1, limit = 20, sortBy = "createdAt", sortOrder = "desc" } = req.query;
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

        if (event.settings.feedbackVisibility === "coordinators" && !isCoordinator && req.user.role !== "admin") {
            throw new ApiError(403, "Only coordinators can view feedback for this event");
        }

        if (event.settings.feedbackVisibility === "attendees" && !isAttendee && !isCoordinator && !isVolunteer && req.user.role !== "admin") {
            throw new ApiError(403, "Only attendees can view feedback for this event");
        }

        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === "desc" ? -1 : 1;

        // Get all visible feedback
        const feedback = await EventFeedback.find({
            eventId,
            isVisible: true
        })
        .populate("userId", "firstName lastName username profilePicture")
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit));

        // Process feedback to respect anonymity
        const processedFeedback = feedback.map(fb => {
            if (fb.isAnonymous) {
                const feedbackObj = fb.toObject();
                // Remove user details for anonymous feedback
                delete feedbackObj.userId;
                return feedbackObj;
            }
            return fb;
        });

        // Get total count of visible feedback
        const totalFeedback = await EventFeedback.countDocuments({
            eventId,
            isVisible: true
        });

        // Calculate feedback statistics
        const ratingDistribution = {
            5: 0,
            4: 0,
            3: 0,
            2: 0,
            1: 0
        };

        const allFeedback = await EventFeedback.find({
            eventId,
            isVisible: true
        });

        allFeedback.forEach(fb => {
            ratingDistribution[fb.rating]++;
        });

        // Return the feedback with pagination info and stats
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    feedback: processedFeedback,
                    pagination: {
                        total: totalFeedback,
                        page: parseInt(page),
                        limit: parseInt(limit),
                        totalPages: Math.ceil(totalFeedback / parseInt(limit))
                    },
                    stats: {
                        averageRating: event.averageRating,
                        totalFeedbacks: event.totalFeedbacks,
                        ratingDistribution
                    }
                },
                "Feedback fetched successfully"
            )
        );
    } catch (error) {
        next(error);
    }
};

// Update feedback visibility (for coordinators and admins)
export const updateFeedbackVisibility = async (req, res, next) => {
    try {
        const { eventId, feedbackId } = req.params;
        const { isVisible } = req.body;
        const userId = req.user._id;

        // Validate required fields
        if (isVisible === undefined) {
            throw new ApiError(400, "Visibility status is required");
        }

        // Find the feedback
        const feedback = await EventFeedback.findOne({
            _id: feedbackId,
            eventId
        });
        
        if (!feedback) {
            throw new ApiError(404, "Feedback not found");
        }

        // Find the event
        const event = await Event.findById(eventId);
        if (!event) {
            throw new ApiError(404, "Event not found");
        }

        // Check authorization (only coordinators and admins can update visibility)
        const isCoordinator = event.coordinators.some(
            coordinator => coordinator.toString() === userId.toString()
        );
        
        if (!isCoordinator && req.user.role !== "admin") {
            throw new ApiError(403, "Only coordinators can update feedback visibility");
        }

        // Update the feedback
        feedback.isVisible = isVisible;
        await feedback.save();

        // Recalculate average rating if visibility changed
        if (feedback.isVisible !== isVisible) {
            const visibleFeedback = await EventFeedback.find({
                eventId,
                isVisible: true
            });
            
            if (visibleFeedback.length > 0) {
                const totalRating = visibleFeedback.reduce((sum, fb) => sum + fb.rating, 0);
                event.averageRating = parseFloat((totalRating / visibleFeedback.length).toFixed(1));
            } else {
                event.averageRating = 0;
            }
            
            event.totalFeedbacks = visibleFeedback.length;
            await event.save();
        }

        // Return the updated feedback
        return res.status(200).json(
            new ApiResponse(200, feedback, `Feedback ${isVisible ? 'shown' : 'hidden'} successfully`)
        );
    } catch (error) {
        next(error);
    }
};

// Get user's feedback for an event
export const getUserFeedback = async (req, res, next) => {
    try {
        const { eventId } = req.params;
        const userId = req.user._id;

        // Find the event
        const event = await Event.findById(eventId);
        if (!event) {
            throw new ApiError(404, "Event not found");
        }

        // Find user's feedback
        const feedback = await EventFeedback.findOne({
            eventId,
            userId
        });

        if (!feedback) {
            return res.status(200).json(
                new ApiResponse(200, null, "You have not submitted feedback for this event")
            );
        }

        // Return the feedback
        return res.status(200).json(
            new ApiResponse(200, feedback, "User feedback fetched successfully")
        );
    } catch (error) {
        next(error);
    }
};

// Update user's feedback
export const updateFeedback = async (req, res, next) => {
    try {
        const { eventId } = req.params;
        const { rating, content, isAnonymous, tags } = req.body;
        const userId = req.user._id;

        // Validate required fields if provided
        if (rating !== undefined && (rating < 1 || rating > 5)) {
            throw new ApiError(400, "Rating must be between 1 and 5");
        }

        if (content !== undefined && content.trim() === "") {
            throw new ApiError(400, "Content cannot be empty");
        }

        // Find the event
        const event = await Event.findById(eventId);
        if (!event) {
            throw new ApiError(404, "Event not found");
        }

        // Find user's feedback
        const feedback = await EventFeedback.findOne({
            eventId,
            userId
        });

        if (!feedback) {
            throw new ApiError(404, "Feedback not found. Submit feedback first before updating");
        }

        // Update the feedback
        if (rating !== undefined) feedback.rating = rating;
        if (content !== undefined) feedback.content = content;
        if (isAnonymous !== undefined) feedback.isAnonymous = isAnonymous;
        if (tags !== undefined) feedback.tags = tags;
        
        feedback.isEdited = true;
        await feedback.save();

        // Recalculate average rating
        const visibleFeedback = await EventFeedback.find({
            eventId,
            isVisible: true
        });
        
        if (visibleFeedback.length > 0) {
            const totalRating = visibleFeedback.reduce((sum, fb) => sum + fb.rating, 0);
            event.averageRating = parseFloat((totalRating / visibleFeedback.length).toFixed(1));
        } else {
            event.averageRating = 0;
        }
        
        await event.save();

        // Return the updated feedback
        return res.status(200).json(
            new ApiResponse(200, feedback, "Feedback updated successfully")
        );
    } catch (error) {
        next(error);
    }
}; 