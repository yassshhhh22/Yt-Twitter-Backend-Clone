import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  getLikedVideos,
  togglePostLike,
  toggleVideoLike,
  toggleCommentLike,
} from "../controllers/like.controller.js";

const router = Router();

router.use(verifyJWT);

router.route("/videos").get(getLikedVideos);
router.route("/videos/:id").post(toggleVideoLike);
router.route("/posts/:id").post(togglePostLike);
router.route("/comments/:id").post(toggleCommentLike);

export default router;
