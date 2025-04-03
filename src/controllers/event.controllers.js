import { Event } from "../models/event.model.js";
import { EventPost } from "../models/eventPost.model.js";
import { User } from "../models/user.model.js";
import { Comment } from "../models/comment.model.js";
import { Ticket } from "../models/ticket.model.js";
import { TeamRegistration } from "../models/teamRegistration.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import mongoose from "mongoose";
import QRCode from "qrcode";

// Create a new event (admin only)
export const createEvent = async (req, res, next) => {
    try {
        const {
            name,
            description,
            startDate,
            endDate,
            location,
            capacity,
            ticketPrice,
            image,
            tags,
            isPrivate,
            faqs,
            coordinators,
            volunteers,
            settings
        } = req.body;

        // Validate required fields
        if (!name || !description || !startDate || !endDate || !location) {
            throw new ApiError(400, "Missing required fields");
        }

        // Validate dates
        if (new Date(startDate) > new Date(endDate)) {
            throw new ApiError(400, "Start date cannot be after end date");
        }

        // Create default settings object by merging with provided settings
        const eventSettings = {
            allowDiscussion: true,
            discussionVisibility: "public",
            allowFeedback: true,
            feedbackVisibility: "public",
            feedbackEligibility: "after_event",
            allowVolunteerEdit: false,
            cancelPendingAfterHours: 24,
            ...(settings || {})
        };

        // Create the event
        const event = await Event.create({
            name,
            description,
            startDate,
            endDate,
            location,
            coordinators: [...(coordinators || []), req.user._id], // Add current user as a coordinator
            volunteers: volunteers || [],
            capacity: capacity || 0,
            ticketPrice: ticketPrice || 0,
            image,
            tags: tags || [],
            isPrivate: isPrivate !== false, // Default to true unless explicitly set to false
            faqs: faqs || [],
            attendees: [],
            stats: {
                no: [],
                maybe: [],
                going: []
            },
            settings: eventSettings
        });

        // Return the created event
        return res.status(201).json(
            new ApiResponse(201, event, "Event created successfully")
        );
    } catch (error) {
        next(error);
    }
};

// Update an event (admin, coordinator, or volunteer with permission)
export const updateEvent = async (req, res, next) => {
    try {
        const { id } = req.params;
        const {
            name,
            description,
            startDate,
            endDate,
            location,
            capacity,
            ticketPrice,
            image,
            tags,
            isPrivate,
            status,
            coordinators,
            volunteers,
            settings
        } = req.body;

        // Find the event
        const event = await Event.findById(id);
        if (!event) {
            throw new ApiError(404, "Event not found");
        }

        // Check if user is authorized (admin, coordinator, or volunteer with edit permission)
        const isCoordinator = event.coordinators.some(
            coordinator => coordinator.toString() === req.user._id.toString()
        );
        
        const isVolunteer = event.volunteers.some(
            volunteer => volunteer.toString() === req.user._id.toString()
        );
        
        const isAdmin = req.user.role === "admin";
        
        // Check if volunteer has edit permissions
        const volunteerCanEdit = isVolunteer && event.settings?.allowVolunteerEdit;
        
        if (!isCoordinator && !isAdmin && !volunteerCanEdit) {
            throw new ApiError(403, "You are not authorized to update this event");
        }

        // Validate dates if provided
        if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
            throw new ApiError(400, "Start date cannot be after end date");
        }

        // Prepare update object
        const updateObj = {};
        
        // Basic fields that everyone with edit permissions can update
        if (name) updateObj.name = name;
        if (description) updateObj.description = description;
        if (location) updateObj.location = location;
        if (image) updateObj.image = image;
        if (tags) updateObj.tags = tags;
        
        // Fields that only coordinators and admins can update
        if (isCoordinator || isAdmin) {
            if (startDate) updateObj.startDate = startDate;
            if (endDate) updateObj.endDate = endDate;
            if (capacity !== undefined) updateObj.capacity = capacity;
            if (ticketPrice !== undefined) updateObj.ticketPrice = ticketPrice;
            if (isPrivate !== undefined) updateObj.isPrivate = isPrivate;
            if (status) updateObj.status = status;
            
            // Update settings if provided
            if (settings) {
                // Merge with existing settings
                updateObj.settings = { ...event.settings, ...settings };
            }
            
            // Coordinators can update volunteers
            if (volunteers) {
                updateObj.volunteers = volunteers;
            }
        }
        
        // Only admins can update coordinators
        if (coordinators && isAdmin) {
            updateObj.coordinators = coordinators;
        }

        // Update the event
        const updatedEvent = await Event.findByIdAndUpdate(
            id,
            updateObj,
            { new: true, runValidators: true }
        )
        .populate("coordinators", "firstName lastName username profilePicture")
        .populate("volunteers", "firstName lastName username profilePicture");

        // Return the updated event
        return res.status(200).json(
            new ApiResponse(200, updatedEvent, "Event updated successfully")
        );
    } catch (error) {
        next(error);
    }
};

