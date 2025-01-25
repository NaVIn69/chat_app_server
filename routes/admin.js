import express from "express"
import {adminLogin, adminLogout, allChats, allMessages, allUsers, getAdminData, getDashboardStats} from "../controllers/admin.js"
import { adminLoginValidator, validateHandler } from "../lib/validators.js";
import { adminOnly } from "../middlewares/auth.js";

const app = express.Router();



app.use(express.json());

app.post("/verify",adminLoginValidator(), validateHandler ,adminLogin)

app.get("/logout",adminLogout)


// only admin can access these routes
app.use(adminOnly);
app.get("/",getAdminData);

// here we get all the user data  
app.get("/users",allUsers)


app.get("/chats",allChats)

app.get("/messages",allMessages);

app.get("/stats",getDashboardStats);



export default app;