import { Router } from "express";
import { verifyJWT, isAdmin } from "../middlewares/auth.middleware.js";
import {
    generateTicket,
    verifyTicket,
    getUserTickets,
    getTicketById,
    cancelTicket,
    getEventTickets
} from "../controllers/ticket.controllers.js";

const router = Router();

// Apply JWT verification to all routes
router.use(verifyJWT);

// Ticket routes
router.post("/", generateTicket);
router.post("/verify", verifyTicket);
router.get("/", getUserTickets);
router.get("/:id", getTicketById);
router.post("/:id/cancel", cancelTicket);

// Event tickets route
router.get("/event/:eventId", getEventTickets);

export default router; 