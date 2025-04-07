import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comments.model.js";
import asynchandler from "express-async-handler";
import { Video } from "../models/videos.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";

export const getVideoComments = asynchandler(async (req, res) => {
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  const comments = await Comment.aggregate([
    {
      $match: {
        video: videoId,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
      },
    },
    {
      $addFields: {
        likesCount: {
          $size: "$likes",
        },
        owner: {
          $arrayElemAt: ["$owner", 0],
        },
        isLiked: {
          $cond: {
            if: {
              $in: [mongoose.Types.ObjectId(req.user?._id), "$likes.likedBy"],
            },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $project: {
        content: "$content",
        createdAt: 1,
        likesCount: 1,
        owner: {
          username: 1,
          fullName: 1,
          "avatar.url": 1,
        },
        isLiked: 1,
      },
    },
  ]);
  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };
  const videoComments = await Comment.aggregatePaginate(comments, options);

  return res
    .status(200)
    .json(new ApiResponse(200, "Comments fetched successfully", videoComments));
});

export const addComment = asynchandler(async (req, res) => {
  const { videoId } = req.params;
  const { content } = req.body;
  if (!content || content.trim() === "") {
    throw new ApiError(400, "Comment content is required");
  }
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }
  const comment = await Comment.create({
    content,
    video: videoId,
    owner: req.user?._id,
  });
  if (!comment) {
    throw new ApiError(500, "Comment not created");
  }
  return res
    .status(201)
    .json(new ApiResponse(201, "Comment created successfully", comment));
});

export const updateComment = asynchandler(async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;
  if (!content || content.trim() === "") {
    throw new ApiError(400, "Comment content is required");
  }
  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment id");
  }
  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }
  if (comment.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(403, "You are not allowed to update this comment");
  }
  const updatedComment = await Comment.findByIdAndUpdate(
    comment?._id,
    { $set: { content } },
    { new: true }
  );
  if (!updatedComment) {
    throw new ApiError(500, "Comment not updated");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, "Comment updated successfully", updatedComment));
});

export const deleteComments = asynchandler(async (req, res) => {
  const { commentId } = req.params;
  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment id");
  }
  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }
  if (comment.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(403, "You are not allowed to delete this comment");
  }
  await Comment.findByIdAndDelete(commentId);

  try {
    await Like.deleteMany({
      comment: commentId,
      likedBy: req.user,
    });
  } catch (error) {
    console.log("Error: ", error);
  }

  if (!deletedComment) {
    throw new ApiError(500, "Comment not deleted");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, "Comment deleted successfully", { commentId }));
});