// Get all events with filters and advanced searching
export const getAllEvents = async (req, res, next) => {
    try {
        const {
            page = 1,
            limit = 10,
            status,
            search,
            startDate,
            endDate,
            sortBy = "startDate",
            sortOrder = "asc",
            tags,
            isPrivate = false,
            cursor // Support for cursor-based pagination
        } = req.query;

        // Build filter object
        const filter = {};
        
        // Default to only show public events unless specifically requesting private events
        if (isPrivate === "true" || isPrivate === true) {
            // If requesting private events, check authorization
            if (req.user.role !== "admin") {
                // For non-admins, only show private events where they are coordinators or volunteers
                filter.$or = [
                    { coordinators: req.user._id },
                    { volunteers: req.user._id }
                ];
            }
            // No need to set isPrivate filter as we've already handled it with $or
        } else {
            // For public events listing
            filter.isPrivate = false;
        }
        
        // Add status filter if provided
        if (status) {
            filter.status = status;
        }
        
        // Search in name, description, location
        if (search) {
            // Create a text search condition
            const textSearchCondition = {
                $or: [
                    { name: { $regex: search, $options: "i" } },
                    { description: { $regex: search, $options: "i" } },
                    { location: { $regex: search, $options: "i" } }
                ]
            };
            
            // Combine with existing filters (if any)
            if (filter.$or) {
                // If we already have an $or condition for private events, use $and to combine
                filter.$and = [{ $or: filter.$or }, textSearchCondition];
                delete filter.$or; // Remove the original $or as it's now in $and
            } else {
                // Otherwise just add the text search $or condition
                filter.$or = textSearchCondition.$or;
            }
        }
        
        // Date filters
        if (startDate) {
            filter.endDate = { $gte: new Date(startDate) }; // Event ends on or after startDate
        }
        
        if (endDate) {
            filter.startDate = { $lte: new Date(endDate) }; // Event starts on or before endDate
        }
        
        // Tags filter - support for multiple tags
        if (tags) {
            const tagArray = Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim());
            filter.tags = { $in: tagArray };
        }

        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === "desc" ? -1 : 1;

        // Cursor-based pagination support
        if (cursor) {
            const decodedCursor = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
            const cursorField = sortBy || "_id";
            
            // Add cursor condition to filter
            if (sortOrder === "desc") {
                filter[cursorField] = { $lt: decodedCursor[cursorField] };
            } else {
                filter[cursorField] = { $gt: decodedCursor[cursorField] };
            }
        }

        // Calculate pagination for offset-based pagination
        const skip = cursor ? 0 : (parseInt(page) - 1) * parseInt(limit);

        // Fetch events
        const events = await Event.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit))
            .populate("coordinators", "firstName lastName username profilePicture");

        // Get total count (for offset-based pagination)
        const totalEvents = cursor ? null : await Event.countDocuments(filter);

        // Generate next cursor for cursor-based pagination
        let nextCursor = null;
        if (events.length === parseInt(limit)) {
            const lastEvent = events[events.length - 1];
            const cursorData = { _id: lastEvent._id };
            
            // Add the sorted field to cursor
            if (sortBy !== "_id") {
                cursorData[sortBy] = lastEvent[sortBy];
            }
            
            nextCursor = Buffer.from(JSON.stringify(cursorData)).toString('base64');
        }

        // Return events with pagination info
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    events,
                    pagination: cursor 
                        ? {
                            nextCursor,
                            hasMore: events.length === parseInt(limit)
                        }
                        : {
                            total: totalEvents,
                            page: parseInt(page),
                            limit: parseInt(limit),
                            totalPages: Math.ceil(totalEvents / parseInt(limit))
                        }
                },
                "Events fetched successfully"
            )
        );
    } catch (error) {
        next(error);
    }
};

// Get a single event by ID with details
export const getEventById = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Find the event with detailed population
        const event = await Event.findById(id)
            .populate("coordinators", "firstName lastName username profilePicture")
            .populate("volunteers", "firstName lastName username profilePicture")
            .populate("attendees.userId", "firstName lastName username profilePicture")
            .populate("stats.going", "firstName lastName username profilePicture")
            .populate("stats.maybe", "firstName lastName username profilePicture")
            .populate("stats.no", "firstName lastName username profilePicture");

        if (!event) {
            throw new ApiError(404, "Event not found");
        }

        // Get event posts
        const posts = await EventPost.find({ eventId: id })
            .sort({ createdAt: -1 })
            .populate("userId", "firstName lastName username profilePicture");

        // Calculate attendance stats
        const attendanceStats = {
            going: event.stats.going.length,
            maybe: event.stats.maybe.length,
            no: event.stats.no.length,
            total: event.stats.going.length + event.stats.maybe.length + event.stats.no.length,
            registered: event.attendees.length
        };

        // Additional data based on parent-child relationship
        let parentEventData = null;
        let subEventsData = [];

        if (event.isSubEvent && event.parentEvent) {
            parentEventData = await Event.findById(event.parentEvent)
                .select("_id name image startDate endDate status");
        }

        if (event.isParentEvent && event.subEvents.length > 0) {
            subEventsData = await Event.find({ _id: { $in: event.subEvents } })
                .select("_id name image startDate endDate status capacity attendees")
                .sort({ startDate: 1 });
            
            // Add registration count for each sub-event
            subEventsData = subEventsData.map(subEvent => ({
                ...subEvent.toObject(),
                registeredCount: subEvent.attendees.length,
                capacityFull: subEvent.capacity > 0 && subEvent.attendees.length >= subEvent.capacity
            }));
        }

        // Check if the user is already registered for this event
        const userId = req.user ? req.user._id : null;
        let userRegistration = null;
        let userTeams = [];

        if (userId) {
            // Check individual registration
            const individualRegistration = event.attendees.find(
                attendee => attendee.userId && attendee.userId.toString() === userId.toString() && 
                attendee.registrationType === "individual"
            );

            if (individualRegistration) {
                userRegistration = {
                    type: "individual",
                    status: individualRegistration.paymentStatus,
                    date: individualRegistration.registrationDate
                };
            }

            // Check team registrations where user is a member
            if (event.registrationType === "team" || event.registrationType === "both") {
                // Find teams where user is a member
                const teamRegistrations = await TeamRegistration.find({
                    eventId: id,
                    $or: [
                        { teamLeader: userId },
                        { "members.userId": userId }
                    ]
                }).select("teamName teamLeader status members");

                if (teamRegistrations.length > 0) {
                    userTeams = teamRegistrations.map(team => ({
                        teamId: team._id,
                        teamName: team.teamName,
                        isLeader: team.teamLeader.toString() === userId.toString(),
                        status: team.status,
                        members: team.members.map(m => ({
                            name: m.name,
                            userId: m.userId,
                            role: m.role,
                            status: m.registrationStatus
                        }))
                    }));
                }
            }
        }

        // Return event with additional data
        return res.status(200).json(
            new ApiResponse(
                200,
                { 
                    event, 
                    posts,
                    attendanceStats,
                    parentEvent: parentEventData,
                    subEvents: subEventsData,
                    userRegistration,
                    userTeams
                },
                "Event details fetched successfully"
            )
        );
    } catch (error) {
        next(error);
    }
};

