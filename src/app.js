import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
const app = express()
//app.use when using a middleware like CORS
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({
    limit: "16kb"
}))
app.use(express.urlencoded({extended: true,limit: "16kb"}))
app.use(express.static("public")) //public  folder for storing assets like images etc
app.use(cookieParser())

//Router import

import userRouter from './routes/user.routes.js'
app.use("/api/v1/users",userRouter)

export {app}