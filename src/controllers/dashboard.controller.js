import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Like } from "../models/like.model.js";
import { Subscription } from "../models/subscription.model.js";
import asyncHandler from "express-async-handler";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";

export const getChannelStats = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const totalSubscibers = await Subscription.aggregate([
    { $match: { channelId: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalSubscribers: { $sum: 1 },
      },
    },
  ]);
  const video = await Video.aggregate([
    {
      $match: {
        channelId: mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    {
      $project: {
        totalLikes: {
          $size: "likes",
        },
        totalViews: "$views",
        totalVideos: 1,
      },
    },
    {
      $group: {
        _id: null,
        totalLikes: {
          $sum: "$totalLikes",
        },
        totalViews: {
          $sum: "$totalViews",
        },
        totalVideos: {
          $sum: 1,
        },
      },
    },
  ]);
  const channelStats = {
    totalSubscribers: totalSubscibers[0]?.subscribersCount || 0,
    totalVideos: video[0]?.totalVideos || 0,
    totalLikes: video[0]?.totalLikes || 0,
    totalViews: video[0]?.totalViews || 0,
  };
  return res.status(200).json(
    new ApiResponse(200, true, "Channel stats fetched successfully", {
      channelStats,
    })
  );
});

export const getChannelVideos = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const videos = await Video.aggregate([
    {
      $match: { channelId: mongoose.Types.ObjectId(userId) },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    {
      $addFields: {
        createdAt: {
          $dateToParts: {
            date: "$createdAt",
          },
        },
        likesCount: {
          $size: "$likes",
        },
      },
    },
    {
      $project: {
        _id: 1,
        "videoFile.url": 1,
        "thumbnail.url": 1,
        title: 1,
        description: 1,
        createdAt: {
          year: 1,
          month: 1,
          day: 1,
        },
        isPublished: 1,
        likesCount: 1,
      },
    },
  ]);

  if (!videos) {
    throw new ApiError(404, "No videos found for this channel");
  }
  return res
    .status(200)
    .json(
      new ApiResponse(200, true, "Channel videos fetched successfully", videos)
    );
});