// Add a FAQ to an event
export const addEventFAQ = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { question, answer } = req.body;

        // Validate required fields
        if (!question || !answer) {
            throw new ApiError(400, "Question and answer are required");
        }

        // Find the event
        const event = await Event.findById(id);
        if (!event) {
            throw new ApiError(404, "Event not found");
        }

        // Check if user is authorized (admin or coordinator)
        const isCoordinator = event.coordinators.some(
            coordinator => coordinator.toString() === req.user._id.toString()
        );
        
        if (!isCoordinator && req.user.role !== "admin") {
            throw new ApiError(403, "You are not authorized to update this event");
        }

        // Add the FAQ
        event.faqs.push({ question, answer });
        await event.save();

        // Return the updated event
        return res.status(200).json(
            new ApiResponse(200, event, "FAQ added successfully")
        );
    } catch (error) {
        next(error);
    }
};

// Update a FAQ
export const updateEventFAQ = async (req, res, next) => {
    try {
        const { id, faqId } = req.params;
        const { question, answer } = req.body;

        // Find the event
        const event = await Event.findById(id);
        if (!event) {
            throw new ApiError(404, "Event not found");
        }

        // Check if user is authorized (admin or coordinator)
        const isCoordinator = event.coordinators.some(
            coordinator => coordinator.toString() === req.user._id.toString()
        );
        
        if (!isCoordinator && req.user.role !== "admin") {
            throw new ApiError(403, "You are not authorized to update this event");
        }

        // Find the FAQ
        const faqIndex = event.faqs.findIndex(faq => faq._id.toString() === faqId);
        if (faqIndex === -1) {
            throw new ApiError(404, "FAQ not found");
        }

        // Update the FAQ
        if (question) event.faqs[faqIndex].question = question;
        if (answer) event.faqs[faqIndex].answer = answer;
        await event.save();

        // Return the updated event
        return res.status(200).json(
            new ApiResponse(200, event, "FAQ updated successfully")
        );
    } catch (error) {
        next(error);
    }
};

// Delete a FAQ
export const deleteEventFAQ = async (req, res, next) => {
    try {
        const { id, faqId } = req.params;

        // Find the event
        const event = await Event.findById(id);
        if (!event) {
            throw new ApiError(404, "Event not found");
        }

        // Check if user is authorized (admin or coordinator)
        const isCoordinator = event.coordinators.some(
            coordinator => coordinator.toString() === req.user._id.toString()
        );
        
        if (!isCoordinator && req.user.role !== "admin") {
            throw new ApiError(403, "You are not authorized to update this event");
        }

        // Remove the FAQ
        event.faqs = event.faqs.filter(faq => faq._id.toString() !== faqId);
        await event.save();

        // Return the updated event
        return res.status(200).json(
            new ApiResponse(200, event, "FAQ deleted successfully")
        );
    } catch (error) {
        next(error);
    }
};

// Create a post for an event
export const createEventPost = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { content, media } = req.body;

        // Validate required fields
        if (!content) {
            throw new ApiError(400, "Content is required");
        }

        // Find the event
        const event = await Event.findById(id);
        if (!event) {
            throw new ApiError(404, "Event not found");
        }

        // Determine if it's a coordinator post
        const isCoordinatorPost = event.coordinators.some(
            coordinator => coordinator.toString() === req.user._id.toString()
        );

        // Create the post
        const post = await EventPost.create({
            eventId: id,
            userId: req.user._id,
            content,
            media: media || [],
            isCoordinatorPost: isCoordinatorPost
        });

        // Populate user details
        await post.populate("userId", "firstName lastName username profilePicture");

        // Return the created post
        return res.status(201).json(
            new ApiResponse(201, post, "Post created successfully")
        );
    } catch (error) {
        next(error);
    }
};

// Update an event post
export const updateEventPost = async (req, res, next) => {
    try {
        const { id, postId } = req.params;
        const { content, media } = req.body;

        // Find the post
        const post = await EventPost.findById(postId);
        if (!post) {
            throw new ApiError(404, "Post not found");
        }

        // Check if the post belongs to the event
        if (post.eventId.toString() !== id) {
            throw new ApiError(400, "Post does not belong to this event");
        }

        // Check if user is authorized
        if (post.userId.toString() !== req.user._id.toString() && req.user.role !== "admin") {
            throw new ApiError(403, "You are not authorized to update this post");
        }

        // Update the post
        post.content = content || post.content;
        post.media = media || post.media;
        post.isEdited = true;
        await post.save();

        // Populate user details
        await post.populate("userId", "firstName lastName username profilePicture");

        // Return the updated post
        return res.status(200).json(
            new ApiResponse(200, post, "Post updated successfully")
        );
    } catch (error) {
        next(error);
    }
};

