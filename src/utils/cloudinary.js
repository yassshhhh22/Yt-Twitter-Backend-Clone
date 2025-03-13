import { v2 as cloudinary } from 'cloudinary'
import fs from 'fs';
import { ApiError } from './apiError.js';
          
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});
const uploadOnCloudinary= async (localFilePath) => {
    try {
        if(!localFilePath) {
            throw new ApiError(400, "Please provide a file path");
        }
        const uploadedResponse = await cloudinary.uploader.upload(localFilePath);
        fs.unlinkSync(localFilePath);
        return uploadedResponse;
    }catch{
        fs.unlinkSync(localFilePath);
        throw new ApiError(500, "Failed to upload file");
    }
}
const deleteOnCloudinary = async (publicId, resource_type = "image") => {
    try {
        if (!publicId) return null;
        const response = await cloudinary.uploader.destroy(publicId, {
            resource_type,
        })

        return response
    } catch (error) {
        new ApiError(500, error.message)
        return null
    }
}

export {uploadOnCloudinary, deleteOnCloudinary}