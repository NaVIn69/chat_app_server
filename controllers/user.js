import { compare } from "bcrypt";
import { User } from "../models/user.js";
import { sendToken, cookieOptions, uploadFilesToCloudniary } from "../utlis/features.js";
import { TryCatch } from "../middlewares/error.js";
import { ErrorHandler } from "../utlis/utility.js";
import { Request } from "../models/request.js";
import { Chat } from "../models/chat.js";
import { getOtherMember } from "../lib/helper.js";
import { emitEvent } from "../utlis/features.js";

import { NEW_REQUEST, REFETCH_CHATS } from "../constants/events.js";

// create new User and save to the database and save the cookie
const newUser = TryCatch(async (req, res, next) => {
  const { name, username, password, bio } = req.body;
  const file = req.file;
  // console.log(req.body);
  if (!file) return next(new ErrorHandler("Please Upload Avatar"));

  const results= await uploadFilesToCloudniary([file]);
  // results is the array 
  const avatar = {
    public_id: results[0].public_id,
    url: results[0].url,
  };
  // this user give me the _id, which is in the mongodb database
  // here we are creating the User of following data
  const user = await User.create({
    name,
    username,
    password,
    bio,
    avatar,
  });
  // here user me id save hoga jis user ko create kr rhe hai

  sendToken(res, user, 201, "User created");
  //  res.status(201).json({massage:"User created successfully"})
});

// here we verifying the login credential
const login = TryCatch(async (req, res, next) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username }).select("+password");
  // console.log(user);
  // here we have been done the select ("+password") because of this we can access the "user password compare it with the password "
  if (!user) {
    return next(new ErrorHandler("Inavlid Username or Password", 404));
  }
  // here we are checking the comparing the password , one of them is stored in the data base during the registration of user , one of the password during the login time
  const isMatch= await compare(password,user.password);
  // // console.log(isMatch);
  if(!isMatch){
   return next(new ErrorHandler("Invalid Username or Password",404))
  }
  sendToken(res, user, 200, `welcome Back, ${user.name}`);
  // res.status(200).json({
  //   message:`welcome back ,${user.name}`
  // })
});

const getMyProfile = TryCatch(async (req, res, next) => {
  // here
  // console.log(req.user);
  // req.user is the objectId of the mongodb database

  const user = await User.findById(req.user);
  if (!user) return next(new ErrorHandler("User not found", 404));
  res.status(200).json({
    success: true,
    user,
  });
});

const logout = TryCatch(async (req, res) => {
  return res
    .status(200)
    .cookie("chat-token", "", { ...cookieOptions, maxAge: 0 })
    .json({
      success: true,
      message: "Logged out Successfully",
    });
});

// here we are finding the user which doesnt have any chat with anyone
//
const searchUser = TryCatch(async (req, res) => {
  const { name = "" } = req.query;
  // console.log(name);
  // here we finding the non -group chat of that user
  const myChats = await Chat.find({
    groupChat: false,
    members: req.user,
  });

  // extracting all the user from my chats means friends or people i have chatted with
  const allUsersFromChats = myChats.flatMap((chat) => chat.members);
  // myChats.flatmap(...): Uses flatMap to iterate over each chat in myChats. For each chat, it extracts the members array.
  //flatMap: Combines all members arrays into a single flat array, so that allUsersFromChats contains a list of all users the current user has chatted with (direct friends).
  // (chat) => chat.members: For each chat, flatMap extracts the members array.
  // allUsersFromChats: Stores a flat array of all user IDs the current user has had one-on-one chats with

  // all users from my chats means friends or people i have chatted with
  // in mongodb we regex to find the pattern of name in database

  const allUsersExceptMeAndFriends = await User.find({
    _id: { $nin: allUsersFromChats },
    name:{$regex:name ,$options:"i"},
  });

  // console.log("allUsersExceptMeAndFriends FROM USER.JS SEARCH USER",allUsersExceptMeAndFriends);

  // modifying all the response
  const users = allUsersExceptMeAndFriends.map(({ _id, name, avatar }) => ({
    _id,
    name,
    avatar: avatar.url,
  }));

  // console.log("allUsersExceptMeAndFriends:", allUsersExceptMeAndFriends);

  // console.log("users search",users);

  return res.status(200).json({
    success: true,
    users,
  });
});