// Delete an event post
export const deleteEventPost = async (req, res, next) => {
    try {
        const { id, postId } = req.params;

        // Find the post
        const post = await EventPost.findById(postId);
        if (!post) {
            throw new ApiError(404, "Post not found");
        }

        // Check if the post belongs to the event
        if (post.eventId.toString() !== id) {
            throw new ApiError(400, "Post does not belong to this event");
        }

        // Check if user is authorized (post creator, event coordinator, or admin)
        const event = await Event.findById(id);
        const isCoordinator = event && event.coordinators.some(
            coordinator => coordinator.toString() === req.user._id.toString()
        );
        const isPostCreator = post.userId.toString() === req.user._id.toString();
        
        if (!isPostCreator && !isCoordinator && req.user.role !== "admin") {
            throw new ApiError(403, "You are not authorized to delete this post");
        }

        // Delete related comments
        await Comment.deleteMany({ 
            postType: "EventPost", 
            postId: post._id 
        });

        // Delete the post
        await post.deleteOne();

        // Return success response
        return res.status(200).json(
            new ApiResponse(200, null, "Post deleted successfully")
        );
    } catch (error) {
        next(error);
    }
};

// Add a comment to an event post
export const addEventComment = async (req, res, next) => {
    try {
        const { id, postId } = req.params;
        const { content, parentCommentId } = req.body;

        // Validate required fields
        if (!content) {
            throw new ApiError(400, "Content is required");
        }

        // Check if post exists and belongs to the event
        const post = await EventPost.findOne({
            _id: postId,
            eventId: id
        });
        
        if (!post) {
            throw new ApiError(404, "Post not found or does not belong to this event");
        }

        // If it's a reply, check if parent comment exists
        if (parentCommentId) {
            const parentComment = await Comment.findOne({
                _id: parentCommentId,
                postType: "EventPost",
                postId: postId
            });
            
            if (!parentComment) {
                throw new ApiError(404, "Parent comment not found");
            }
        }

        // Create the comment
        const comment = await Comment.create({
            postType: "EventPost",
            postId: postId,
            userId: req.user._id,
            content,
            parentCommentId: parentCommentId || null
        });

        // Populate user details
        await comment.populate("userId", "firstName lastName username profilePicture");
        
        if (parentCommentId) {
            await comment.populate("parentCommentId");
        }

        // Return the created comment
        return res.status(201).json(
            new ApiResponse(201, comment, "Comment added successfully")
        );
    } catch (error) {
        next(error);
    }
};

// Get all comments for an event post
export const getEventPostComments = async (req, res, next) => {
    try {
        const { id, postId } = req.params;

        // Check if post exists and belongs to the event
        const post = await EventPost.findOne({
            _id: postId,
            eventId: id
        });
        
        if (!post) {
            throw new ApiError(404, "Post not found or does not belong to this event");
        }

        // Get top-level comments
        const comments = await Comment.find({
            postType: "EventPost",
            postId: postId,
            parentCommentId: null
        })
        .populate("userId", "firstName lastName username profilePicture")
        .sort({ createdAt: -1 });

        // Get replies for each comment
        const commentsWithReplies = await Promise.all(
            comments.map(async (comment) => {
                const replies = await Comment.find({
                    postType: "EventPost",
                    postId: postId,
                    parentCommentId: comment._id
                })
                .populate("userId", "firstName lastName username profilePicture")
                .sort({ createdAt: 1 });

                return {
                    ...comment.toObject(),
                    replies
                };
            })
        );

        // Return the comments with replies
        return res.status(200).json(
            new ApiResponse(
                200, 
                commentsWithReplies, 
                "Comments fetched successfully"
            )
        );
    } catch (error) {
        next(error);
    }
};

// Update attendance status for an event (going, maybe, no)
export const updateAttendanceStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const userId = req.user._id;

        // Validate status
        if (!["going", "maybe", "no"].includes(status)) {
            throw new ApiError(400, "Invalid status. Must be one of: going, maybe, no");
        }

        // Find the event
        const event = await Event.findById(id);
        if (!event) {
            throw new ApiError(404, "Event not found");
        }

        // Check if the event has a capacity limit and is full (for "going" status)
        if (status === "going" && event.capacity > 0 && event.stats.going.length >= event.capacity) {
            throw new ApiError(400, "Event capacity is full");
        }

        // Find user's current status
        let currentStatus = null;
        
        if (event.stats.going.includes(userId)) currentStatus = "going";
        else if (event.stats.maybe.includes(userId)) currentStatus = "maybe";
        else if (event.stats.no.includes(userId)) currentStatus = "no";

        // If status hasn't changed, return early
        if (currentStatus === status) {
            return res.status(200).json(
                new ApiResponse(200, { event, status }, `Already marked as ${status} for the event`)
            );
        }

        // Remove user from current status array if they have one
        if (currentStatus) {
            event.stats[currentStatus] = event.stats[currentStatus].filter(
                id => id.toString() !== userId.toString()
            );
        }

        // Add user to new status array
        event.stats[status].push(userId);

        // For "going" status with paid events, also add to attendees with pending payment
        if (status === "going" && event.ticketPrice > 0) {
            // Check if already in attendees list
            const existingAttendee = event.attendees.find(
                a => a.userId.toString() === userId.toString()
            );
            
            if (!existingAttendee) {
                event.attendees.push({
                    userId,
                    registrationDate: new Date(),
                    paymentStatus: "pending"
                });
            }
        } 
        // For free events with "going" status, add to attendees with paid status
        else if (status === "going" && event.ticketPrice === 0) {
            // Check if already in attendees list
            const existingAttendee = event.attendees.find(
                a => a.userId.toString() === userId.toString()
            );
            
            if (!existingAttendee) {
                event.attendees.push({
                    userId,
                    registrationDate: new Date(),
                    paymentStatus: "free"
                });
            }
        }
        // If changing from "going" to another status, remove from attendees
        else if (currentStatus === "going" && (status === "maybe" || status === "no")) {
            event.attendees = event.attendees.filter(
                a => a.userId.toString() !== userId.toString()
            );
        }

        await event.save();

        // Return updated event
        return res.status(200).json(
            new ApiResponse(200, { event, status }, `Marked as ${status} for the event`)
        );
    } catch (error) {
        next(error);
    }
};

