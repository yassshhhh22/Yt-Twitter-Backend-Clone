import asynchandler from "express-async-handler";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshtokens = async (userId) => {
  try {
    // console.log("Generating tokens for user:", userId);
    const user = await User.findById(userId);

    if (!user) {
      // console.error("User not found for ID:", userId);
      throw new ApiError(404, "User not found");
    }

    // console.log("User found:", user.username);

    if (!user.generateAccessToken() || !user.generateRefreshToken()) {
      // console.error("Token generation methods are missing in User model");
      throw new ApiError(500, "Token generation methods missing");
    }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // console.log("Access Token:", accessToken);
    // console.log("Refresh Token:", refreshToken);

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    // console.log("Tokens generated successfully!");
    return { accessToken, refreshToken };
  } catch (error) {
    // console.error("Error in generateAccessAndRefreshtokens:", error);
    throw new ApiError(
      500,
      "Something went wrong while generating refresh access token"
    );
  }
};

export const loginUser = asynchandler(async (req, res) => {
  // req body -> data
  // username and email
  // find the user
  // password check
  // access and refresh token
  // send cookies
  // send response

  const { email, username, password } = req.body;
  if (!(username || email)) {
    throw new ApiError(400, "Username or email is required");
  }
  const user = await User.findOne({
    $or: [{ username: username?.toLowerCase() }, { email }],
  });
  if (!user) {
    throw new ApiError(401, "Invalid username/password");
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new ApiError(401, "Invalid username or password");
  }
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshTokens"
  );
  const { accessToken, refreshToken } = await generateAccessAndRefreshtokens(
    user._id
  );
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully"
      )
    );
});
export const registerUser = asynchandler(async (req, res) => {
  //get user data
  //create user
  //send access and refresh token
  //send response
  const { fullname, email, username, password } = req.body;
  console.log(req.body);
  if (!fullname || !email || !username || !password || password.trim() === "") {
    throw new ApiError(400, "All fields are required");
  }

  //check if user already exists
  const existingUser = await User.findOne({ $or: [{ email }, { username }] });
  if (existingUser) {
    throw new ApiError(400, "User already exists");
  }
  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  let coverImageLocalPath = req.files?.coverImage?.[0]?.path;

  if (
    req.files &&
    Array.isArray(req.files.coverImage && req.files.coverImage.length > 0)
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }
  if (!avatarLocalPath) {
    throw new ApiError(400, "Please upload an avatar");
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(500, "Something went wrong while uploading avatar");
  }

  const user = await User.create({
    fullname,
    email,
    username: username.toLowerCase(),
    password,
    avatar: avatar?.secure_url || "",
    coverImage: coverImage?.secure_url || "",
  });
  const createdUser = await User.findById(user._id).select(
    "-password -refreshTokens"
  );
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while creating user");
  }
  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User created successfully"));
});
export const logoutUser = asynchandler(async (req, res) => {
  //clear cookies
  //send response
  await User.findByIdAndUpdate(req.user._id, {
    refreshToken: "",
  });
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});
export const refreshAccessToken = asynchandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;
  if (!incomingRefreshToken) {
    throw new ApiError(400, "Refresh token is required");
  }
  try {
    const decoded = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decoded?.id);
    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }
    const { accessToken, refreshToken } = await generateAccessAndRefreshtokens(
      user._id
    );
    const options = {
      httpOnly: true,
      secure: true,
    };
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken },
          "Access token refreshed successfully"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});
export const changeCurrentPassword = asynchandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user?._id);
  const ispasswordMatch = await user.comparePassword(oldPassword);
  if (!ispasswordMatch) {
    throw new ApiError(400, "Invalid password");
  }
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});
export const getCurrentUser = asynchandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User details fetched successfully"));
});
export const updateAccountDetails = asynchandler(async (req, res) => {
  // console.log("User from request:", req.user); // Debugging

  const { fullname, email } = req.body;

  if (!req.user?._id) {
    throw new ApiError(401, "Unauthorized request");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id, // Make sure this exists
    { fullname, email },
    { new: true }
  )
    .select("-password")
    .lean();

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});
export const updateUserAvatar = asynchandler(async (req, res) => {
  const avatarLocalpath = req.file?.path;
  if (!avatarLocalpath) {
    throw new ApiError(400, "Please upload an avatar");
  }
  const avatar = await uploadonCloudinary(avatarLocalpath);
  if (!avatar.url) {
    throw new ApiError(500, "Something went wrong while uploading avatar");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { avatar: avatar.url },
    { new: true }
  )
    .lean()
    .select("-password");
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully"));
});
export const updateUserCoverImage = asynchandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;
  if (!coverImageLocalPath) {
    throw new ApiError(400, "Please upload a cover image");
  }
  const coverImage = await uploadonCloudinary(coverImageLocalPath);
  if (!coverImage.url) {
    throw new ApiError(500, "Something went wrong while uploading cover image");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { coverImage: coverImage.url },
    { new: true }
  )
    .lean()
    .select("-password");
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover image updated successfully"));
});
export const getUserChannelProfile = asynchandler(async (req, res) => {
  const { username } = req.params;
  if (!username) {
    throw new ApiError(400, "Username is required");
  }
  const channel = await User.aggregate([
    {
      $match: { username: username?.toLowerCase() },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribedChannels",
      },
    },
    {
      $addFields: {
        totalSubscribers: { $size: "$subscribers" },
        totalSubscribedTo: { $size: "$subscribedTo" },
        isSubscribed: {
          $cond: {
            if: {
              $in: [req.user?._id, "$subscribers.subscriber"],
            },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        avatar: 1,
        coverImage: 1,
        totalSubscribers: 1,
        totalSubscribedTo: 1,
        isSubscribed: 1,
      },
    },
  ]);
  console.log("Channel:", channel);
  if (!channel) {
    throw new ApiError(404, "Channel not found");
  }
  return res
    .status(200)
    .json(
      new ApiResponse(200, channel, "Channel profile fetched successfully")
    );
});
export const getWatchHistory = asynchandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0]?.watchHistory,
        "Watch history fetched successfully"
      )
    );
});
