import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "express-async-handler";

export const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }
  const liked = await Like.findOne({
    video: videoId,
    likedBy: req.user?._id,
  });
  if (liked) {
    await liked.findByIdAndDelete(liked._id);
    return res
      .status(200)
      .json(
        new ApiResponse(200, "Video unliked successfully", { liked: false })
      );
  } else {
    await Like.create({
      video: videoId,
      likedBy: req.user?._id,
    });
    return res
      .status(201)
      .json(new ApiResponse(201, "Video liked successfully", { liked: true }));
  }
});

export const togglePostLike = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  if (!isValidObjectId(postId)) {
    throw new ApiError(400, "Invalid post id");
  }
  const liked = await Like.findOne({
    post: postId,
    likedBy: req.user?._id,
  });
  if (liked) {
    await liked.findByIdAndDelete(liked._id);
    return res
      .status(200)
      .json(
        new ApiResponse(200, "Post unliked successfully", { liked: false })
      );
  } else {
    await Like.create({
      post: postId,
      likedBy: req.user?._id,
    });
    return res
      .status(201)
      .json(new ApiResponse(201, "Post liked successfully", { liked: true }));
  }
});

export const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment id");
  }
  const liked = await Like.findOne({
    comment: commentId,
    likedBy: req.user?._id,
  });
  if (liked) {
    await liked.findByIdAndDelete(liked._id);
    return res
      .status(200)
      .json(
        new ApiResponse(200, "Comment unliked successfully", { liked: false })
      );
  }
  await Like.create({
    comment: commentId,
    likedBy: req.user?._id,
  });
  return res
    .status(201)
    .json(new ApiResponse(201, "Comment liked successfully", { liked: true }));
});

export const getLikedVideos = asyncHandler(async (req, res) => {
  const likedVideos = await Like.aggregate([
    {
      $match: {
        likedBy: mongoose.Types.ObjectId(req.user?._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "likedVideos",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "ownerDetails",
            },
          },
          {
            $unwind: "$ownerDetails",
          },
        ],
      },
    },
    {
      $unwind: "$likedVideos",
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $project: {
        _id: 0,
        likedVideos: {
          _id: 1,
          "videoFile.url": 1,
          "thumbnail.url": 1,
          owner: 1,
          title: 1,
          description: 1,
          description: 1,
          createdAt: 1,
          isPublished: 1,
          ownerDetails: {
            username: 1,
            fullName: 1,
            "avatar.url": 1,
          },
        },
      },
    },
  ]);
  return res
    .status(200)
    .json(
      new ApiResponse(200, "Liked videos fetched successfully", likedVideos)
    );
});
