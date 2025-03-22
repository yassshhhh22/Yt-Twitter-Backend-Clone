import { Router } from "express";
import {
    publishVideo,
    getAllVideos,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}from "../controllers/video.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/upload.middleware.js";

const router = Router();
router.use(verifyJWT);

router.route("/")
    .get(getAllVideos)
    .post(upload.fields([
        {
            name: "thumbnail",
            maxCount: 1
        },
        {
            name: "video",
            maxCount: 1
        }
    ]), publishVideo);

router.route("/:videoid")
    .get(getVideoById)
    .put(updateVideo)
    .delete(deleteVideo)
    .patch(upload.single("thumbnail"), updateVideo);

router.route("/toggle/publish/:videoid")
    .patch(togglePublishStatus);

export default router;