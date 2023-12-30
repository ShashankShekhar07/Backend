import {Router} from "express"
import {registerUser} from "../controllers/user.controllers.js"
import {loginUser,logoutUser} from "../controllers/user.controller.js"
import { upload } from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router= Router()

router.route("/register").post(
    upload.fields([  //middleware
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser
    )

    //secured routes
router.route("/login").post(loginUser)
router.route("/logout").post(verifyJWT, logoutUser)

export default router