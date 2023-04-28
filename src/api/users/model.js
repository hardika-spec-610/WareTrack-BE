import mongoose from "mongoose";

const { Schema, model } = mongoose;

const userSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, auto: true },
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
    id: false,
  }
);

export default model("Users", userSchema);
