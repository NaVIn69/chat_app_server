import express from "express"
import { connectDB } from "./utlis/features.js";
import dotenv from 'dotenv'
import { errorMiddleWare } from "./middlewares/error.js";
import cookieParser from "cookie-parser"
import { createGroupChats,createSingleChats,createMessagesInAChat } from "./seeders/chat.js";
import { Server } from 'socket.io'
import { createServer } from "http"
import {v4 as uuid} from "uuid"
import { getSockets } from "./lib/helper.js";
import cors from "cors";
import {v2 as cloudinary}   from "cloudinary"

import userRoute from "./routes/user.js"
import chatRoute from "./routes/chat.js"
import adminRoute from "./routes/admin.js"

import { Socket } from "socket.io";
import { NEW_MESSAGE, NEW_MESSAGE_ALERT,ONLINE_USERS,START_TYPING,STOP_TYPING,CHAT_JOINED,CHAT_LEAVED } from "./constants/events.js";
import { Message } from "./models/message.js";
import { corsOptions } from "./constants/config.js";
import { socketAuthenticator } from "./middlewares/auth.js";



dotenv.config({
    path:"./.env",
})

const mongoURI=process.env.MONGO_URI

const PORT=process.env.PORT||3000;
const adminSecretKey = process.env.ADMIN_SECRET_KEY || "adsasdsdfsdfsdfd";
const envMode= process.env.NODE_ENV.trim() || "PRODUCTION";
const userSocketIDs =new Map(); 
const OnlineUsers=new Set();
// here userSocketIDs have all the current active user which is connected
// after disconnected , we have to remove from the userSocketIDs

connectDB(mongoURI);
cloudinary.config({
  cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
  api_key:process.env.CLOUDINARY_API_KEY,
  api_secret:process.env.CLOUDINARY_API_SECRET,
})
// createUser(10);
// createSingleChats(10);
// createGroupChats(10);
// createMessagesInAChat("672c87a9500d4857196e4f1e",50)

const app= express();
const server = createServer(app);

const io= new Server(server , {
  cors:corsOptions
});
// here we setting the insatnce of "io" to io to access in the anythings
app.set("io",io);


app.use(express.json())

app.use(cookieParser());
app.use(cors(corsOptions));

// app.use(cors({
//   // here we can pass the origin of all things means kon kon se url allow krna hai
// // in origin we can pass the array of url
//   origin:["http://localhost:5173","http://localhost:4173",
//     process.env.CLIENT_URL,
//   ],
//   credentials:true,
//   // due to credential true, we can send from anything header 
// }));


app.use('/api/v1/user',userRoute)
app.use('/api/v1/chat',chatRoute)
app.use('/api/v1/admin',adminRoute);


app.get("/",(req,res)=>{
     res.send("hello")
})
io.use((socket, next) => {
  cookieParser()(socket.request, socket.request.res, async (err) => {
    await socketAuthenticator( err, socket, next );
  });
});


// ye io.use middleware  wale ke badd hi socket se connect ho payenge


// here we setting the socket and we can access the individual socket
io.on("connection",(socket)=>{
  // here we accessing the token  for getting the user data which is passed in the option

  // socket.handshake.query.user
  const user=socket.user;
  // console.log("user",user);
    
    // this user comes from the authentication
    // here w e have the information about the user
    // here we are mapping the socket id on the userid
    userSocketIDs.set(user._id.toString(),socket.id);

    // here user._id is connected to the socket._id 
    // console.log(userSocketIDs);
    // currently active all the user

  // console.log("a user connected ",socket.id);

// sare data comes from the front end 
// this sets up an event listener on the socket for the NEW_MESSAGE event.
// this fn is for sending the message to all the members 
// ye frontend se event emit hua 
  socket.on(NEW_MESSAGE,async({chatId,members,message})=>{
    /// inside the members ,we have all the userID 
    // we also have a map where we know which user is connect to which socket id 
    // 
    // console.log("New message",message);
    // console.log("member of new message",members)
  
    // frontend se message mil gaya and frontend se message bhej diya 
     const messageForRealtime = {
        content :message,
        // here using this uuid() we generate the random id
        _id:uuid(),
        sender:{
            _id:user._id,
            name:user.name
        },
        chat :chatId,
        createdAt : new Date().toISOString(),
     };
    const messageForDB = {
        content:message,
        sender:user._id,
        chat:chatId,
    }
    // console.log("members",members);
  // here users is the member , from here we have the socket 
  // console.log("members",members);
  const membersSocket =getSockets(members);
  // console.log("members",members);
  // console.log("members socket",membersSocket);
  // console.log(userSocketIDs)
    // with the help of io.to -> we send the message 
    // like roomid pe message bjena hai
  // we have less user than
  // here frontend pe event emit bhi ho rha hai
  // console.log("emitting message for Real Time",messageForRealtime)
  io.to(membersSocket).emit("NEW_MESSAGE",{
    chatId,
    message:messageForRealtime,
  });
  io.to(membersSocket).emit(NEW_MESSAGE_ALERT,{chatId})
    // io.to([...membersSocket]).emit(NEW_MESSAGE,messageForRealtime) for large number of user
    //  console.log("New Message",messageForRealtime)
    try {
      await Message.create(messageForDB);
    } catch (error) {
      console.log(error);
      
    }

  })

  socket.on(START_TYPING,({members,chatId})=>{
      // console.log("typing",members,chatId);
      const membersSocketS=getSockets(members);
      // yha se emit krunga START_TYPING -> THEN IT LISTEN TO THE another frontend
      socket.to(membersSocketS).emit(START_TYPING,{chatId});
  })
   
  socket.on(STOP_TYPING,({members,chatId})=>{
    // console.log("typing",members,chatId);
    const membersSocketS=getSockets(members);
    // yha se emit krunga START_TYPING -> THEN IT LISTEN TO THE another frontend
    socket.to(membersSocketS).emit(STOP_TYPING,{chatId});
})

socket.on(CHAT_JOINED,({userId,members})=>{
  // console.log(typeof userId);
  OnlineUsers.add(userId)
  const membersSocket=getSockets(members)
   io.to(membersSocket).emit(ONLINE_USERS,Array.from(OnlineUsers))
})

socket.on(CHAT_LEAVED,({userId,members})=>{
     OnlineUsers.delete(userId)
    //  console.log("members",members);
     const membersSocket=getSockets(members)
     io.to(membersSocket).emit(ONLINE_USERS,Array.from(OnlineUsers))
})


   socket.on("disconnect",()=>{
    //  console.log("user disconnected");
     userSocketIDs.delete(user._id.toString());
     OnlineUsers.delete(user._id.toString());
     socket.broadcast.emit(ONLINE_USERS,Array.from(OnlineUsers))
   }) 
});

app.use(errorMiddleWare);
// here insted of app we use the server
server.listen(PORT,()=>{
    console.log(`server is listening on ${PORT} in ${process.env.NODE_ENV} Mode `);
})

export{
    adminSecretKey,
    envMode,
    userSocketIDs
}