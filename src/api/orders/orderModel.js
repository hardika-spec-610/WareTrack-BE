import mongoose from "mongoose";

const { Schema, model } = mongoose;

const orderSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "Users", required: true },
    orderItems: [
      {
        name: { type: String, required: true },
        qty: { type: Number, required: true },
        image: { type: String, required: true },
        price: { type: Number, required: true },
        product: {
          type: Schema.Types.ObjectId,
          ref: "Products",
          required: true,
        },
      },
    ],
    paymentMethod: { type: String, required: true, default: "Paypal" },
    totalPrice: {
      type: Number,
      required: true,
      default: 0.0,
    },
    shippingPrice: {
      type: Number,
      default: 0.0,
    },
    isPaid: {
      type: Boolean,
      required: true,
      default: false,
    },
    paidAt: {
      type: Date,
    },
    isDelivered: {
      type: Boolean,
      required: true,
      default: false,
    },
    deliveredAt: {
      type: Date,
    },
    paymentResult: {
      _id: { type: String },
      status: { type: String },
      update_time: { type: String },
      email_address: { type: String },
    },
  },
  {
    timestamps: true,
  }
);
export default model("Orders", orderSchema);
