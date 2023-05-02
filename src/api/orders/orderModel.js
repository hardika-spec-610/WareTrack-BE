import mongoose from "mongoose";

const { Schema, model } = mongoose;

const orderSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "Users", required: true },
    orderItems: [
      { type: Schema.Types.ObjectId, ref: "Products", required: true },
    ],
    paymentMethod: { type: String, required: true, default: "Paypal" },
    totalPrice: {
      type: Number,
      required: true,
      default: 0.0,
    },
    isPaid: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);
export default model("Orders", orderSchema);
