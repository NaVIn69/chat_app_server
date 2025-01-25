import {body, validationResult,check,param,query} from 'express-validator'
import { ErrorHandler } from '../utlis/utility.js';
import { sendFriendRequest } from '../controllers/user.js';


// resiterValidators return the array of that things if any of the things is not present
const registerValidator = ()=>[
    // for register any user we need name, username,bio, password,avatar
    body("name","Please Enter Name").notEmpty(),
    body("username","Please Enter Username").notEmpty() ,
    body("bio","Please Enter bio").notEmpty(),
    body("password","Please Enter Password").notEmpty(),
  
];

const loginValidator = () =>[
    // for doing login we need two things , username, password
    body("username","Please Enter Username").notEmpty(),
    body("password","Please Enter Password").notEmpty(),
];

const newGroupValidator = ()=>[
    // for createing new group we need name of that group , members ,
    body("name","please Enter Name").notEmpty(),
    body("members")
    .notEmpty()
    .withMessage("Please Enter Members")
    .isArray({min:2,max:100})
    .withMessage("Members must be 2-100"),
];

const addMembersValidator= ()=>[
   body("chatId","Please Enter Chat ID").notEmpty(),
   body("members")
   .notEmpty()
   .withMessage("Please Enter Members")
   .isArray({min:1,max:97})
   .withMessage("members must be 1-97 ")
];

const removeMembersValidator= ()=>[
    body("chatId","Please Enter Chat ID").notEmpty(),
    body("userId","Plase Enter User ID").notEmpty(),
    
 ];
 const leaveGroupValidators=()=>[
  param("id","Please Enter Chat ID").notEmpty(),
 ];
 const sendAttachmentValidators =()=>[
    body("ChatId","Please Enter Chat Id").notEmpty()
    // change kiya hai prams se body me 
   
//     .notEmpty()
//    .withMessage("Please Enter Members")
//    .isArray({min:1,max:5})
//    .withMessage("members must be 1-5 ")
 ];

   const chatIdValidators =()=>[
      param("id","Please Enter Chat Id").notEmpty()
   
    
   ]; 
   const  getChatDetailsValidator=()=>[
    param("id","Please Enter Chat Id").notEmpty()
 ]; 

 const renameValidators=()=>[
    param("id","Please Enter Chat Id").notEmpty(),
    body("name","Please Enter New name").notEmpty(),
 ];

 const sendRequestValidators= ()=>[
    body("userId","please Enter user id").notEmpty(),

 ];
 
 const acceptRequestValidators= () =>[
      body("requestId","Please Enter request ID").notEmpty(),
      body("accept")
      .notEmpty()
      .withMessage("Please Add Accept")
      .isBoolean()
      .withMessage("Accept must be boolean"),
 ];

 const adminLoginValidator = () =>[
     body("secretKey","Please Enter Secret Key ID").notEmpty(),
 
]



const  validateHandler = (req,res,next)=>{
    // jo chiz present nhi rhega wo hoga 
    // wo sare errors me aa jayega 
    const errors = validationResult(req);


    // here we are getting all the errors inside the error message 
    const errorMessages= errors.array().map((error)=>error.msg).join(",");
    // console.log(errorMessages);

     
    if(errors.isEmpty()) return next();
    else next(new ErrorHandler(errorMessages,400));
};


export {registerValidator,
    validateHandler,
    loginValidator,
    newGroupValidator,
    addMembersValidator,
    removeMembersValidator,
    leaveGroupValidators,
    sendAttachmentValidators,
    chatIdValidators,
    renameValidators,
    sendRequestValidators,
    acceptRequestValidators,
    adminLoginValidator,
};