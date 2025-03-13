import mongoose from 'mongoose';
import asynchandler from 'express-async-handler';
import { YtTwitter } from "../constants.js";

const connectDB = asynchandler(async () => {
    const connectionInstance = await mongoose.connect(`${process.env.MONGO_URI}/${YtTwitter}`)
    console.log(`MongoDB Connected: ${connectionInstance.connection.host}`);
})

export default connectDB;