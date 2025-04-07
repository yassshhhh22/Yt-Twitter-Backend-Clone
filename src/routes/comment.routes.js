import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  addComment,
  deleteComments,
  getVideoComments,
  updateComment,
} from "../controllers/comment.controller.js";

const router = Router();

router.use(verifyJWT);

router.route("/videos/:id").get(getVideoComments).post(addComment);
router.route("/c/:commentId").patch(updateComment).delete(deleteComments);