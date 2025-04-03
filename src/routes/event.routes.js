import { Router } from "express";
import { verifyJWT, isAdmin } from "../middlewares/auth.middleware.js";
import {
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
    addEventAttachment,
    removeEventAttachment,
    registerForEvent,
    getEventPosts
} from "../controllers/event.controllers.js";

import {
    createDiscussion,
    getEventDiscussions,
    updateDiscussion,
    deleteDiscussion
} from "../controllers/eventDiscussion.controllers.js";

import {
    submitFeedback,
    getEventFeedback,
    updateFeedbackVisibility,
    getUserFeedback,
    updateFeedback
} from "../controllers/eventFeedback.controllers.js";

const router = Router();

// Apply JWT verification to all routes
router.use(verifyJWT);

// Event CRUD routes
router.post("/", createEvent);
router.put("/:id", updateEvent);
router.get("/", getAllEvents);
router.get("/:id", getEventById);
router.delete("/:id", deleteEvent);

// Event attendance/registration routes
router.post("/:id/attendance", updateAttendanceStatus);
router.get("/:id/attendance", getUserEventStatus);
router.get("/:id/attendees", getEventAttendees);
router.delete("/:id/attendance", cancelEventRegistration);
router.post("/:id/register", registerForEvent);

// Event FAQ routes
router.post("/:id/faqs", addEventFAQ);
router.put("/:id/faqs/:faqId", updateEventFAQ);
router.delete("/:id/faqs/:faqId", deleteEventFAQ);

// Event attachment routes
router.post("/:id/attachments", addEventAttachment);
router.delete("/:id/attachments/:attachmentId", removeEventAttachment);

// Event post routes
router.post("/:id/posts", createEventPost);
router.get("/:id/posts", getEventPosts);
router.put("/:id/posts/:postId", updateEventPost);
router.delete("/:id/posts/:postId", deleteEventPost);

// Event post comment routes
router.post("/:id/posts/:postId/comments", addEventComment);
router.get("/:id/posts/:postId/comments", getEventPostComments);

// Ticket Routes
router.post("/:eventId/generate-ticket", generateTicket);
router.post("/:eventId/verify-ticket", verifyTicket);
router.get("/:eventId/ticket", getEventTicket);

// Discussion Routes
router.post("/:eventId/discussions", createDiscussion);
router.get("/:eventId/discussions", getEventDiscussions);
router.patch("/:eventId/discussions/:discussionId", updateDiscussion);
router.delete("/:eventId/discussions/:discussionId", deleteDiscussion);

// Feedback Routes
router.post("/:eventId/feedback", submitFeedback);
router.get("/:eventId/feedback", getEventFeedback);
router.get("/:eventId/feedback/user", getUserFeedback);
router.patch("/:eventId/feedback", updateFeedback);
router.patch("/:eventId/feedback/:feedbackId/visibility", updateFeedbackVisibility);

export default router; 