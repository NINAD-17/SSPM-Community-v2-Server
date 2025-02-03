import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    getRecommendedGroups,
    getRecommendationsBySkills
} from "../controllers/recommendation.controllers.js";

const router = Router();

// Get recommendations based on logged-in user's skills
router.get("/groups", verifyJWT, getRecommendedGroups);

// Get recommendations based on provided skills
router.post("/groups/by-skills", verifyJWT, getRecommendationsBySkills);

export default router; 