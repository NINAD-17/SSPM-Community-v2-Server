import Ticket from "../models/ticket.model.js";
import Event from "../models/event.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { generateQRCode } from "../utils/qrcode.js";
import crypto from "crypto";

// Generate a ticket for an event
export const generateTicket = async (req, res, next) => {
    try {
        const { eventId } = req.body;
        const userId = req.user._id;

        // Check if event exists
        const event = await Event.findById(eventId);
        if (!event) {
            throw new ApiError(404, "Event not found");
        }

        // Check if user is registered for the event (has "going" status and is in attendees list)
        const isGoing = event.stats.going.some(id => id.toString() === userId.toString());
        const attendeeRecord = event.attendees.find(a => a.userId.toString() === userId.toString());
        
        if (!isGoing || !attendeeRecord) {
            throw new ApiError(400, "You must be registered as 'going' for the event before generating a ticket");
        }

        // For paid events, check payment status
        if (event.ticketPrice > 0 && attendeeRecord.paymentStatus !== "paid") {
            throw new ApiError(400, "You must complete payment before generating a ticket");
        }

        // Check if user already has a ticket for this event
        const existingTicket = await Ticket.findOne({ eventId, userId });
        if (existingTicket) {
            throw new ApiError(400, "You already have a ticket for this event");
        }

        // Generate a unique ticket number
        const ticketNumber = `TKT-${crypto.randomBytes(4).toString('hex').toUpperCase()}-${Date.now().toString().slice(-6)}`;
        
        // Generate QR code data with ticket details
        const qrData = JSON.stringify({
            eventId: event._id.toString(),
            userId: userId.toString(),
            ticketNumber,
            timestamp: Date.now()
        });
        
        // Generate QR code as base64 string
        const qrCode = await generateQRCode(qrData);

        // Create the ticket
        const ticket = await Ticket.create({
            eventId,
            userId,
            qrCode,
            price: event.ticketPrice,
            ticketNumber,
            status: "active",
        });

        // Populate the ticket with event and user details
        await ticket.populate("eventId", "name startDate endDate location image");
        await ticket.populate("userId", "firstName lastName username profilePicture");

        // Return the created ticket
        return res.status(201).json(
            new ApiResponse(201, ticket, "Ticket generated successfully")
        );
    } catch (error) {
        next(error);
    }
};

// Verify a ticket (mark as used, for coordinators/volunteers/admins)
export const verifyTicket = async (req, res, next) => {
    try {
        const { ticketNumber } = req.body;
        const userId = req.user._id;

        // Find the ticket
        const ticket = await Ticket.findOne({ ticketNumber })
            .populate("eventId", "name startDate endDate location coordinators volunteers")
            .populate("userId", "firstName lastName username profilePicture");

        if (!ticket) {
            throw new ApiError(404, "Ticket not found");
        }

        // Check if ticket is already used or cancelled
        if (ticket.status === "used") {
            throw new ApiError(400, "Ticket has already been used");
        }

        if (ticket.status === "cancelled" || ticket.status === "expired") {
            throw new ApiError(400, `Ticket is ${ticket.status}`);
        }

        // Check if user is authorized (event coordinator, volunteer, or admin)
        const event = await Event.findById(ticket.eventId);
        const isCoordinator = event.coordinators.some(
            coordinator => coordinator.toString() === userId.toString()
        );
        const isVolunteer = event.volunteers.some(
            volunteer => volunteer.toString() === userId.toString()
        );
        
        if (!isCoordinator && !isVolunteer && req.user.role !== "admin") {
            throw new ApiError(403, "You are not authorized to verify tickets for this event");
        }

        // Mark ticket as used
        ticket.verified = true;  // This indicates the ticket has been checked by coordinator/volunteer
        ticket.status = "used";
        await ticket.save();

        // Return verification success
        return res.status(200).json(
            new ApiResponse(200, ticket, "Ticket verified successfully")
        );
    } catch (error) {
        next(error);
    }
};

// Get user tickets
export const getUserTickets = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { status } = req.query;

        // Build filter
        const filter = { userId };
        if (status) {
            filter.status = status;
        }

        // Find all tickets for the user
        const tickets = await Ticket.find(filter)
            .populate("eventId", "name startDate endDate location image")
            .sort({ createdAt: -1 });

        // Return the tickets
        return res.status(200).json(
            new ApiResponse(200, tickets, "User tickets fetched successfully")
        );
    } catch (error) {
        next(error);
    }
};

// Get ticket by ID
export const getTicketById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        // Find the ticket
        const ticket = await Ticket.findById(id)
            .populate("eventId", "name startDate endDate location coordinators volunteers image")
            .populate("userId", "firstName lastName username profilePicture");

        if (!ticket) {
            throw new ApiError(404, "Ticket not found");
        }

        // Check if user is authorized (ticket owner, coordinator, volunteer, or admin)
        const isOwner = ticket.userId._id.toString() === userId.toString();
        const isCoordinator = ticket.eventId.coordinators.some(
            coordinator => coordinator.toString() === userId.toString()
        );
        const isVolunteer = ticket.eventId.volunteers.some(
            volunteer => volunteer.toString() === userId.toString()
        );
        
        if (!isOwner && !isCoordinator && !isVolunteer && req.user.role !== "admin") {
            throw new ApiError(403, "You are not authorized to view this ticket");
        }

        // Return the ticket
        return res.status(200).json(
            new ApiResponse(200, ticket, "Ticket fetched successfully")
        );
    } catch (error) {
        next(error);
    }
};

// Cancel a ticket
export const cancelTicket = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        // Find the ticket
        const ticket = await Ticket.findById(id);
        if (!ticket) {
            throw new ApiError(404, "Ticket not found");
        }

        // Check if user is authorized (ticket owner or admin)
        const isOwner = ticket.userId.toString() === userId.toString();
        
        if (!isOwner && req.user.role !== "admin") {
            throw new ApiError(403, "You are not authorized to cancel this ticket");
        }

        // Check if ticket is already used or cancelled
        if (ticket.status === "used") {
            throw new ApiError(400, "Ticket has already been used");
        }

        if (ticket.status === "cancelled") {
            throw new ApiError(400, "Ticket is already cancelled");
        }

        // Mark ticket as cancelled
        ticket.status = "cancelled";
        await ticket.save();

        // Return success response
        return res.status(200).json(
            new ApiResponse(200, ticket, "Ticket cancelled successfully")
        );
    } catch (error) {
        next(error);
    }
};

// Get event tickets (for coordinators, volunteers, and admins)
export const getEventTickets = async (req, res, next) => {
    try {
        const { eventId } = req.params;
        const userId = req.user._id;
        const { status } = req.query;

        // Check if event exists
        const event = await Event.findById(eventId);
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
            throw new ApiError(403, "You are not authorized to view tickets for this event");
        }

        // Build filter
        const filter = { eventId };
        if (status) {
            filter.status = status;
        }

        // Find all tickets for the event
        const tickets = await Ticket.find(filter)
            .populate("userId", "firstName lastName username profilePicture email")
            .sort({ createdAt: -1 });

        // Calculate ticket statistics
        const stats = {
            total: tickets.length,
            active: tickets.filter(t => t.status === "active").length,
            used: tickets.filter(t => t.status === "used").length,
            cancelled: tickets.filter(t => t.status === "cancelled").length,
            expired: tickets.filter(t => t.status === "expired").length,
        };

        // Return the tickets
        return res.status(200).json(
            new ApiResponse(200, { tickets, stats }, "Event tickets fetched successfully")
        );
    } catch (error) {
        next(error);
    }
}; 