// Get user's attendance status for an event
export const getUserEventStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        // Find the event
        const event = await Event.findById(id);
        if (!event) {
            throw new ApiError(404, "Event not found");
        }

        // Determine user's status
        let status = null;
        if (event.stats.going.includes(userId)) status = "going";
        else if (event.stats.maybe.includes(userId)) status = "maybe";
        else if (event.stats.no.includes(userId)) status = "no";

        // Get registration details if registered
        const attendeeRecord = event.attendees.find(
            a => a.userId.toString() === userId.toString()
        );

        // Return status info
        return res.status(200).json(
            new ApiResponse(
                200, 
                {
                    status,
                    registered: !!attendeeRecord,
                    registrationDate: attendeeRecord ? attendeeRecord.registrationDate : null,
                    paymentStatus: attendeeRecord ? attendeeRecord.paymentStatus : null
                },
                "User event status fetched successfully"
            )
        );
    } catch (error) {
        next(error);
    }
};

// Get attendees for an event (authorized users only)
export const getEventAttendees = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.query;
        const userId = req.user._id;

        // Find the event
        const event = await Event.findById(id);
        if (!event) {
            throw new ApiError(404, "Event not found");
        }

        // Check if user is authorized (coordinator, volunteer, or admin)
        const isCoordinator = event.coordinators.some(
            coordinator => coordinator.toString() === userId.toString()
        );
        const isVolunteer = event.volunteers.some(
            volunteer => volunteer.toString() === userId.toString()
        );
        
        if (!isCoordinator && !isVolunteer && req.user.role !== "admin") {
            throw new ApiError(403, "You are not authorized to view attendees for this event");
        }

        // Populate the event with required fields
        const populatedEvent = await Event.findById(id)
            .populate("stats.going", "firstName lastName username profilePicture email")
            .populate("stats.maybe", "firstName lastName username profilePicture email")
            .populate("stats.no", "firstName lastName username profilePicture email")
            .populate("attendees.userId", "firstName lastName username profilePicture email");

        // Filter based on requested status
        let attendees;
        if (status === "going") {
            attendees = populatedEvent.stats.going;
        } else if (status === "maybe") {
            attendees = populatedEvent.stats.maybe;
        } else if (status === "no") {
            attendees = populatedEvent.stats.no;
        } else if (status === "registered") {
            attendees = populatedEvent.attendees.map(a => ({
                ...a.userId._doc,
                registrationDate: a.registrationDate,
                paymentStatus: a.paymentStatus
            }));
        } else {
            // Return all stats if no specific status requested
            attendees = {
                going: populatedEvent.stats.going,
                maybe: populatedEvent.stats.maybe,
                no: populatedEvent.stats.no,
                registered: populatedEvent.attendees.map(a => ({
                    ...a.userId._doc,
                    registrationDate: a.registrationDate,
                    paymentStatus: a.paymentStatus
                }))
            };
        }

        // Calculate stats
        const stats = {
            going: populatedEvent.stats.going.length,
            maybe: populatedEvent.stats.maybe.length,
            no: populatedEvent.stats.no.length,
            total: populatedEvent.stats.going.length + populatedEvent.stats.maybe.length + populatedEvent.stats.no.length,
            registered: populatedEvent.attendees.length,
        };

        // Return attendees list and stats
        return res.status(200).json(
            new ApiResponse(
                200, 
                { attendees, stats }, 
                "Event attendees fetched successfully"
            )
        );
    } catch (error) {
        next(error);
    }
};

// Cancel registration and remove attendance status
export const cancelEventRegistration = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        // Find the event
        const event = await Event.findById(id);
        if (!event) {
            throw new ApiError(404, "Event not found");
        }

        // Check current attendance status
        let currentStatus = null;
        if (event.stats.going.includes(userId)) currentStatus = "going";
        else if (event.stats.maybe.includes(userId)) currentStatus = "maybe";
        else if (event.stats.no.includes(userId)) currentStatus = "no";

        if (!currentStatus) {
            throw new ApiError(400, "You have not marked attendance for this event");
        }

        // Remove user from status arrays
        event.stats.going = event.stats.going.filter(id => id.toString() !== userId.toString());
        event.stats.maybe = event.stats.maybe.filter(id => id.toString() !== userId.toString());
        event.stats.no = event.stats.no.filter(id => id.toString() !== userId.toString());

        // Remove from attendees if registered
        event.attendees = event.attendees.filter(a => a.userId.toString() !== userId.toString());

        await event.save();

        // Return success response
        return res.status(200).json(
            new ApiResponse(200, event, "Attendance status removed successfully")
        );
    } catch (error) {
        next(error);
    }
};

