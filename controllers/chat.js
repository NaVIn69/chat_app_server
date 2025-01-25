import { ALERT, NEW_MESSAGE, NEW_MESSAGE_ALERT, REFETCH_CHATS } from "../constants/events.js";
import { getOtherMember } from "../lib/helper.js";
import { TryCatch } from "../middlewares/error.js";
import { Chat } from "../models/chat.js";
import { Message } from "../models/message.js";
import { User } from "../models/user.js";
import { deleteFileFromCloudinary, emitEvent, uploadFilesToCloudniary } from "../utlis/features.js";
import { ErrorHandler } from "../utlis/utility.js";

// for creating the new Group Chat
const newGroupChat = TryCatch(async (req, res, next) => {
  // here name->group ka name
  // members -> is the array which store the all member _id(mongodb object id) of group chat of that name
  const { name, members } = req.body;
  console.log("members from new Group chat",members)

  if (members.length <2) {
    return next(new ErrorHandler("Group chat must have at least 3 members ", 400));
  }

  const allMembers = [...members, req.user];
  await Chat.create({
    name,
    groupChat: true,
    creator: req.user,
    members: allMembers,
  });

  emitEvent(req, ALERT, allMembers, `Welcome to ${name} group`);
  emitEvent(req, REFETCH_CHATS, members);

  return res.status(201).json({
    success: true,
    message: "Group Created",
  });
});

const getMyChats = TryCatch(async (req, res, next) => {
  // here in the chats i get all the chat of myself with others form Chat Database
  // members array gives me the all the member of my chat
  // we are populating the chat bcz it give me detail of each members
//  console.log("req get my chats",req.user);
  const chats = await Chat.find({ members: req.user }).populate("members", "name avatar");
  // console.log("getMyChats",chats);
  //  console.log("getMychats',chats);
  // by populate , we get all the detain of members like ("member","name","avatar")
  // console.log("chat.js server getmy chats",chats)

  // chats store the all the group chats
  const transformedChats = chats.map(({ _id, name, members, groupChat }) => {
    // console.log("members",members);
    const otherMember = getOtherMember(members, req.user);
    // console.log("chat.js server",_id,otherMember)
   

    return {
      _id,
      groupChat,
      avatar: groupChat
        ? members.slice(0, 3).map(({ avatar }) => avatar.url)
        : [otherMember?.avatar?.url],
      name: groupChat ? name : otherMember.name,
      members: members.reduce((prev, curr) => {
        if (curr._id.toString() !== req.user.toString()) {
          prev.push(curr._id);
        }
        return prev;
      }, []),
    };
  });
  // console.log("chat.js server",transformedChats)
  

  return res.status(201).json({
    success: true,
    chats: transformedChats,
  });
});

const getMyGroups = TryCatch(async (req, res, next) => {
  // here wew are find the group where i am present
  const chats = await Chat.find({
    members: req.user,
    groupChat: true,
    creator: req.user,
  }).populate("members", "name avatar");
  // console.log(chats);

  const groups = chats.map(({ members, _id, groupChat, name }) => ({
    _id,
    groupChat,
    name,
    avatar: members.slice(0, 3).map(({ avatar }) => avatar.url),
  }));

  return res.status(200).json({
    success: true,
    groups,
  });
});

