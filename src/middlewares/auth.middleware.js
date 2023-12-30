// import { ApiError } from "../utils/ApIError.js";
import { ApiError } from "../utils/ApIError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt  from "jsonwebtoken";
import { User } from "../models/user.model.js";

//when logged in you will enter accesstoken and refreshtoken but while logging out you will require id from access token fo rwhich we are making this middleware 
export const verifyJWT = asyncHandler(async(req,res,next)=>{
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","") //Header under authorization has "bearer <token>""
        if(!token){
            throw new ApiError(401,"Unauthorized request")
        }
        const decodedToken = jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)

        const user= await User.findById(decodedToken?._id).select("-password -refreshToken")

        if(!user){
            throw new ApiError(401,"Invalid Access Token")
        }

        req.user = user;
        next()
    } catch (error) {
        throw new ApiError(401,error?.mesesage || "Invalid access Token")
    }
})
