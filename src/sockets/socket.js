import { Server } from "socket.io";
import { handleSocketAuth } from "./socketMiddleware.js";
import { registerSocketHandlers } from "./socketHandlers.js";

// Map to store active user connections
const userSocketMap = new Map(); // userId -> Set of socket IDs
const socketUserMap = new Map(); // socket ID -> userId

const initializeSocket = (httpServer) => {
    const io = new Server(httpServer, {
        cors: {
            origin: process.env.CORS_ORIGIN,
            credentials: true,
            methods: ["GET", "POST"]
        },
        pingTimeout: 60000, // Close connection after 60s of inactivity
    });

    // Middleware to authenticate socket connections
    io.use(handleSocketAuth);

    // Handle socket connections
    io.on("connection", (socket) => {
        const userId = socket.user._id.toString();

        // Store socket connection
        if (!userSocketMap.has(userId)) {
            userSocketMap.set(userId, new Set());
        }
        userSocketMap.get(userId).add(socket.id);
        socketUserMap.set(socket.id, userId);

        // Log connection
        console.log(`User connected: ${userId}, Socket ID: ${socket.id}`);

        // Register all event handlers
        registerSocketHandlers(io, socket, { userSocketMap, socketUserMap });

        // Handle disconnection
        socket.on("disconnect", () => {
            console.log(`User disconnected: ${userId}, Socket ID: ${socket.id}`);
            
            // Remove socket from maps
            const userSockets = userSocketMap.get(userId);
            if (userSockets) {
                userSockets.delete(socket.id);
                if (userSockets.size === 0) {
                    userSocketMap.delete(userId);
                }
            }
            socketUserMap.delete(socket.id);

            // Broadcast user offline status is handled in socketHandlers.js
        });
    });

    // Create utility functions for the rest of the application
    const socketUtils = {
        io,
        isUserOnline: (userId) => userSocketMap.has(userId),
        getUserSockets: (userId) => userSocketMap.get(userId),
        emitToUser: (userId, event, data) => {
            const userSockets = userSocketMap.get(userId);
            if (userSockets) {
                io.to([...userSockets]).emit(event, data);
            }
        },
        emitToConversation: (conversationId, event, data) => {
            io.to(conversationId).emit(event, data);
        }
    };

    return socketUtils;
};

export default initializeSocket;