// Delete an event (admin or coordinator only)
export const deleteEvent = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Find the event
        const event = await Event.findById(id);
        if (!event) {
            throw new ApiError(404, "Event not found");
        }

        // Check if user is authorized (admin or coordinator)
        const isCoordinator = event.coordinators.some(
            coordinator => coordinator.toString() === req.user._id.toString()
        );
        
        if (!isCoordinator && req.user.role !== "admin") {
            throw new ApiError(403, "You are not authorized to delete this event");
        }

        // Delete event posts and their comments
        const eventPosts = await EventPost.find({ eventId: id });
        for (const post of eventPosts) {
            await Comment.deleteMany({ postType: "EventPost", postId: post._id });
            await post.deleteOne();
        }

        // Delete the event
        await event.deleteOne();

        // Return success response
        return res.status(200).json(
            new ApiResponse(200, null, "Event deleted successfully")
        );
    } catch (error) {
        next(error);
    }
};

// Register for an event
export const registerForEvent = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        // Find the event
        const event = await Event.findById(id);
        if (!event) {
            throw new ApiError(404, "Event not found");
        }

        // Check if the event is private
        if (event.isPrivate) {
            throw new ApiError(403, "This event is private");
        }

        // Check if the event has reached capacity
        if (event.capacity > 0 && event.attendees.length >= event.capacity) {
            throw new ApiError(400, "Event has reached its capacity");
        }

        // Check if user is already registered
        const existingRegistration = event.attendees.find(
            attendee => attendee.userId.toString() === userId.toString()
        );

        if (existingRegistration) {
            throw new ApiError(400, "You are already registered for this event");
        }

        // Determine payment status
        const paymentStatus = event.ticketPrice > 0 ? "pending" : "free";

        // Add user to attendees
        event.attendees.push({
            userId,
            registrationDate: new Date(),
            paymentStatus
        });

        // Add user to going list
        if (!event.stats.going.includes(userId)) {
            event.stats.going.push(userId);
        }

        // Remove from maybe or no lists if present
        event.stats.maybe = event.stats.maybe.filter(id => id.toString() !== userId.toString());
        event.stats.no = event.stats.no.filter(id => id.toString() !== userId.toString());

        await event.save();

        // Generate ticket immediately for free events
        let ticket = null;
        if (paymentStatus === "free") {
            // Generate ticket data
            const ticketData = {
                eventId: event._id,
                userId,
                eventName: event.name,
                attendeeName: `${req.user.firstName} ${req.user.lastName}`,
                ticketNumber: `TKT-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
                timestamp: new Date()
            };
            
            // Create QR code
            const qrCodeDataURI = await QRCode.toDataURL(JSON.stringify(ticketData));
            
            // Create ticket
            ticket = await Ticket.create({
                eventId: event._id,
                userId,
                qrCode: qrCodeDataURI,
                price: 0,
                ticketNumber: ticketData.ticketNumber,
                status: "active"
            });
        }

        // Return registration details
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    registration: {
                        eventId: event._id,
                        userId,
                        registrationDate: new Date(),
                        paymentStatus
                    },
                    paymentRequired: event.ticketPrice > 0,
                    price: event.ticketPrice,
                    ticket
                },
                paymentStatus === "free" 
                    ? "Successfully registered for free event" 
                    : "Successfully registered for event. Payment required."
            )
        );
    } catch (error) {
        next(error);
    }
};

// Get all sub-events for a parent event
export const getSubEvents = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 10 } = req.query;

        // Find the parent event
        const parentEvent = await Event.findById(id);
        if (!parentEvent) {
            throw new ApiError(404, "Parent event not found");
        }

        // Check if it's a parent event
        if (!parentEvent.isParentEvent) {
            throw new ApiError(400, "This is not a parent event");
        }

        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Get sub-events
        const subEvents = await Event.find({ parentEvent: id })
            .select("_id name description image startDate endDate location status tags capacity attendees stats.going")
            .sort({ startDate: 1 })
            .skip(skip)
            .limit(parseInt(limit));

        // Process sub-events for additional info
        const processedSubEvents = subEvents.map(event => {
            const registeredCount = event.attendees.length;
            const goingCount = event.stats.going.length;
            
            return {
                ...event.toObject(),
                registeredCount,
                goingCount,
                capacityFull: event.capacity > 0 && registeredCount >= event.capacity
            };
        });

        // Get total count
        const totalSubEvents = await Event.countDocuments({ parentEvent: id });

        // Return the sub-events
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    parentEvent: {
                        _id: parentEvent._id,
                        name: parentEvent.name,
                        image: parentEvent.image,
                        startDate: parentEvent.startDate,
                        endDate: parentEvent.endDate,
                        description: parentEvent.description,
                        tags: parentEvent.tags
                    },
                    subEvents: processedSubEvents,
                    pagination: {
                        total: totalSubEvents,
                        page: parseInt(page),
                        limit: parseInt(limit),
                        pages: Math.ceil(totalSubEvents / parseInt(limit))
                    }
                },
                "Sub-events fetched successfully"
            )
        );
    } catch (error) {
        next(error);
    }
};

// Add file attachment to an event
export const addEventAttachment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { fileName, fileUrl, fileType } = req.body;

        // Validate required fields
        if (!fileName || !fileUrl || !fileType) {
            throw new ApiError(400, "File name, URL, and type are required");
        }

        // Find the event
        const event = await Event.findById(id);
        if (!event) {
            throw new ApiError(404, "Event not found");
        }

        // Check if user is authorized (admin or coordinator)
        const isCoordinator = event.coordinators.some(
            coordinator => coordinator.toString() === req.user._id.toString()
        );
        
        const isVolunteer = event.volunteers.some(
            volunteer => volunteer.toString() === req.user._id.toString()
        );
        
        const volunteerCanEdit = isVolunteer && event.settings?.allowVolunteerEdit;
        
        if (!isCoordinator && !volunteerCanEdit && req.user.role !== "admin") {
            throw new ApiError(403, "You are not authorized to add attachments to this event");
        }

        // Add the attachment
        const attachment = {
            fileName,
            fileUrl,
            fileType,
            uploadDate: new Date()
        };
        
        event.attachments.push(attachment);
        await event.save();

        // Return the updated event
        return res.status(200).json(
            new ApiResponse(200, attachment, "Attachment added successfully")
        );
    } catch (error) {
        next(error);
    }
};

// Remove a file attachment from an event
export const removeEventAttachment = async (req, res, next) => {
    try {
        const { id, attachmentId } = req.params;

        // Find the event
        const event = await Event.findById(id);
        if (!event) {
            throw new ApiError(404, "Event not found");
        }

        // Check if user is authorized (admin or coordinator)
        const isCoordinator = event.coordinators.some(
            coordinator => coordinator.toString() === req.user._id.toString()
        );
        
        const isVolunteer = event.volunteers.some(
            volunteer => volunteer.toString() === req.user._id.toString()
        );
        
        const volunteerCanEdit = isVolunteer && event.settings?.allowVolunteerEdit;
        
        if (!isCoordinator && !volunteerCanEdit && req.user.role !== "admin") {
            throw new ApiError(403, "You are not authorized to remove attachments from this event");
        }

        // Find the attachment
        const attachmentIndex = event.attachments.findIndex(
            attachment => attachment._id.toString() === attachmentId
        );
        
        if (attachmentIndex === -1) {
            throw new ApiError(404, "Attachment not found");
        }

        // Remove the attachment
        event.attachments.splice(attachmentIndex, 1);
        await event.save();

        // Return success response
        return res.status(200).json(
            new ApiResponse(200, null, "Attachment removed successfully")
        );
    } catch (error) {
        next(error);
    }
};

// Generate ticket for an event (for paid events after payment, or free events)
export const generateTicket = async (req, res, next) => {
    try {
        const { eventId } = req.params;
        const { paymentId, paymentInfo } = req.body;
        const userId = req.user._id;

        // Find the event
        const event = await Event.findById(eventId);
        if (!event) {
            throw new ApiError(404, "Event not found");
        }

        // Find user's registration in the event
        const attendeeIndex = event.attendees.findIndex(
            a => a.userId.toString() === userId.toString()
        );
        
        if (attendeeIndex === -1) {
            throw new ApiError(404, "You are not registered for this event");
        }

        const attendee = event.attendees[attendeeIndex];

        // Check if payment is required for paid events
        if (event.ticketPrice > 0) {
            if (attendee.paymentStatus === "paid") {
                // Check if ticket already exists
                const existingTicket = await Ticket.findOne({ 
                    eventId,
                    userId,
                    status: { $in: ["active", "used"] }
                });
                
                if (existingTicket) {
                    throw new ApiError(400, "Ticket already generated for this event");
                }
            } else if (attendee.paymentStatus === "pending") {
                if (!paymentId) {
                    throw new ApiError(400, "Payment ID is required for paid events");
                }
                
                // Update payment status
                event.attendees[attendeeIndex].paymentStatus = "paid";
                
                // Update total revenue
                event.totalRevenue = (event.totalRevenue || 0) + event.ticketPrice;
                
                await event.save();
            } else {
                throw new ApiError(400, "Invalid payment status");
            }
        } else if (attendee.paymentStatus !== "free") {
            // For free events, update status if needed
            event.attendees[attendeeIndex].paymentStatus = "free";
            await event.save();
        }

        // Generate QR code
        const ticketData = {
            eventId: event._id,
            userId,
            eventName: event.name,
            attendeeName: `${req.user.firstName} ${req.user.lastName}`,
            ticketNumber: `TKT-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            timestamp: new Date()
        };
        
        // Create QR code as data URI
        const qrCodeDataURI = await QRCode.toDataURL(JSON.stringify(ticketData));

        // Create ticket in database
        const ticket = await Ticket.create({
            eventId,
            userId,
            qrCode: qrCodeDataURI,
            price: event.ticketPrice,
            paymentId: paymentId || "",
            ticketNumber: ticketData.ticketNumber,
            status: "active"
        });

        // Return the ticket information
        return res.status(201).json(
            new ApiResponse(
                201, 
                {
                    ticket,
                    qrCode: qrCodeDataURI,
                    event: {
                        name: event.name,
                        startDate: event.startDate,
                        endDate: event.endDate,
                        location: event.location
                    }
                },
                "Ticket generated successfully"
            )
        );
    } catch (error) {
        next(error);
    }
};

