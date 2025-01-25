
//here we are using this function for verifying the members in the my chat

import { userSocketIDs } from "../app.js"

const getOtherMember=(members,userId)=>{
    // populated members aa rha hai


    return members.find((member)=>member._id.toString()!==userId.toString())
}

const getSockets =(users=[]) =>{
    //    console.log("users from getSockets",users);
    // here we are traversing the users and from each user we get their corresponding socketIds
    const sockets =users.map((user)=>userSocketIDs.get(user.toString()) )
    // here sockets is the array of the socketId
   return sockets;

}
const getBase64 = (file) => `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;



export {getOtherMember,getSockets,getBase64}