const addMembers = TryCatch(async (req, res, next) => {
  const { chatId, members } = req.body;

  // if(!members ||members.length<1){
  //     return next(new ErrorHandler("please provide members",400));
  // }

  const chat = await Chat.findById(chatId);
  // Chat is the database of all the groupchat in monogodb
  // here we find the group details using the chatId of the group

  // here we checking that my chat is groupchat hai yha nhi
  if (!chat) return next(new ErrorHandler("Chat not found", 404));
  if (!chat.groupChat) return next(new ErrorHandler("this is not a group chat", 404));

  // jo group create kiya hai whi add kr skta hai group me
  // the we are checking that

  //........................................................................
  //  req.user.toString() -> give me the objectId(mongobd Id) which is login
  //.............................................................................

  if (chat.creator.toString() !== req.user.toString())
    return next(new ErrorHandler("you are not allowed to add members ", 403));

  // here members is the array which is going to add in the group
  // we fetch from the body
  const allNewMembersPromise = members.map((i) => User.findById(i, "name"));

  // we resolve all the promise together
  const allNewMembers = await Promise.all(allNewMembersPromise);
  // here allNewMembers contain the members ,with _id(mongobd id,name);

  // here we are resolving all the promise together

  const uniqueMembers = allNewMembers
    .filter((i) => !chat.members.includes(i._id.toString()))
    .map((i) => i._id);

  // here every member individually is going to push in the chat(my group chat where we are going to add the memebrs)
  // if we dont use the spread proprety then , it is going to push like the array of members
  chat.members.push(...uniqueMembers);

  if (chat.members.length > 100) return next(new ErrorHandler("group members limit reached", 400));

  await chat.save();
  const allUserName = allNewMembers.map((i) => i.name).join(",");
  //here allUserName is the array of

  // here after saving the member in the group
  // we are sending  the "ALERT" event to all the chat.members and send the ALERT like (all of all name is add in the group)
  emitEvent(req, ALERT, chat.members, `${allUserName} has been added to the group`);

  // here refetching the chats event
  // Triggers a REFETCH_CHATS event to update the group chat’s state for all members
  emitEvent(req, REFETCH_CHATS, chat.members);
  return res.status(200).json({
    success: true,
    message: "Members added successfully",
  });
});

const removeMember = TryCatch(async (req, res, next) => {
  // for removing any member from the group we need two things
  // 1-> userId -> that member is going to remove from the group
  //2 -> chatId -> group chat from where we are removing the memnber
  const { userId, chatId } = req.body;

  const [chat, userThatWWillBeRemoved] = await Promise.all([
    Chat.findById(chatId),
    User.findById(userId, "name"),
  ]);
  // here we do the destructuring

  if (!chat) return next(new ErrorHandler("Chat not found", 404));
  if (!chat.groupChat) return next(new ErrorHandler("this is not a group chat", 404));

  //here we checking the jo banda member ko remove kr rha hai wo admin hai yha nhi
  if (chat.creator.toString() !== req.user.toString())
    return next(new ErrorHandler("you are not allowed to add members ", 403));

  // condition for group chat
  if (chat.members.length <= 3) {
    return next(new ErrorHandler("Group must have at least 3 members", 400));
  }

  const allChatMembers=chat.members.map((i)=>i.toString());
  // here filter all the member which is not equal userId(which is going to remove )
  chat.members = chat.members.filter((member) => member.toString() !== userId.toString());
  // we save our chat
  await chat.save();

  // here we sending the "alert" to all the member
  emitEvent(
    req,
    ALERT,
    chat.members,
    {message:`${userThatWWillBeRemoved.name} has been removed from the group`,
     chatId
  }
  );

  emitEvent(req, REFETCH_CHATS,allChatMembers);
  return res.status(200).json({
    success: true,
    message: "Member removed successfully",
  });
});