// Verify a ticket (for event check-in)
export const verifyTicket = async (req, res, next) => {
    try {
        const { eventId } = req.params;
        const { ticketNumber, qrData } = req.body;
        
        // Ensure either ticket number or QR data is provided
        if (!ticketNumber && !qrData) {
            throw new ApiError(400, "Ticket number or QR data is required");
        }

        // Check if the event exists
        const event = await Event.findById(eventId);
        if (!event) {
            throw new ApiError(404, "Event not found");
        }

        // Check if user is authorized to verify tickets (admin, coordinator, or volunteer)
        const isCoordinator = event.coordinators.some(
            coordinator => coordinator.toString() === req.user._id.toString()
        );
        
        const isVolunteer = event.volunteers.some(
            volunteer => volunteer.toString() === req.user._id.toString()
        );
        
        if (!isCoordinator && !isVolunteer && req.user.role !== "admin") {
            throw new ApiError(403, "You are not authorized to verify tickets for this event");
        }

        // Find the ticket
        let ticket;
        if (ticketNumber) {
            ticket = await Ticket.findOne({ 
                eventId,
                ticketNumber,
                status: { $in: ["active", "used"] } // Ensure ticket is active or used
            }).populate("userId", "firstName lastName email username profilePicture");
        } else if (qrData) {
            // Parse QR data to extract ticket information
            let parsedQRData;
            try {
                parsedQRData = JSON.parse(qrData);
                if (!parsedQRData.ticketNumber) {
                    throw new ApiError(400, "Invalid QR data");
                }
            } catch (error) {
                throw new ApiError(400, "Invalid QR data format");
            }
            
            ticket = await Ticket.findOne({ 
                eventId,
                ticketNumber: parsedQRData.ticketNumber,
                status: { $in: ["active", "used"] }
            }).populate("userId", "firstName lastName email username profilePicture");
        }

        if (!ticket) {
            throw new ApiError(404, "Ticket not found or is invalid");
        }

        // Check if ticket has already been verified
        if (ticket.verified) {
            return res.status(200).json(
                new ApiResponse(
                    200, 
                    {
                        ticket,
                        alreadyVerified: true,
                        verificationDetails: ticket.verificationDetails
                    },
                    "Ticket has already been verified"
                )
            );
        }

        // Update ticket verification status
        ticket.verified = true;
        ticket.status = "used";
        ticket.verificationDetails = {
            verifiedBy: req.user._id,
            verificationTime: new Date(),
            verificationLocation: req.body.location || "Unknown"
        };
        
        await ticket.save();

        // Return ticket verification details
        return res.status(200).json(
            new ApiResponse(
                200, 
                {
                    ticket,
                    verifiedBy: `${req.user.firstName} ${req.user.lastName}`,
                    verificationTime: ticket.verificationDetails.verificationTime
                },
                "Ticket verified successfully"
            )
        );
    } catch (error) {
        next(error);
    }
};

