import dotenv from "dotenv";
import connectDB from "./db/index.js";
import app from "./app.js";
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import initializeSocket from './sockets/socket.js';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables with explicit path
dotenv.config({ path: path.join(__dirname, '../.env') });

connectDB()
    .then(() => {
        // Create HTTP server from Express app
        const httpServer = createServer(app);
        
        // Initialize Socket.IO
        const socketServer = initializeSocket(httpServer); // IO
        
        // Store socket server instance on app for use in routes
        app.set('socketServer', socketServer);

        // Listen on HTTP server instead of app
        httpServer.listen(process.env.PORT || 8000, () => {
            console.log(`Server is running at port: ${process.env.PORT}`);
        });

        httpServer.on("error", (error) => {
            console.log("Error: ", error);
            throw error;
        });
    })
    .catch((error) => {
        console.log("MONGODB connection failed !!! ", error);
    });
    