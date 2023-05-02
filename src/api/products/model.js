import mongoose from "mongoose";

const { Schema, model } = mongoose;

const reviewSchema = new Schema(
  {
    comment: { type: String, required: true },
    rate: { type: Number, required: true, min: 0, max: 5 },
    user: { type: Schema.Types.ObjectId, ref: "Users", required: true },
  },
  {
    timestamps: true,
  }
);

const productSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    brand: { type: String, required: true },
    imageUrl: {
      type: String,
      required: true,
    },
    price: { type: Number, required: true },
    category: {
      type: String,
      required: true,
      validate: {
        validator: function (v) {
          return ["electronics", "household", "clothing", "beauty"].includes(v);
        },
        message:
          "category must be one of 'Electronics', 'books','clothing or 'Beauty'",
      },
    },
    reviews: { type: [reviewSchema] },
    quantity: { type: Number, required: true },
    numReviews: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);
export default model("Products", productSchema);