const leaveGroup = TryCatch(async (req, res, next) => {
  const chatId = req.params.id;

  // we fetch the group details  from given id (which is extracting from req.param.id)
  const chat = await Chat.findById(chatId);

  if (!chat) return next(new ErrorHandler("Chat not found", 404));

  if (!chat.groupChat) return next(new ErrorHandler("This is not a group chat", 400));

  // here admin is leaving the group then

  const remainingMembers = chat.members.filter(
    (member) => member.toString() !== req.user.toString()
  );
  // here we get the array of the remaning members where req.user is not present
  if (remainingMembers.length < 3)
    return next(new ErrorHandler("Group must have at least 3 members", 400));

  // here if admin is leaving the group then
  // we have to assing the one of the member as the group admin

  if (chat.creator.toString() === req.user.toString()) {
    // here we are making the admin to random person
    const randomNumber = Math.floor(Math.random() * remainingMembers.length);

    const newCreator = remainingMembers[randomNumber];

    chat.creator = newCreator;
  }
  // here we update the chat.members of that group
  chat.members = remainingMembers;

  // chat.members = chat.members.filter(
  //   (member)=>member.toString()!== req.user.toString()
  // );

  // here we are fetching the user name from the database from the
  const [user] = await Promise.all([User.findById(req.user, "name"), chat.save()]);

  // we are sending the " Alert " to all the members
  emitEvent(req, ALERT, chat.members, {
    chatId,
    message: `User ${user.name} has left the group`,
  });

  return res.status(200).json({
    success: true,
    message: "Leave Group Successfully",
  });
});

const sendAttachment = TryCatch(async (req, res, next) => {
  // here chatId tells me about that where we have to send the attachment (in which chat )
  // we get from the req.body
  const { chatId } = req.body;
  // console.log(req);
  const files = req.files || [];
  // console.log("chat.js backend",files);
  if (files.length < 1) return next(new ErrorHandler("Please provide attachments", 400));

  if (files.length > 5) return next(new ErrorHandler("files can't be more than 5", 400));

  // we find the chat of that chatid
  // we find the user name from User database
  const [chat, me] = await Promise.all([
    // here using chatId gives me the we find the chat
    Chat.findById(chatId),
    // here User.findById gives me the name of the user only
    User.findById(req.user, "name"),
  ]);

  if (!chat) return next(new ErrorHandler("Chat not found ", 404));

  if(files.length<1) return next(new ErrorHandler("Please provide attachments",400));

  //upload files Here
  const attachments = await uploadFilesToCloudniary(files)

  const messageForDB = {
    content: "",
    attachments,
    sender: me._id,
    chat: chatId,
  };

  const messageForRealtime = {
    ...messageForDB,
    sender: {
      _id: me._id,
      name: me.name,
    },
  };
  // console.log(messageForRealtime);
  const message = await Message.create(messageForDB);

  emitEvent(req,NEW_MESSAGE, chat.members, {
    message: messageForRealtime,
    chatId,
  });
  emitEvent(req, NEW_MESSAGE_ALERT, chat.members, { chatId });
  return res.status(200).json({
    success: true,
    message,
  });
});

// here we want to get chat of each id after clicking on that chat
const getChatDetails = TryCatch(async (req, res, next) => {
  // console.log("getchatdetails",req.params.id);
  if (req.query.populate === "true") {
    // console.log("getchatdetails with populate true",req.params.id);
    const chat = await Chat.findById(req.params.id)
    .populate("members", "name avatar")
    .lean();
    
    // console.log(chat)

    // BY doing the  -> .lean() krne se chat is not mongobd id then we can process something or we can change something on it
    if (!chat) return next(new ErrorHandler("Chat not found in db", 404));

    // chat.members is the javascript object now due to using of the .lean()
    chat.members = chat.members.map(({ _id, name, avatar }) => ({
      _id,
      name,
      avatar: avatar.url,
    }));
    // here chat.members becomes the javascript object
    // console.log("getchatdetails with without popultae ",chat);
    return res.status(200).json({
      success: true,
      chat,
    });
  } else {
    const chat = await Chat.findById(req.params.id) 
    // .populate("members", "name avatar")
    // .lean();

    // console.log("getchatdetails with without popultae ",chat);
    if (!chat) return next(new ErrorHandler("Chat not found", 404));
    // console.log("without populate true",chat)
    return res.status(200).json({
      success: true,
      chat,
    });
  }
});

