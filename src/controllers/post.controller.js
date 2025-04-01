import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model";
import { Post } from "../models/post.model";
import { ApiError } from "../utils/apiError";
import { ApiResponse } from "../utils/apiResponse";
import asynchandler from "express-async-handler";

export const createPost = asynchandler(async (req, res) => {
  const { content } = req.body;
  if (!content) {
    throw new ApiError(400, "Post content is required");
  }
  const post = await Post.create({
    content,
    owner: req.user._id,
  });
  if (!post) {
    throw new ApiError(500, "Post creation failed");
  }
  return res
    .status(201)
    .json(new ApiResponse(201, "Post created successfully", post));
});

export const getUserPosts = asynchandler(async (req, res) => {
  const { userId } = req.params;
  if (!isValidObjectId(id)) {
    throw new ApiError(400, "Invalid user id");
  }
  const posts = await Post.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerDetails",
        pipeline: [
          {
            $project: {
              username: 1,
              "avatar.url": 1,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "post",
        as: "likes",
        pipeline: [
          {
            $project: {
              likedBy: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        likesCount: {
          $size: "$likeDetails",
        },
        ownerDetails: {
          $arrayElemAt: ["$ownerDetails", 0],
        },
        isLiked: {
          $cond: {
            if: { $in: [req.user._id, "$likeDetails.likedBy"] },
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
        content: 1,
        createdAt: 1,
        likesCount: 1,
        isLiked: 1,
        ownerDetails: {
          _id: "$ownerDetails._id",
          username: "$ownerDetails.username",
          "avatar.url": "$ownerDetails.avatar.url",
        },
      },
    },
  ]);
  return res
    .status(200)
    .json(new ApiResponse(200, "User posts fetched successfully", posts));
});

export const deletePost = asynchandler(async (req, res) => {
  const { postId } = req.params;
  if (!isValidObjectId(postId)) {
    throw new ApiError(400, "Invalid post id");
  }
  const post = await Post.findOneAndDelete({
    _id: postId,
    owner: req.user._id,
  });
  if (!post) {
    throw new ApiError(
      404,
      "Post not found or you are not authorized to delete it"
    );
  }
  if (post?.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(403, "You are not authorized to delete this post");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, "Post deleted successfully", post));
});
export const updatePost = asynchandler(async (req, res) => {
  const { postId } = req.params;
  const { content } = req.body;
  if (!isValidObjectId(postId)) {
    throw new ApiError(400, "Invalid post id");
  }
  if (!content) {
    throw new ApiError(400, "Post content is required");
  }
  const post = await Post.findOneAndUpdate(
    postId,
    {
      $set: {
        content,
      },
    },
    {
      new: true,
    }
  );
  if (!post) {
    throw new ApiError(
      404,
      "Post not found or you are not authorized to update it"
    );
  }
  if (post?.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(403, "You are not authorized to update this post");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, "Post updated successfully", post));
});
