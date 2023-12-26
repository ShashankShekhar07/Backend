// require('dotenv').config({path:'./env'})
import dotenv from "dotenv"
import connectDB from "./db/index.js";
import {app} from './app.js'
dotenv.config({
    path: './env'
})

connectDB() //Since it is a async await function it will give a promise
.then(()=>{
    app.listen(process.env.PORT || 8000 ,()=>{
        console.log(`Server is running at port : ${process.env.PORT}`);
    })
})
.catch((err)=>{
    console.log("MONGO db connection failed",err);
})





















/*
import mongoose from "mongoose";

import { DB_NAME } from "./constants";

import express from "express"
const app = express()
//TRY CATCH ALWAYS
// DATABASE IF FAR SO ALWAYS ASYNC AWAIT
//First method
// function connectDB(){

// }
// connectDB()

// Second method

;(async()=> {
    try{
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("error",()=>{
            console.log("ERR:",error);
            throw error
        })
        app.listen(process.env.PORT,()=>{
            console.log(`app is listening on Port ${process.env.PORT}`);
        })
    }

    catch(error){
        console.log("ERROR");
        throw err
    }
})()
*/