import AsyncHandler from "express-async-handler";
import { ApiError } from "../utils/apiError";
import { ApiResponse } from "../utils/apiResponse";

const healthcheck=AsyncHandler(async(req,res,next)=>{
    return res 
    .status(200)
    .json(new ApiResponse(200, {message: "All Good"}, "Server is running"))  
})

export default healthcheck 