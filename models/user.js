import { hash } from "bcrypt";
import mongoose, { Schema,model,} from "mongoose"; 

const schema = new Schema({

    name:{
        type:String,
        required:true,
    },
    username:{
        type:String,
        required:true,
        unique:true,
    },
    password :{
       type:String,
       required:true,
       select:false,
    },
    bio: {
      type: String,
      required: true,
    },

    avatar:{
        public_id:{
            type:String,
            required:true,
        },
        url:{
            type:String,
            required:true,
        }
    }


},{
    timestamps:true,
});

// before saving this password , i going to hash first 
// then save into the database
schema.pre("save",async function (next) {
    // when password is hashed previously then we call the next middleware 
    if(!this.isModified("password")) return next();
    // if password is modified then it return true
    this.password=await hash(this.password,10);
    // next()
})


export const User =mongoose.models.User || model("User",schema);