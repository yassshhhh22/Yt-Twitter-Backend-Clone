import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, "Username is required"],
    unique: true,
    trim: true,
    lowercase: true,
    index: true,
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    trim: true,
    lowercase: true,
  },
  fullname: {
    type: String,
    required: [true, "Fullname is required"],
    trim: true,
    index: true,
  },
  avatar: {
    type: String,
    default: "", // ✅ Allow users to register without an avatar
  },
  coverImage: {
    type: String,
    default: "", // ✅ Allow users to register without a cover image
  },
  watchHistory: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Video",
    },
  ],
  password: {
    type: String,
    required: [true, "Password is required"],
  },
  refreshToken: {
    type: String,
  },
});

// 🔹 Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next(); // ✅ Prevent double execution
  this.password = await bcrypt.hash(this.password, 8);
  next();
});

// 🔹 Compare passwords
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// 🔹 Generate access token
userSchema.methods.generateAccessToken = function () {
  if (!process.env.ACCESS_TOKEN_SECRET) throw new Error("Missing ACCESS_TOKEN_SECRET");
  return jwt.sign(
    {
      id: this._id,
      username: this.username,
      email: this.email,
      fullname: this.fullname,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "1h" } // ✅ Default expiry to 1 hour if missing
  );
};

// 🔹 Generate refresh token
userSchema.methods.generateRefreshToken = function () {
  if (!process.env.REFRESH_TOKEN_SECRET) throw new Error("Missing REFRESH_TOKEN_SECRET");
  return jwt.sign(
    { id: this._id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d" } // ✅ Default expiry to 7 days if missing
  );
};

export const User = mongoose.model("User", userSchema);
