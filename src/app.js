import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { ApiError } from "./utils/apiError.js";

const app = express();

// CORS Configuration - must be before any route declarations
app.use(
    cors({
        origin: process.env.CORS_ORIGIN, 
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
import userPostRoutes from "./routes/userPost.routes.js"
import recommendationRoutes from "./routes/recommendation.routes.js";
import groupRoutes from "./routes/group.routes.js";
import groupPostRoutes from "./routes/groupPost.routes.js";
import opportunityRoutes from "./routes/opportunity.routes.js";

// Routes Declaration
app.use("/api/v2/auth", authRoutes);
app.use("/api/v2/healthcheck", healthCheckRoutes);
app.use("/api/v2/users", userRoutes);
app.use("/api/v2/posts", userPostRoutes);
app.use("/api/v2/connections", connectionRoutes);
app.use("/api/v2/followers", followerRoutes);
app.use("/api/v2/recommendations", recommendationRoutes);
app.use("/api/v2/groups", groupRoutes);
app.use("/api/v2/group-posts", groupPostRoutes);
app.use("/api/v2/opportunities", opportunityRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json(
        new ApiError(
            500,
            "Something went wrong!"
        )
    );
});

export default app;
