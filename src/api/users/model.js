import mongoose from "mongoose";
import bcrypt from "bcrypt";

const { Schema, model } = mongoose;

const userSchema = new Schema(
  {
    firstName: {
      type: String,
      required: true,
    },
    lastName: { type: String, required: true },
    address: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      zip: { type: String },
      country: { type: String },
    },
    phoneNumber: { type: String },
    email: {
      type: String,
      required: true,
      unique: true,
      validate: {
        validator: function (v) {
          const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return pattern.test(v);
        },
        message: "Email address is not valid",
      },
    },
    password: {
      type: String,
      required: false,
    },
    avatar: {
      type: String,
      // required: true,
      validate: {
        validator: function (v) {
          const pattern = /\.(jpeg|jpg|gif|png|svg)$/;
          return pattern.test(v);
        },
        message: "Image link must be a valid URL for an image",
      },
    },
    role: {
      type: String,
      // required: true,
      enum: ["Admin", "User"],
      default: "User",
    },
    refreshToken: { type: String },
    googleId: { type: String },
  },
  {
    timestamps: true, // this option automatically handles the createdAt and updatedAt fields
  }
);

// BEFORE saving the user in db, I'd like to execute the following code
userSchema.pre("save", async function () {
  // This code will be automagically executed BEFORE saving
  // Here I am not using an arrow function as I normally do, because of the "this" keyword
  const newUserData = this; // If I use arrow functions, "this" will be undefined, it contains the new user's data in case of normal functions

  if (newUserData.isModified("password")) {
    // I can save some precious CPU cycles if I execute hash function ONLY whenever the user is modifying his password (or if the user is being created)
    const plainPW = newUserData.password;
    const salt = await bcrypt.genSalt(11);
    const hash = await bcrypt.hash(plainPW, salt);
    newUserData.password = hash;
  }
});

userSchema.methods.toJSON = function () {
  // This .toJSON method is called EVERY TIME Express does a res.send(user/users)
  // This does mean that we could override the default behaviour of this method, by writing some code that removes passwords (and also some unnecessary things as well) from users
  const currentUserDocument = this;
  const currentUser = currentUserDocument.toObject();
  delete currentUser.password;
  // delete currentAuthor.createdAt
  // delete currentAuthor.updatedAt
  delete currentUser.__v;
  return currentUser;
};

userSchema.static("checkCredentials", async function (email, plainPW) {
  // My own custom method attached to the UsersModel

  // Given email and plain text password, this method should check in the db if the user exists (by email)
  // Then it should compare the given password with the hashed one coming from the db
  // Then it should return an useful response

  // 1. Find by email
  const user = await this.findOne({ email });

  if (user) {
    // 2. If the user is found --> compare plainPW with the hashed one
    const passwordMatch = await bcrypt.compare(plainPW, user.password); // boolean:true/false

    if (passwordMatch) {
      // 3. If passwords match --> return user
      return user;
    } else {
      // 4. If they don't --> return null
      return null;
    }
  } else {
    // 5. In case of also user not found --> return null
    return null;
  }
});

export default model("Users", userSchema);
