import express from "express";
import {
    reportPost,
    getReportedPosts,
    reviewReport,
} from "../controllers/report.controllers.js";
import { verifyJWT, isAdmin } from "../middlewares/auth.middleware.js";
import { validateAndSanitizeInput } from "../middlewares/validateAndSanitizeInput.js";
import { reportPostSchema } from "../validators/reportPost.validators.js";

const router = express.Router();

router.post(
    "/new",
    verifyJWT,
    validateAndSanitizeInput(reportPostSchema),
    reportPost
); // User reports a post

router.get("/pending", verifyJWT, isAdmin, getReportedPosts); // Admin gets all pending reports
router.put("/:reportId/review", verifyJWT, isAdmin, reviewReport); // Admin reviews and deletes reported post

export default router;
