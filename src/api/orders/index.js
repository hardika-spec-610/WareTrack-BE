import Express from "express";
import createHttpError from "http-errors";
import OrderModel from "./orderModel.js";

const orderRouter = Express.Router();

orderRouter.post("/", async (req, res, next) => {
  try {
    const {
      user,
      orderItems,
      shippingAddress,
      paymentMethod,
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
    } = req.body;
    if (orderItems && orderItems.length === 0) {
      res.status(400);
      throw new Error("No order items");
      return;
    } else {
      const order = new OrderModel({
        user,
        orderItems,
        shippingAddress,
        paymentMethod,
        itemsPrice,
        taxPrice,
        shippingPrice,
        totalPrice,
      });
      const newOrder = await order.save();
      res.status(201).json(newOrder);
    }
  } catch (error) {
    next(error);
  }
});

orderRouter.get("/", async (req, res, next) => {
  try {
    const orders = await OrderModel.find().populate({
      path: "user",
      select: "firstName lastName email",
    });
    res.json(orders);
  } catch (error) {
    next(error);
  }
});

// Get an order by ID
orderRouter.get("/:orderId", async (req, res, next) => {
  try {
    const order = await OrderModel.findById(req.params.orderId).populate({
      path: "user",
      select: "firstName lastName email",
    });
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.json(order);
  } catch (error) {
    next(error);
  }
});
// populate([
//     {
//       path: "user",
//       select: "firstName lastName email avatar",
//     },
//     {
//       path: "likes",
//       select: "name surname image title",
//     },
//   ])

// Update an order
orderRouter.put("/:orderId", async (req, res, next) => {
  try {
    const updatedOrder = await OrderModel.findByIdAndUpdate(
      req.params.orderId, // WHO
      req.body, // HOW
      { new: true, runValidators: true }
    ).populate({
      path: "user",
      select: "firstName lastName email",
    });
    if (updatedOrder) {
      res.send(updatedOrder);
    } else {
      next(
        createHttpError(404, `Order with id ${req.params.orderId} not found!`)
      );
    }
  } catch (error) {
    next(error);
  }
});

orderRouter.delete("/:orderId", async (req, res, next) => {
  try {
    const deletedOrder = await OrderModel.findByIdAndDelete(req.params.orderId);
    if (deletedOrder) {
      res.status(204).send();
    } else {
      next(
        createHttpError(404, `Order with id ${req.params.orderId} not found!`)
      );
    }
  } catch (error) {
    next(error);
  }
});

export default orderRouter;
