import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApIError.js";
import { uploadOnCloudinary } from "../utils/Cloudinary.js";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";


const registerUser = asyncHandler(async (req,res) =>{
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res
    
    //Get User Details
    const {username, fullName,email,password} = req.body
    // console.log("email",email);
    // console.log("password",password);


    //Validation
    // if(fullName=""){
    //     throw new ApiError(400,"Username is not given")
    // }

    if(
        [fullName,email,username,password].some((field)=>{ //The some method returns true if at least one element in the array satisfies the provided testing function.
            field?.trim() === "" //trim() scans the string from the beginning and removes any leading whitespace
        })
    ){
       throw new ApiError(400,"All fields are required") 
    }
    
    //Vcheck if user already exists agar pehle se koi bana hua hai toh
    const existedUser = await User.findOne({
        $or: [{username},{email}]
    })

    if(existedUser){
        throw new ApiError(409,"User with email or username already exists")        
    }

    //check for images, check for avatar

    const avatarLocalPath = req.files?.avatar[0].path;
    //files property is from multer such as body is from express
    // console.log(req.files);
    let coverImageLocalPath; 

    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is necessary")
    }

    // upload them to cloudinary, avatar

    const avatar =await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400,"Avatar file is necessary")
    }

    //create user object - create entry in db
    // whenever db is asked your only connection is User now

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        username: username.toLowerCase(),
        password,
        email
    })

    //remove password and refresh token field from response

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

 // check for user creation   

    if(!createdUser){
        throw new ApiError(500,"Something is wrong while entering the user details")
    }

    // return res

    return res.status(201).json(
        new ApiResponse(200,createdUser,"User registered Successfully")
    )

//     res.status(200).json({
//         message: "ok"
//     })
})


export {registerUser}