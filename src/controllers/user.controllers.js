import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApIError.js";
import { uploadOnCloudinary } from "../utils/Cloudinary.js";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";

const generateAccessAndRefreshToken = async(userId)=>{
    try{
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken //save in user model
        await user.save({validateBeforeSave: false})
        return {accessToken,refreshToken}
    }
    catch(error){
        throw new ApiError(500,"Something went wrong while generating refresh and access token")
    }
}

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
    
    //check if user already exists agar pehle se koi bana hua hai toh
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
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

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

const loginUser= asyncHandler(async(req,res) =>{
    // req body -> data
    // username or email
    //find the user
    //password check
    //access and refresh token
    //send cookie 

    // req body -> data
    const {email,username,password} = req.body
    console.log(email);
    // // username or email
    if(!username && !email){
        throw new ApiError(400,"username or email is required")
    }

    //find the user
    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    //User is from mongoose database whereas user is the above information which we require now
    if(!user){
        throw new ApiError(404,"User does not exist")
    }

const passwordValid= await user.isPasswordCorrect(password) //ispasswordcorrect middleware we made in user.model.js

    if(!passwordValid){
        throw new ApiError(401,"Invlaid user credentials")
    }

    //access and referesh token
    const {accessToken,refreshToken} = await generateAccessAndRefreshToken(user._id)

       //Now we do not want password and refreshtoken to be visible to the user so we call a database query
   const loggedInUser = await User.findById(user._id).select("-password -refreshToken")
    
   //send cookie
   //For cookies only options
   const options={ //Only modified by Servers
    httpOnly: true,
    secure: true
   }

   return res 
   .status(200)
   .cookie("accessToken",accessToken,options)
   .cookie("refreshToken",refreshToken,options)
   .json(
    new ApiResponse(200,
        { //data
           user: loggedInUser,accessToken,refreshToken
           
        },
        "User logged in Successfully"
    )
   )
})

const logoutUser = asyncHandler(async(req,res) => {
    //You need user id for logout button but you can't access using
    //First verifyjwt from auth middleware will happen because of middleware setup through routes
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        { //new:true returns updated information about the person
            new: true //if you wanted to add something extra
        }
    )

    const options={ //Only modified by Servers
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken",options)    //to delete cookie option
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User Logged Out"))
})

const refreshAccessToken = asyncHandler(async(req,res)=>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    if(!incomingRefreshToken){
        throw new ApiError(401,"unauthorized request")
    }
    
    try{
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )

        const user = User.findById(decodedToken?._id)

        if(!user) throw new ApiError(401,"Invalid refresh Token")
        
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401,"Refresh token is expired")
        }

        const options ={
            httpOnly: true,
            secure: true,
        }
        //Generating new refreshtoken
        const {accessToken,newRefreshToken} = generateAccessAndRefreshToken(user._id)

        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200, 
                {accessToken, refreshToken: newRefreshToken},
                "Access token refreshed"
            )
        )
    }
    catch(error){

    }
})

//new: true returns new object wiht updated information
const changeCurrentPassword = asyncHandler(async(req,res)=>{
    const {oldPassword,newPassword} = req.body

    //If user is logged in then certainly auth middleware is used so req will be having user 
    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(400,"Invalid Old Password")

    }

    user.password=newPassword
    await user.save({validateBeforeSave: false})
    
    return res
    .status(200)
    .json(new ApiResponse(200,{},"Password Changed Successfully"))
})

const getCurrentUser= asyncHandler((req,res)=>{
    return res
    .status(200)
    .json(new ApiResponse(
        200,
        req.user,
        "User fetched successfully"
    ))
})

const updateAccountDetails = asyncHandler(async(req,res) => {
    const {fullName,email} = req.body
    
    if(!fullName || !email){
        throw new ApiError(400,"All fields are required")
    }

    const user = await User.findByIdAndUpdate(req.user._id,{
        $set: {
            fullName: fullName,
            email:email
        }
    },{
        new: true, //returns updated information to the user
    }
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200,user,"Account Details updated successfully"))
});

const updateUserAvatar = asyncHandler(async(req,res)=>{
    const UserAvatarLocalPath = req.file?.path
    if(!UserAvatarLocalPath){
        throw new ApiError(400,"No user avatar")
    }

    const avatar = uploadOnCloudinary(UserAvatarLocalPath)

    if(!avatar.url){
        throw new ApiError(400,"Error while uploading on avatar")
    }
    const user = await User.findByIdAndUpdate(
        req.user_id,{
            $set: {
                avatar: avatar.url
            }
        },
        {
            new: true,
        }
    ).select("-password")
    
    return res
    .status(200)
    .json(
        new ApiResponse(200,user,"Avatar changed")
    )
})

const updateCoverImage = asyncHandler(async(req,res)=>{
    const coverImageLocalPath =req.file?.path
    if(!coverImageLocalPath){
        throw new ApiError(400,"No cover Image found")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url){
        throw new ApiError(400,"No cover image uploaded to cloudinary")
    }

    const user= User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage:  coverImage.url
            }
        },
        {
            new: true
        }  
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200,user,"Cover image Updated successfully")
    )
})

//Now we need to calculate the number of people who we have subscribed and who have subscribed us
//to calculate this first create documents each having a channel and its subscriber
//So when we want to calculate no of subscribers we will count the no of documents with the channel name
//whereas when we want no of channels a subscriber have subscribed we will count the number of documents having the given subscriber 

const getUserChannelProfile = asyncHandler(async(req,res)=>{
    const {username} = req.params

    if(!username?.trim()){
        throw new ApiError(400,"Username is missing")
    }

    const channel= await User.aggregate([
        {
            $match: {
                username : username?.toLowerCase()
            }
        },
        {
            $lookup: { //join to calculate no of subscribers by searching the channel name
                from: "subscriptions", //the Subscription turns into plural
                localField: "_id",
                foreignField : "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: { //join to calculate no of channels subscribed by the person
                from: "subscriptions", //the Subscription turns into plural
                localField: "_id",
                foreignField : "subscriber",
                as: "subscribedTo"
            }
        },//Till here we only got the table having subscribers and subscribed to 
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedTo: {
                    $size : "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id,"$subscribers.subscriber"]},
                        //Here subscribers.subscriber is an object and in operator is used to search in an aray or an object                        
                        else: false,
                    }
                }
            }
        },
        {
            $project :{ //used to show only some stuff
                fullName: 1,
                username: 1, // where 1 is used it will get projected
                subscribersCount: 1,
                channelsSubscribedTo: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
    ])

    //Now when aggregation is done it returns an array with objects in it 
    //Here we will only have 1 object that is why we need to return channel[0]
    if(channel?.length<=0){
        throw new ApiError(400,"Channel does not exists")
    }
        
    return res
    .status(200)
    .json(
        new ApiResponse(200,channel[0],"User channel fetched successfully")
    )

})


const getWatchHistory = asyncHandler(async(req,res)=>{
    const user = await User.aggregate([
        {
            $match: {
                //Mongoose gives a string which it itselves convert while find operation but here we will need to change it
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "WatchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from : "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1,
                                    }
                                }
                            ]
                        }
                    },//Here owner returns an array with projected owners
                    {  //   This makes it return object owner which is easy to manipulate
                        $addFields: {
                            owner: {
                                $first : "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(200,user[0].watchHistory,"Watch history fetched successfully")
    )
})
export {registerUser,loginUser,logoutUser,
    refreshAccessToken,changeCurrentPassword,getCurrentUser,
    updateAccountDetails,updateCoverImage,updateUserAvatar,
    getUserChannelProfile,getWatchHistory}


