import mongoose, { isValidObjectId } from "mongoose";
import asynchandler from "express-async-handler";
import { User } from "../models/user.model.js";
import { Video } from "../models/video.model.js";
import { Comment } from "../models/comment.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { uploadOnCloudinary, deleteOnCloudinary } from "../utils/cloudinary";
import { url } from "inspector";

export const getAllVideos = asynchandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  const pipeline = [];
  if (query) {
    pipeline.push({
      $search: {
        index: "search-videos",
        text: {
          query: query,
          path: ["title", "description"],
        },
      },
    });
  }
  if (userId) {
    if (!isValidObjectId(userId)) {
      throw new ApiError(400, "Invalid user id");
    }
    pipeline.push({
      $match: {
        owner: mongoose.Types.ObjectId(userId),
      },
    });
  }
  if (sortBy && sortType) {
    pipeline.push({
      $sort: {
        [sortBy]: sortType === "asc" ? 1 : -1,
      },
    });
  } else {
    pipeline.push({
      $sort: {
        createdAt: -1,
      },
    });
  }
  pipeline.push(
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
      $unwind: "$ownerDetails",
    }
  );
  const videoAggregate = Video.aggregate(pipeline);
  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };
  const videos = await Video.aggregatePaginate(videoAggregate, options);
  return res
    .status(200)
    .json(new ApiResponse(200, "Videos fetched successfully", videos));
});

export const publishVideo = asynchandler(async (req, res) => {
  const { title, description } = req.body;
  if (!req.file) {
    throw new ApiError(400, "Please upload a video file");
  }
  if (!title || !description.some((field) => field.trim() === "")) {
    throw new ApiError(400, "Please provide title and description");
  }
  const videoFileLocalPath = req.file?.videoFile[0].path;
  const thumbnailFileLocalPath = req.file?.thumbnail[0].path;

  if (!videoFileLocalPath || !thumbnailFileLocalPath) {
    throw new ApiError(400, "Please upload video and thumbnail files");
  }
  const videoFile = await uploadOnCloudinary(videoFileLocalPath);
  const thumbnailFile = await uploadOnCloudinary(thumbnailFileLocalPath);
  const video = await Video.create({
    title,
    description,
    videoFile: {
      url: videoFile.url,
      publicId: videoFile.public_id,
    },
    thumbnail: {
      url: thumbnailFile.url,
      publicId: thumbnailFile.public_id,
    },
    owner: req.user._id,
    isPublished: false,
  });
  const videouploaded = await Video.findByIdAndUpdate(
    video._id,
    {
      $set: {
        isPublished: true,
      },
    },
    { new: true }
  );
  if (!videouploaded) {
    throw new ApiError(500, "Error publishing video");
  }
  return res
    .status(201)
    .json(new ApiResponse(201, "Video published successfully", video));
});

export const getVideoById = asynchandler(async (req, res) => {
  const { videoId } = req.params;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }
  if (!isValidObjectId(req.user?._id)) {
    throw new ApiError(400, "Invalid user id");
  }
  const video = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $lookup: {
              from: "subscriptions",
              localField: "_id",
              foreignField: "channel",
              as: "subscribers",
            },
          },
          {
            $addFields: {
              subscribersCount: {
                $size: "$subscribers",
              },
              isSubscribed: {
                $cond: {
                  if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                  then: true,
                  else: false,
                },
              },
            },
          },
          {
            $project: {
              username: 1,
              "avatar.url": 1,
              subscribersCount: 1,
              isSubscribed: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        isLiked: {
          $cond: {
            if: { $in: [req.user?._id, "$likes"] },
            then: true,
            else: false,
          },
        },
        likesCount: {
          $size: "$likes",
        },
        owner: {
          $arrayElemAt: ["$owner", 0],
        },
      },
    },
    {
      $project: {
        "videoFile.url": 1,
        owner: 1,
        title: 1,
        description: 1,
        views: 1,
        createdAt: 1,
        duration: 1,
        isLiked: 1,
        likesCount: 1,
        comments: 1,
      },
    },
  ]);
  if (!video === 0) {
    throw new ApiError(404, "Video not found");
  }
  await Video.findByIdAndUpdate(videoId, {
    $inc: {
      views: 1,
    },
  });
  await User.findByIdAndUpdate(req.user._id, {
    $addToSet: {
      history: videoId,
    },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, "Video fetched successfully", video[0]));
});

export const updateVideo = asynchandler(async (req, res) => {
  const { videoId } = req.params;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }
  if (video.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(403, "You are not authorized to update this video");
  }

  const { title, description } = req.body;
  if (!title && !description.some((field) => field.trim() === "")) {
    throw new ApiError(400, "Please provide title and description");
  }
  const thumbnailToDelete = video.thumbnail.publicId;
  const thumbnailLocalPath = req.file?.path;
  if (!thumbnailLocalPath) {
    throw new ApiError(400, "Please upload a thumbnail file");
  }
  const thumbnailFile = await uploadOnCloudinary(thumbnailLocalPath);
  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        title,
        description,
        thumbnail: {
          url: thumbnailFile.url,
          publicId: thumbnailFile.public_id,
        },
      },
    },
    { new: true }
  );
  if (!updatedVideo) {
    throw new ApiError(500, "Error updating video");
  }
  await deleteOnCloudinary(thumbnailToDelete);
  return res
    .status(200)
    .json(new ApiResponse(200, "Video updated successfully", updatedVideo));
});

export const deleteVideo = asynchandler(async (req, res) => {
  const { videoId } = req.params;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }
  if (video.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(403, "You are not authorized to delete this video");
  }
  const videoDeleted = await Video.findByIdAndDelete(videoId);
  if (!videoDeleted) {
    throw new ApiError(500, "Error deleting video");
  }
  await deleteOnCloudinary(video.videoFile.publicId);
  await deleteOnCloudinary(video.thumbnail.publicId);

  await Comment.deleteMany({ video: videoId });
  await Like.deleteMany({ video: videoId });
  await User.updateMany(
    { $pull: { history: videoId } },
    { new: true, multi: true }
  );
  return res
    .status(200)
    .json(new ApiResponse(200, "Video deleted successfully", null));
});

export const togglePublishStatus = asynchandler(async (req, res) => {
  const { videoId } = req.params;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }
  if (video.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(403, "You are not authorized to update this video");
  }
  const toggledVideoPublish = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        isPublished: !video?.isPublished,
      },
    },
    {
      new: true,
    }
  );
    if (!toggledVideoPublish) {
        throw new ApiError(500, "Error updating video publish status");
    }
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,{ 
          isPublished: toggledVideoPublish.isPublished,
        },
        "Video publish status updated successfully"
      )
    );
});