// Get user ticket for an event
export const getEventTicket = async (req, res, next) => {
    try {
        const { eventId } = req.params;
        const userId = req.user._id;

        // Find the event
        const event = await Event.findById(eventId);
        if (!event) {
            throw new ApiError(404, "Event not found");
        }

        // Find the ticket
        const ticket = await Ticket.findOne({
            eventId,
            userId,
            status: { $in: ["active", "used"] }
        });

        if (!ticket) {
            throw new ApiError(404, "Ticket not found for this event");
        }

        // Return the ticket with event details
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    ticket,
                    event: {
                        name: event.name,
                        startDate: event.startDate,
                        endDate: event.endDate,
                        location: event.location,
                        image: event.image
                    }
                },
                "Ticket fetched successfully"
            )
        );
    } catch (error) {
        next(error);
    }
};

// Get event posts with pagination and infinite scrolling
export const getEventPosts = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { 
            page = 1, 
            limit = 10, 
            cursor, 
            coordinatorPostsOnly = false 
        } = req.query;

        // Find the event
        const event = await Event.findById(id);
        if (!event) {
            throw new ApiError(404, "Event not found");
        }

        // Check if event is private
        if (event.isPrivate) {
            // Check if user is authorized to view this private event
            const isAuthorized = event.coordinators.some(
                coordinator => coordinator.toString() === req.user._id.toString()
            ) || event.volunteers.some(
                volunteer => volunteer.toString() === req.user._id.toString()
            ) || req.user.role === "admin";
            
            if (!isAuthorized) {
                throw new ApiError(403, "You are not authorized to view this private event");
            }
        }

        // Build filter
        const filter = { eventId: id };
        
        // Filter by coordinator posts if requested
        if (coordinatorPostsOnly === "true" || coordinatorPostsOnly === true) {
            filter.isCoordinatorPost = true;
        }

        // For cursor-based pagination
        if (cursor) {
            const decodedCursor = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
            filter._id = { $lt: decodedCursor._id };
        }

        // Calculate skip for offset-based pagination
        const skip = cursor ? 0 : (parseInt(page) - 1) * parseInt(limit);

        // Fetch posts
        const posts = await EventPost.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate("userId", "firstName lastName username profilePicture");

        // Get total count for offset-based pagination
        const totalPosts = cursor ? null : await EventPost.countDocuments(filter);

        // Generate next cursor
        let nextCursor = null;
        if (posts.length === parseInt(limit)) {
            const lastPost = posts[posts.length - 1];
            const cursorData = { _id: lastPost._id };
            nextCursor = Buffer.from(JSON.stringify(cursorData)).toString('base64');
        }

        // Return posts with pagination info
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    posts,
                    pagination: cursor 
                        ? {
                            nextCursor,
                            hasMore: posts.length === parseInt(limit)
                        }
                        : {
                            total: totalPosts,
                            page: parseInt(page),
                            limit: parseInt(limit),
                            totalPages: Math.ceil(totalPosts / parseInt(limit))
                        }
                },
                "Event posts fetched successfully"
            )
        );
    } catch (error) {
        next(error);
    }
};

// Don't forget to add these functions to the exports
export {
    createEvent,
    updateEvent,
    getAllEvents,
    getEventById,
    addEventFAQ,
    updateEventFAQ,
    deleteEventFAQ,
    createEventPost,
    updateEventPost,
    deleteEventPost,
    addEventComment,
    getEventPostComments,
    updateAttendanceStatus,
    getUserEventStatus,
    getEventAttendees,
    cancelEventRegistration,
    deleteEvent,
    generateTicket,
    verifyTicket,
    getEventTicket,
    getSubEvents,
    registerForEvent,
    addEventAttachment,
    removeEventAttachment,
    getEventPosts
}; 