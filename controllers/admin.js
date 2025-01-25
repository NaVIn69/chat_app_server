import jwt from "jsonwebtoken";
import { TryCatch } from "../middlewares/error.js";
import { Chat } from "../models/chat.js";
import { Message } from "../models/message.js";
import { User } from "../models/user.js";
import { cookieOptions } from "../utlis/features.js";
import { ErrorHandler } from "../utlis/utility.js";

// here we have to give the secrer key to the postman
const adminLogin = TryCatch(async (req, res, next) => {
  const { secretKey } = req.body;
// console.log("adminLogin",req.body);
  // here we taking  the admin_secret_key and "6PACKPROGRAMMER"
  const adminSecretKey = process.env.ADMIN_SECRET_KEY ;

  const isMatched = secretKey === adminSecretKey;
  if (!isMatched) return next(new ErrorHandler("INVALID ADMIN KEY", 401));

  // her we are making the admin token
  const token = jwt.sign({ secretKey }, process.env.JWT_SECRET);
  // console.log("token",token);

  // here we sending the admin cookie to the postman
  // session of cookie is 15 min
  return res
    .status(200)
    .cookie("chattu-admin-token", token, { ...cookieOptions,})
    .json({
      success: true,
      message: "Authenticated Successfully, Welcome BOSS ",
    });
});

const getAdminData = TryCatch(async (req, res, next) => {
  return res.status(200).json({
    admin: true,
  });
});

const adminLogout = TryCatch(async (req, res, next) => {
  return res
    .status(200)
    .cookie("chattu-admin-token", "", {
      ...cookieOptions,
      maxAge: 0,
    })
    .json({
      success: true,
      message: "Logged Out Successfully",
    });
});

const allUsers = TryCatch(async (req, res) => {
  const users = await User.find({});
  // in users we only need the name,username, avatar,_id

  const transformedUsers = await Promise.all(
    users.map(async ({ name, username, avatar, _id }) =>
      // here we traversing each user and each user has the name ,username \
      // avatar _id ,
      // each user has the groups and friends

      {
        const [groups, friends] = await Promise.all([
          Chat.countDocuments({ groupChat: true, members: _id }),
          Chat.countDocuments({ groupChat: false, members: _id }),
        ]);
        return {
          name,
          username,
          avatar: avatar.url,
          _id,
        };
      }
    )
  );
  // console.log("tranformeduser",transformedUsers);

  return res.status(200).json({
    status: "success",
    users: transformedUsers,
  });
});

const allChats = TryCatch(async (req, res) => {
  const chats = await Chat.find({})
    .populate("members", "name avatar")
    .populate("creator", "name avatar");

  const transformedChats = await Promise.all(
    chats.map(async ({ members, _id, groupChat, name, creator }) => {
      const totalMessages = await Message.countDocuments({ chat: _id });
      // here we are traversing all the chats and
      // return the
      // here
      return {
        _id,
        groupChat,
        name,
        // every group chat me 3 member ske avatar dikhega
        avatar: members.slice(0, 3).map((member) => member.avatar.url),
        // here we are mapping all the members
        members: members.map(({ _id, name, avatar }) => ({
          _id,
          name,
          avatar: avatar.url,
        })),
        creator: {
          name: creator?.name || "None",
          avatar: creator?.avatar.url || "",
        },
        totalMembers: members.length,
        totalMessages,
      };
    })
  );

  return res.status(200).json({
    success: true,
    chats: transformedChats,
  });
});

const allMessages = TryCatch(async (req, res) => {
  const messages = await Message.find({})
    .populate("sender", "name avatar")
    .populate("chat", "groupChat");

  // console.log(messages);
  // messages.forEach((message) => {
  //   console.log(message._id); // Check if _id is present for each message
  // });

  // during tranformation of chat we are checking that chat is exits or not
  // it chat does not exit then we send the null
  const transformedMessages = messages.map(
    ({ content, attachments, _id, sender, createdAt, chat }) => ({
      _id,
      attachments,
      content,
      createdAt,
      chat: chat ? chat._id : null,
      groupChat: chat ? chat.groupChat : false,
      sender: sender
        ? {
            _id: sender._id,
            name: sender.name,
            avatar: sender.avatar.url,
          }
        : null,
    })
  );

  return res.status(200).json({
    success: true,
    messages: transformedMessages,
  });
});

const getDashboardStats = TryCatch(async (req, res) => {
  const [groupsCount, usersCount, messagesCount, totalChatsCount] = await Promise.all([
    Chat.countDocuments({ groupChat: true }),
    User.countDocuments(),
    Message.countDocuments(),
    Chat.countDocuments(),
  ]);

  const today = new Date();

  const last7Days = new Date();
  last7Days.setDate(last7Days.getDate() - 7);

  // here we are obtaing the message of the last 7 days
  const last7DaysMessages = await Message.find({
    createdAt: {
      $gte: last7Days,
      $lte: today,
    },
  }).select("createdAt");

  // here is the array of message of last 7 days
  const messages = new Array(7).fill(0);
  const dayInMiliseconds = 1000 * 60 * 60 * 24;

  last7DaysMessages.forEach((message) => {
    const indexApprox = (today.getTime() - message.createdAt.getTime()) / dayInMiliseconds;
    const index = Math.floor(indexApprox);

    messages[6 - index]++;
  });
console.log(groupsCount,usersCount,messagesCount);
  const stats = {
    groupsCount,
    usersCount,
    messagesCount,
    totalChatsCount,
    messagesChart: messages,
  };

  return res.status(200).json({
    success: true,
    stats,
  });
});

export {
  adminLogin,
  adminLogout, allChats,
  allMessages, allUsers, getAdminData, getDashboardStats
};

