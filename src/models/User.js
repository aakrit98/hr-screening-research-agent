import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: function () { 
        return !this.googleId
      } // will be stored hashed, never plain text
      
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    }, 

    googleId : { 
      type: String , 
      unique : true , 
      sparse : true , 
    }
  },
  { timestamps: true } // adds createdAt, updatedAt automatically
);

const User = mongoose.model("User", userSchema);

export default User;