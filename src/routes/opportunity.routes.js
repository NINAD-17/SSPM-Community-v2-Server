import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    createOpportunity,
    deleteOpportunity,
    editOpportunity,
    getAllOpportunities,
    getOpportunitiesByCategory,
    getOpportunitiesByUser,
    getOpportunityById,
} from "../controllers/opportunity.controllers.js";

const router = Router();

router.route("/create").post(verifyJWT, createOpportunity);
router.route("/:opportunityId/edit").patch(verifyJWT, editOpportunity);
router.route("/:opportunityId/delete").delete(verifyJWT, deleteOpportunity);

router.route("/").get(verifyJWT, getAllOpportunities);
router.route("/:opportunityId").get(verifyJWT, getOpportunityById);
router.route("/user/:userId").get(verifyJWT, getOpportunitiesByUser);
router.route("/category/:category").get(verifyJWT, getOpportunitiesByCategory);

export default router;
