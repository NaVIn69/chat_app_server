import express from "express";
import { getMyProfile, login,newUser,logout,searchUser, sendFriendRequest, acceptFriendRequest, getMyNotifications,getMyFriends} from "../controllers/user.js";
import { singleAvatar } from "../middlewares/multer.js";
import { isAuthenticated } from "../middlewares/auth.js";
import { loginValidator, registerValidator,validateHandler,sendRequestValidators , acceptRequestValidators, } from "../lib/validators.js";

const app= express.Router();
// here we are using the express.Router() bcz jispe middleware lgna chahte hai uspe hi sirf lgayenge
//  

//http://localhost:3000/user/ 

app.post("/new",singleAvatar,registerValidator(),validateHandler,newUser);
app.post("/login" ,loginValidator(),validateHandler,login);

// after this user must bee logged in to access the routes

// due to express.Router 
// app.use() ke badd wale sare route pe ye middleware lagega 
// route hit hote hi ye middleware call hota 
app.use(isAuthenticated);

app.get("/me",getMyProfile);
app.get("/logout",logout);
app.get("/search",searchUser);
app.put("/sendRequest",sendRequestValidators(),validateHandler,sendFriendRequest)
app.put("/acceptrequest", acceptRequestValidators() , validateHandler , acceptFriendRequest)
app.get(
    "/notifications",
   
    getMyNotifications
)

app.get("/friends",getMyFriends);

export default app;