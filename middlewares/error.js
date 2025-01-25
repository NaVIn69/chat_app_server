import { envMode } from "../app.js";
const errorMiddleWare = (err,req,res,next)=>{
    err.message ||= "Internal Server Error",
    err.statusCode ||=500;
    
    // for finding the duplicate element in the 
    // duplicate pe 11000 code deta hai
    if(err.code === 11000){
        const error=Object.keys(err.keyPattern).join(",");
        // here we are sending the message like Duplicate filed username
        err.message =`Duplicate filed - ${error}`
        err.statusCode =400;
    }

    //  first find the error then only print the usefuul error 
    if(err.name === "CastError") {
        const errorPath=err.path;
        err.message=`Invlid Formate of ${errorPath} `,
        err.statusCode=400;
    }
    const response = {
        success:false,
        message:err.message,
    }

    if(envMode ==="DEVELOPMENT"){
        response.error = err;
    }

    return res.status(err.statusCode).json(response);
};


// using the try and catch to wrap the function 
// 
const TryCatch = (passedFunc)=> async (req,res,next)=>{
   try {
    await passedFunc(req,res,next);
   } catch (error) {
    next(error);
    
   }
};

export {errorMiddleWare,TryCatch}