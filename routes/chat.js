import express from "express";
import { isAuthenticated } from "../middlewares/auth.js";
import { getMyChats, newGroupChat ,getMyGroups, addMembers, removeMember, leaveGroup, sendAttachment, getChatDetails, renameGroup, deleteChat, getMessages} from "../controllers/chat.js";
import { attachmentsMulter } from "../middlewares/multer.js";
import { newGroupValidator, validateHandler,addMembersValidator, removeMembersValidator,leaveGroupValidators,sendAttachmentValidators,  chatIdValidators ,renameValidators} from "../lib/validators.js";

const app= express.Router();

//http://localhost:3000/user/ 


// after this user must bee logged in to access the routes

app.use(isAuthenticated);

app.post('/new',newGroupValidator(),validateHandler,newGroupChat);
app.get("/my",getMyChats);
app.get("/my/groups",getMyGroups);
app.put("/addmembers",addMembersValidator(),validateHandler,addMembers)
app.put("/removemember",removeMembersValidator(),validateHandler,removeMember);
app.delete("/leave/:id",leaveGroupValidators(),validateHandler,leaveGroup);

// send attachment 
app.post("/message",attachmentsMulter,sendAttachmentValidators(),sendAttachment)
// get Message 
app.get("/message/:id",chatIdValidators(),validateHandler,getMessages);

// get Chat detail , rename detail
// here we have written  it in the last because "/id" is my the chatId
app.route("/:id")
.get(chatIdValidators(),validateHandler,getChatDetails)
.put(renameValidators(),validateHandler,renameGroup)
.delete(chatIdValidators(),validateHandler,deleteChat);


export default app;