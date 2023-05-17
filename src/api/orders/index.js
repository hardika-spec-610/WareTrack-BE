import Express from "express";
import createHttpError from "http-errors";
import OrderModel from "./orderModel.js";
import { JWTAuthMiddleware } from "../../lib/auth/jwt.js";

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
      isPaid,
      paidAt,
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
        isPaid,
        paidAt,
      });
      const newOrder = await order.save();

      res.status(201).json(
        await newOrder.populate({
          path: "orderItems.product",
          select: "name imageUrl price _id",
        })
      );
    }
  } catch (error) {
    next(error);
  }
});

orderRouter.get("/", async (req, res, next) => {
  try {
    const orders = await OrderModel.find()
      .populate({
        path: "user",
        select: "firstName lastName email address",
      })
      .populate({
        path: "orderItems.product",
        select: "name imageUrl price _id",
      });
    res.json(orders);
  } catch (error) {
    next(error);
  }
});

// Get an order by ID
orderRouter.get("/:orderId", JWTAuthMiddleware, async (req, res, next) => {
  try {
    const order = await OrderModel.findById(req.params.orderId)
      .populate({
        path: "user",
        select: "firstName lastName email address",
      })
      .populate({
        path: "orderItems.product",
        select: "name imageUrl price _id",
      });
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.json(order);
  } catch (error) {
    next(error);
  }
});
// Update an order
orderRouter.put("/:orderId", async (req, res, next) => {
  try {
    const updatedOrder = await OrderModel.findByIdAndUpdate(
      req.params.orderId, // WHO
      req.body, // HOW
      { new: true, runValidators: true }
    ).populate({
      path: "user",
      select: "firstName lastName email address",
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

orderRouter.get(
  "/myOrder/:userId",
  JWTAuthMiddleware,
  async (req, res, next) => {
    try {
      const userId = req.params.userId; // Get the user's ID from the JWT token
      const orders = await OrderModel.find({ user: userId })
        .sort({
          _id: -1,
        })
        .populate({
          path: "user",
          select: "firstName lastName email address _id",
        })
        .populate({
          path: "orderItems.product",
          select: "name imageUrl price _id",
        });

      res.send(orders);
    } catch (error) {
      next(error);
    }
  }
);

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

orderRouter.put("/:orderId/pay", async (req, res, next) => {
  try {
    const order = await OrderModel.findById(req.params.orderId);
    if (order) {
      order.isPaid = true;
      order.paidAt = Date.now();
      order.paymentResult = {
        status: req.body.status,
        update_time: req.body.update_time,
        email_address: req.body.email_address,
      };
      const updatedOrder = await order.save();
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
export default orderRouter;
