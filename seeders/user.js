import { User } from "../models/user.js";
import { Chat } from "../models/chat.js";
import {faker} from '@faker-js/faker';
import { simpleFaker } from "@faker-js/faker";

const createUser=async(numUsers)=>{
    try {
  const userPromise= [];
  // here promise banna kr chhod rhe hai means we have created all the user 
  for(let i=0;i<numUsers;i++){
    const tempUser=User.create({
         name:faker.person.fullName(),
         username:faker.internet.userName(),
         bio:faker.lorem.sentence(10),
         password:"password",
 avatar:{
    url:faker.image.avatar(),
    public_id:faker.system.fileName()
 },
    })
    userPromise.push(tempUser)
  }      
  await Promise.all(userPromise);
 
  console.log("Users created",numUsers);
  process.exit(1);

    } catch (error) {
        console.log(error);
        process.exit(1);
    }
}




 export {createUser}