const sendFriendRequest = TryCatch(async (req, res, next) => {
  // here userId tells me about where i am sending the request
  const { userId } = req.body;
  // console.log("req.user",req.user)
  // console.log("receiver",userId);

  // here we are finding that previous request is previous sended or not
  // yha to sender mai hu otherwise sender req.user hai

  // here we are finding request that phale request bheja hai yha nhi
  //
  const request = await Request.findOne({
    $or: [
      { sender: req.user, receiver: userId },
      { sender: userId, receiver: req.user },
    ],
  });

  if (request) return next(new ErrorHandler("Request already sent", 400));
  // here request is create in the data base
  //
  await Request.create({
    sender: req.user,
    receiver: userId,
  });

  // here emitEvent give me the notification
  emitEvent(req, NEW_REQUEST, [userId]);

  return res.status(200).json({
    success: true,
    message: "Friend Request Sent",
  });
});

// here we have send the request and i want to accept my request
const acceptFriendRequest = TryCatch(async (req, res, next) => {
  // here from body we find the requestId and accept flag from the body
  const { requestId, accept } = req.body;
  // console.log("requestId from acceptFriends",requestId);

  // by that requestId , we find that thing from my Database
  const request = await Request.findById(requestId)
    .populate("sender", "name")
    .populate("receiver", "name");

  // console.log("Receiver:", request.receiver);
  // console.log("Request user:", req.user);
  // console.log("Request:", request);
  if (!request) return next(new ErrorHandler("Request not found", 404));
  // here we are checking that i am the receriver and i am the user same , request is going to accept
  if (request.receiver._id.toString() !== req.user.toString())
    return next(new ErrorHandler("You are not authorized to accept this request ", 401));

  if (!accept) {
    await request.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Friend Request Rejected",
    });
  }
  // console.log("sender accept request",sender)
  // console.log("receiver",receiver)

  const members = [request.sender._id, request.receiver._id];

  // here accepting the friend request , we create the chat between receiver and sender
  await Promise.all([
    Chat.create({
      members,
      name: `${request.sender.name}-${request.receiver.name}`,
    }),
    // here e create the chat between member and delete the request from database
    request.deleteOne(),
  ]);

  // here we Refetch the chat
  emitEvent(req, REFETCH_CHATS, members);
  return res.status(200).json({
    success: true,
    message: "Friend Requested Accepted",
    senderId: request.sender._id,
  });
});

const getMyNotifications = TryCatch(async (req, res) => {
  const requests = await Request.find({ receiver: req.user }).populate("sender", "name avatar");

  const allRequests = requests.map(({ _id, sender }) => ({
    _id,
    sender: {
      _id: sender._id,
      name: sender.name,
      avatar: sender.avatar.url,
    },
  }));
  return res.status(200).json({
    success: true,
    allRequests,
  });
});

const getMyFriends = TryCatch(async (req, res) => {
  // here we are taking the chatId from query
  const chatId = req.query.chatId;

  // we are finding the chat from the chat and and we populate with name avatar member
  const chats = await Chat.find({
    members: req.user,
    groupChat: false,
  }).populate("members", "name avatar");

  // console.log("GET MY FRIENDS CHAT",chats);

  const friends = chats.map(({ members }) => {
    const otherUser = getOtherMember(members, req.user);

    return {
      _id: otherUser._id,
      name: otherUser.name,
      avatar: otherUser.avatar.url,
    };
  });

  if (chatId) {
    const chat = await Chat.findById(chatId);

    const availableFriends = friends.filter((friend) => !chat.members.includes(friend._id));

    return res.status(200).json({
      success: true,
      friends: availableFriends,
    });
  } else {
    return res.status(200).json({
      success: true,
      friends,
    });
  }
});

export {
  login,
  newUser,
  getMyProfile,
  logout,
  searchUser,
  sendFriendRequest,
  acceptFriendRequest,
  getMyNotifications,
  getMyFriends,
};
