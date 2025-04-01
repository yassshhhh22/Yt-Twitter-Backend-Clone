import { Router } from "express";
import {
    createPost,
    deletePost,
    getUserPosts,
    updatePost,
} from "../controllers/post.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verifyJWT);

router.route("/").post(createPost);
router.route("/user/:id").get(getUserPosts);
router.route("/:id").delete(deletePost).patch(updatePost);

export default router;