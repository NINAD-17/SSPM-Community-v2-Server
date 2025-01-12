import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(
    cors({
        origin: process.env.CORS_ORIGIN,
        credentials: true,
    })
);

app.use(
    express.json({
        limit: "16kb",
    })
);

app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// Routes
import userRoutes from "./routes/user.routes.js";
import connectionRoutes from "./routes/connection.routes.js";
import followerRoutes from "./routes/follower.routes.js";

// Routes Declaration
app.use("/api/v2/users", userRoutes);
app.use("/api/v2/connections", connectionRoutes);
app.use("/api/v2/followers", followerRoutes);

export default app;