// here we are rename the group
const renameGroup = TryCatch(async (req, res, next) => {
  const chatId = req.params.id;

  const { name } = req.body;
  const chat = await Chat.findById(chatId);
  //  console.log("chatId",chatId)
  // console.log("chat", chat);

  if (!chat) return next(new ErrorHandler("Chat not found", 404));

  if (!chat.groupChat) {
    return next(new ErrorHandler("this is not a group chat", 404));
  }

  if (chat.creator.toString() !== req.user.toString()) {
    return next(new ErrorHandler("you are not allowed to rename the group ", 403));
  }

  chat.name = name;

  await chat.save();

  emitEvent(req, REFETCH_CHATS, chat.members);

  return res.status(200).json({
    success: true,
    message: "Group renamed successfully",
  });
});

const deleteChat = TryCatch(async (req, res, next) => {
  const chatId = req.params.id;
  // first we take the chatId and using the chatId we find all the chat
  const chat = await Chat.findById(chatId);
  if (!chat) return next(new ErrorHandler("Chat is not found"), 404);

  const members = chat.members;

  // in the group chat only admin can delete the chat ,
  //
  if (chat.groupChat && chat.creator.toString() !== req.user.toString()) {
    return next(new ErrorHandler("you are not allowed to Delete  Chat", 403));
  }

  // in the single chat  ,jo group chat me members hai hi nhi wo delete nhi kr skta hai , na chat ko
  if (!chat.groupChat && !chat.members.includes(req.user.toString())) {
    return next(new ErrorHandler("You are not allowed to delete the chat", 403));
  }

  // here we delete all the message as well as attachments from cloudniary
  const messageWithAttachments = await Message.find({
    chat: chatId,
    attachments: { $exists: true, $ne: [] },
  });

  const public_ids = [];

  messageWithAttachments.forEach(
    ({ attachments }) =>
      // here attachements is also the array
      attachments.forEach(({ public_id }) => public_ids.push(public_id))
    // we traversing all the attachements element of the array and push inside the public_ids array
  );

  await Promise.all([
    // we delete all the chat from couldinary
    deleteFileFromCloudinary(public_ids),
    chat.deleteOne(),
    Message.deleteMany({ chat: chatId }),
  ]);

  // after deleting the attachements we REFETCH_CHATS from the database
  emitEvent(req, REFETCH_CHATS, members);

  return res.status(200).json({
    success: true,
    message: "Chat deleted successfully",
  });
});

// this will give me the paginated message , here we get all the message page by page
const getMessages = TryCatch(async (req, res, next) => {
  const chatId = req.params.id;

  const { page = 1 } = req.query;
  // limit is tells me about the the message per page
  const limit = 20;
  // Calculates the number of messages to skip, based on the current page.
  const skip = (page - 1) * limit;

  // here we find the chat using the chatId
  const chat = await Chat.findById(chatId);
  // check of chatId
  if (!chat) return next(new ErrorHandler("Chat not found", 404));

  if (!chat.members.includes(req.user.toString())) {
    return next(new ErrorHandler("you are not allowed to access this chat ", 403));
  }
  // if we are copying the url of any group then we placed somewhere
  //else , u cant access that chat

  // message ->
  const [message, totalMessageCount] = await Promise.all([
    // here finding the message using the chatId from Message database
    Message.find({ chat: chatId })
      // we sort all the message in descending order of creation date
      .sort({ createdAt: -1 })
      // skip the message to show latest message
      .skip(skip)
      // limit of message per page
      .limit(limit)
      // we populate all the message with sender name
      .populate("sender", "name")
      // converting the mongodb object into the plain javascript model
      .lean(),
    // count total number of message with chatId
    Message.countDocuments({ chat: chatId }),
  ]);

  // here we find the totalpage ,using the totalmessageCount/limit
  const totalPages = Math.ceil(totalMessageCount / limit) || 0;

  return res.status(200).json({
    success: true,
    message: message.reverse(),
    totalPages,
  });
});

export {
  addMembers, deleteChat, getChatDetails, getMessages, getMyChats,
  getMyGroups, leaveGroup, newGroupChat, removeMember, renameGroup, sendAttachment
};

