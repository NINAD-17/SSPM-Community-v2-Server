import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { ApiResponse } from "./utils/apiResponse.js";

const app = express();

// CORS Configuration - must be before any route declarations
app.use(
    cors({
        origin: "http://localhost:5173", // Explicitly set the origin instead of using env variable for testing
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
        exposedHeaders: ["set-cookie"],
    })
);

// Add OPTIONS handling for preflight requests - explicitly
app.options("*", cors());

// Parse JSON bodies
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// Routes
import userRoutes from "./routes/user.routes.js";
import connectionRoutes from "./routes/connection.routes.js";
import followerRoutes from "./routes/follower.routes.js";
import authRoutes from "./routes/auth.routes.js";
import healthCheckRoutes from "./routes/healthCheck.routes.js";

// Routes Declaration
app.use("/api/v2/auth", authRoutes);
app.use("/api/v2/healthcheck", healthCheckRoutes);
app.use("/api/v2/users", userRoutes);
app.use("/api/v2/connections", connectionRoutes);
app.use("/api/v2/followers", followerRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json(
        new ApiResponse(
            500,
            process.env.NODE_ENV === "development" ? err.message : undefined,
            "Something went wrong!"
        )
    );
});

export default app;
