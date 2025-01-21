import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    addCommentOnUserPost,
    deleteComment,
    getCommentsOfPost,
    updateComment,
} from "../controllers/comment.controllers.js";

const router = Router();

router.route("/new").post(verifyJWT, addCommentOnUserPost);
router.route("/:commentId/edit").patch(verifyJWT, updateComment);
router.route("/:commentId/delete").delete(verifyJWT, deleteComment);
router.route("/:postId/all").get(verifyJWT, getCommentsOfPost); // posts/:postId/comments

export default router;
